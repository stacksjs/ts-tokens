/**
 * Address Lookup Table (ALT) Operations
 *
 * Create, extend, and use Address Lookup Tables for efficient batch transactions.
 * ALTs compress account addresses from 32 bytes to 1 byte in versioned transactions.
 */

import {
  AddressLookupTableProgram,
  PublicKey,
} from '@solana/web3.js'
import type { TransactionInstruction } from '@solana/web3.js'
import type { TokenConfig, TransactionResult } from '../types'
import { buildTransaction, sendAndConfirmTransaction, createVersionedTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'

/** Max addresses per extend instruction */
const MAX_ADDRESSES_PER_EXTEND = 30

/**
 * Create a new Address Lookup Table
 */
export async function createLookupTable(
  config: TokenConfig,
): Promise<{ address: string; signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const recentSlot = await connection.getSlot()

  const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
    authority: payer.publicKey,
    payer: payer.publicKey,
    recentSlot,
  })

  const transaction = await buildTransaction(
    connection,
    [createIx],
    payer.publicKey,
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    address: lookupTableAddress.toBase58(),
    signature: result.signature,
  }
}

/**
 * Extend an Address Lookup Table with new addresses
 *
 * Addresses are chunked into groups of 30 (max per instruction).
 */
export async function extendLookupTable(
  tableAddress: string,
  addresses: string[],
  config: TokenConfig,
): Promise<string[]> {
  if (addresses.length === 0) {
    throw new Error('No addresses provided to extend lookup table')
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const lookupTable = new PublicKey(tableAddress)
  const signatures: string[] = []

  // Chunk addresses into groups of MAX_ADDRESSES_PER_EXTEND
  const chunks = chunkAddresses(addresses, MAX_ADDRESSES_PER_EXTEND)

  for (const chunk of chunks) {
    const extendIx = AddressLookupTableProgram.extendLookupTable({
      lookupTable,
      authority: payer.publicKey,
      payer: payer.publicKey,
      addresses: chunk.map(addr => new PublicKey(addr)),
    })

    const transaction = await buildTransaction(
      connection,
      [extendIx],
      payer.publicKey,
    )

    transaction.partialSign(payer)
    const result = await sendAndConfirmTransaction(connection, transaction)
    signatures.push(result.signature)
  }

  return signatures
}

/**
 * Deactivate and close a lookup table (two-step process)
 */
export async function closeLookupTable(
  tableAddress: string,
  config: TokenConfig,
): Promise<{ deactivateSignature: string; closeSignature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const lookupTable = new PublicKey(tableAddress)

  // Step 1: Deactivate
  const deactivateIx = AddressLookupTableProgram.deactivateLookupTable({
    lookupTable,
    authority: payer.publicKey,
  })

  const deactivateTx = await buildTransaction(
    connection,
    [deactivateIx],
    payer.publicKey,
  )

  deactivateTx.partialSign(payer)
  const deactivateResult = await sendAndConfirmTransaction(connection, deactivateTx)

  // Step 2: Close (returns rent to authority)
  const closeIx = AddressLookupTableProgram.closeLookupTable({
    lookupTable,
    authority: payer.publicKey,
    recipient: payer.publicKey,
  })

  const closeTx = await buildTransaction(
    connection,
    [closeIx],
    payer.publicKey,
  )

  closeTx.partialSign(payer)
  const closeResult = await sendAndConfirmTransaction(connection, closeTx)

  return {
    deactivateSignature: deactivateResult.signature,
    closeSignature: closeResult.signature,
  }
}

/**
 * Get lookup table info
 */
export async function getLookupTableInfo(
  _tableAddress: string,
  _config: TokenConfig,
): Promise<{
  address: string
  authority: string | null
  addresses: string[]
  isActive: boolean
} | null> {
  const connection = createConnection(config)
  const lookupTablePubkey = new PublicKey(tableAddress)

  const result = await connection.getAddressLookupTable(lookupTablePubkey)
  if (!result.value) {
    return null
  }

  const table = result.value

  return {
    address: tableAddress,
    authority: table.state.authority?.toBase58() ?? null,
    addresses: table.state.addresses.map(addr => addr.toBase58()),
    isActive: table.isActive(),
  }
}

/**
 * Execute batch transfers using an Address Lookup Table for address compression.
 *
 * For large batches (30+ recipients), ALTs significantly reduce transaction size
 * by compressing account addresses from 32 bytes to 1 byte each.
 */
export async function batchTransferWithALT(
  _options: {
    mint: string
    recipients: Array<{ address: string; amount: bigint }>
    existingTable?: string
    batchSize?: number
    onProgress?: (completed: number, total: number) => void
  },
  config: TokenConfig,
): Promise<{
  successful: number
  failed: number
  signatures: string[]
  lookupTable: string
  errors: Array<{ address: string; error: string }>
}> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const { mint, recipients, existingTable, batchSize = 10, onProgress } = options

  const result = {
    successful: 0,
    failed: 0,
    signatures: [] as string[],
    lookupTable: '',
    errors: [] as Array<{ address: string; error: string }>,
  }

  // Collect all unique addresses
  const allAddresses = new Set<string>()
  allAddresses.add(mint)
  allAddresses.add(payer.publicKey.toBase58())
  for (const recipient of recipients) {
    allAddresses.add(recipient.address)
  }

  // Create or use existing lookup table
  let tableAddress: string
  if (existingTable) {
    tableAddress = existingTable
  } else {
    const createResult = await createLookupTable(config)
    tableAddress = createResult.address
  }
  result.lookupTable = tableAddress

  // Extend table with all addresses
  const addressArray = Array.from(allAddresses)
  if (addressArray.length > 0) {
    await extendLookupTable(tableAddress, addressArray, config)

    // Wait for table activation (need at least 1 slot)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Build and send versioned transactions in batches
  const { createTransferInstruction, getAssociatedTokenAddress } = await import('@solana/spl-token')
  const mintPubkey = new PublicKey(mint)
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    const instructions: TransactionInstruction[] = []

    for (const recipient of batch) {
      try {
        const recipientPubkey = new PublicKey(recipient.address)
        const destAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey)

        instructions.push(
          createTransferInstruction(
            sourceAta,
            destAta,
            payer.publicKey,
            recipient.amount,
          ),
        )
      } catch (error) {
        result.failed++
        result.errors.push({
          address: recipient.address,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (instructions.length > 0) {
      try {
        const lookupTablePubkey = new PublicKey(tableAddress)
        const versionedTx = await createVersionedTransaction(
          connection,
          instructions,
          payer.publicKey,
          [lookupTablePubkey],
        )

        versionedTx.sign([payer])
        const txResult = await sendAndConfirmTransaction(connection, versionedTx)

        if (txResult.confirmed) {
          result.successful += batch.length - result.errors.filter(
            e => batch.some(r => r.address === e.address),
          ).length
          result.signatures.push(txResult.signature)
        } else {
          for (const recipient of batch) {
            result.failed++
            result.errors.push({
              address: recipient.address,
              error: txResult.error || 'Transaction failed',
            })
          }
        }
      } catch (error) {
        for (const recipient of batch) {
          result.failed++
          result.errors.push({
            address: recipient.address,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, recipients.length), recipients.length)
    }
  }

  return result
}

/**
 * Chunk an array into groups of a specified size
 */
export function chunkAddresses<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
