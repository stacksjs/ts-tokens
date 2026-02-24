/**
 * Legacy Edition Management Facade
 *
 * Wraps existing edition functions with legacy-friendly interfaces.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { LegacyMasterEditionInfo, LegacyEditionInfo } from '../types/legacy'

/**
 * Get edition information for a mint
 */
export async function getLegacyEditionInfo(
  mint: string,
  config: TokenConfig
): Promise<LegacyMasterEditionInfo | LegacyEditionInfo | null> {
  const { getEditionInfo } = await import('../nft/editions')

  const info = await getEditionInfo(mint, config)
  if (!info) return null

  if (info.edition === 0) {
    return {
      mint: info.mint,
      type: 'master',
      supply: info.supply,
      maxSupply: info.maxSupply,
    }
  }

  return {
    mint: info.mint,
    type: 'print',
    parent: info.parent,
    edition: info.edition,
  }
}

/**
 * Print a new edition from a master edition
 */
export async function printLegacyEdition(
  _masterMint: string,
  editionNumber: number,
  _config: TokenConfig,
  _options?: TransactionOptions
): Promise<{
  mint: string
  metadata: string
  edition: string
  editionNumber: number
  signature: string
}> {
  const { printEdition } = await import('../nft/editions')
  return printEdition(masterMint, editionNumber, config, options)
}

/**
 * Get all editions printed from a master edition
 */
export async function getEditionsByMaster(
  _masterMint: string,
  _config: TokenConfig,
  _limit?: number
): Promise<Array<{
  mint: string
  parent: string
  edition: number
  maxSupply: number | null
  supply: number
}>> {
  const { getEditionsByMaster: getEditions } = await import('../nft/editions')
  return getEditions(masterMint, config, limit)
}

/**
 * Update master edition max supply
 *
 * Note: Max supply can only be reduced, never increased, and cannot be set
 * lower than the current supply.
 */
export async function updateMasterEditionMaxSupply(
  mint: string,
  newMaxSupply: number | null,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey, SystemProgram } = await import('@solana/web3.js')
  const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { findMetadataPda, findMasterEditionPda } = await import('../programs/token-metadata/pda')

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(mint)

  const [metadata] = findMetadataPda(mintPubkey)
  const [masterEdition] = findMasterEditionPda(mintPubkey)

  // CreateMasterEditionV3 with updated max supply
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

  const parts: Buffer[] = [Buffer.from([17])] // CreateMasterEditionV3 discriminator

  if (newMaxSupply !== null) {
    parts.push(Buffer.from([1])) // Some
    const maxSupplyBuffer = Buffer.alloc(8)
    maxSupplyBuffer.writeBigUInt64LE(BigInt(newMaxSupply))
    parts.push(maxSupplyBuffer)
  } else {
    parts.push(Buffer.from([0])) // None
  }

  const data = Buffer.concat(parts)

  const instruction = {
    keys: [
      { pubkey: masterEdition, isSigner: false, isWritable: true },
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}
