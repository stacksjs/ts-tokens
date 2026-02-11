/**
 * Candy Machine Config Management
 *
 * High-level wrappers for updating and managing Candy Machine configuration.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'
import {
  updateCandyMachine as updateCandyMachineInstruction,
  setCandyMachineAuthority as setCandyMachineAuthorityInstruction,
  withdraw,
} from '../../programs/candy-machine/instructions'
import { deserializeCandyMachine } from '../../programs/candy-machine/accounts'
import type { CandyMachineData } from '../../programs/candy-machine/types'

/**
 * Update options for candy machine
 */
export interface UpdateCandyMachineConfig {
  itemsAvailable?: number
  symbol?: string
  sellerFeeBasisPoints?: number
  maxSupply?: number
  isMutable?: boolean
  creators?: Array<{ address: string; share: number }>
  configLineSettings?: {
    prefixName: string
    nameLength: number
    prefixUri: string
    uriLength: number
    isSequential: boolean
  } | null
  hiddenSettings?: {
    name: string
    uri: string
    hash: Uint8Array
  } | null
}

/**
 * Update a Candy Machine's configuration
 *
 * Fetches current CM data, merges updates, and sends update instruction.
 */
export async function updateCandyMachine(
  options: { candyMachine: string; updates: UpdateCandyMachineConfig },
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const candyMachinePubkey = new PublicKey(options.candyMachine)

  // Fetch current candy machine data
  const accountInfo = await connection.getAccountInfo(candyMachinePubkey)
  if (!accountInfo) {
    throw new Error('Candy Machine account not found')
  }

  const currentCM = deserializeCandyMachine(accountInfo.data as Buffer)
  const updates = options.updates

  // Merge updates with current data
  const mergedData: CandyMachineData = {
    itemsAvailable: updates.itemsAvailable !== undefined
      ? BigInt(updates.itemsAvailable)
      : currentCM.data.itemsAvailable,
    symbol: updates.symbol ?? currentCM.data.symbol,
    sellerFeeBasisPoints: updates.sellerFeeBasisPoints ?? currentCM.data.sellerFeeBasisPoints,
    maxSupply: updates.maxSupply !== undefined
      ? BigInt(updates.maxSupply)
      : currentCM.data.maxSupply,
    isMutable: updates.isMutable ?? currentCM.data.isMutable,
    creators: updates.creators
      ? updates.creators.map(c => ({
          address: new PublicKey(c.address),
          verified: false,
          percentageShare: c.share,
        }))
      : currentCM.data.creators,
    configLineSettings: updates.configLineSettings !== undefined
      ? updates.configLineSettings
      : currentCM.data.configLineSettings,
    hiddenSettings: updates.hiddenSettings !== undefined
      ? updates.hiddenSettings
      : currentCM.data.hiddenSettings,
  }

  const instruction = updateCandyMachineInstruction({
    candyMachine: candyMachinePubkey,
    authority: payer.publicKey,
    data: mergedData,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}

/**
 * Set a new authority for a Candy Machine
 */
export async function setCandyMachineAuthority(
  candyMachine: string,
  newAuthority: string,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = setCandyMachineAuthorityInstruction(
    new PublicKey(candyMachine),
    payer.publicKey,
    new PublicKey(newAuthority)
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}

/**
 * Delete a Candy Machine and reclaim rent
 */
export async function deleteCandyMachine(
  candyMachine: string,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = withdraw({
    candyMachine: new PublicKey(candyMachine),
    authority: payer.publicKey,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, txOptions)
}
