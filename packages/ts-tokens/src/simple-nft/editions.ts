/**
 * Simple NFT Editions
 *
 * Simplified master edition and print operations.
 * Delegates to nft/editions.ts.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { EditionResult, MasterEditionResult } from './types'
import type { TokenConfig } from '../types'

/**
 * Create a master edition for an existing NFT
 *
 * Wraps `createMasterEdition()` from `nft/editions.ts`.
 *
 * @param connection - Solana connection
 * @param mint - NFT mint address
 * @param authority - Update authority
 * @param config - ts-tokens configuration
 * @param maxSupply - Maximum number of prints (null = unlimited)
 * @returns Master edition result with signature, mint, masterEdition address
 */
export async function createMasterEditionSimple(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  config: TokenConfig,
  maxSupply?: number
): Promise<MasterEditionResult> {
  const { createMasterEdition } = await import('../nft/editions')
  const { findMasterEditionPda } = await import('../programs/token-metadata/pda')

  const result = await createMasterEdition(
    mint.toBase58(),
    maxSupply ?? null,
    config
  )

  const [masterEditionAddress] = findMasterEditionPda(mint)

  return {
    signature: result.signature,
    mint: mint.toBase58(),
    masterEdition: masterEditionAddress.toBase58(),
  }
}

/**
 * Print an edition from a master edition
 *
 * Wraps `printEdition()` from `nft/editions.ts`.
 *
 * @param connection - Solana connection
 * @param masterMint - Master edition mint address
 * @param authority - Master edition authority
 * @param editionNumber - Edition number to print
 * @param config - ts-tokens configuration
 * @returns Edition result with mint, metadata, edition address, number, signature
 */
export async function printEditionSimple(
  connection: Connection,
  masterMint: PublicKey,
  authority: PublicKey,
  editionNumber: number,
  config: TokenConfig
): Promise<EditionResult> {
  const { printEdition } = await import('../nft/editions')

  const result = await printEdition(
    masterMint.toBase58(),
    editionNumber,
    config
  )

  return {
    mint: result.mint,
    metadata: result.metadata,
    edition: result.edition,
    editionNumber: result.editionNumber,
    signature: result.signature,
  }
}
