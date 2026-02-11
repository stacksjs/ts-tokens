/**
 * Simple NFT Burn
 *
 * Simplified burn that delegates to nft/burn.ts.
 * Uses burnNFTFull for full cleanup (metadata + edition accounts).
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { BurnResult } from './types'
import type { TokenConfig } from '../types'

/**
 * Burn a simple NFT
 *
 * Burns the token and closes all associated accounts (token account,
 * metadata, master edition), reclaiming rent SOL.
 *
 * @param connection - Solana connection
 * @param mint - NFT mint address
 * @param owner - NFT owner (payer)
 * @param config - ts-tokens configuration
 * @returns Burn result with signature, mint, owner
 */
export async function burnSimpleNFT(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  config: TokenConfig
): Promise<BurnResult> {
  const { burnNFTFull } = await import('../nft/burn')

  const result = await burnNFTFull(mint.toBase58(), config)

  return {
    signature: result.signature,
    mint,
    owner,
  }
}
