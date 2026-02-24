/**
 * Simple NFT Transfer
 *
 * Simplified transfer that delegates to nft/transfer.ts.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { TransferResult } from './types'
import type { TokenConfig } from '../types'

/**
 * Transfer a simple NFT to another wallet
 *
 * Wraps `transferNFT()` from `nft/transfer.ts` with a cleaner return type.
 *
 * @param connection - Solana connection
 * @param mint - NFT mint address
 * @param from - Current owner (payer)
 * @param to - Recipient address
 * @param config - ts-tokens configuration
 * @returns Transfer result with signature, from, to, mint
 */
export async function transferSimpleNFT(
  _connection: Connection,
  mint: PublicKey,
  from: PublicKey,
  to: PublicKey,
  config: TokenConfig
): Promise<TransferResult> {
  const { transferNFT } = await import('../nft/transfer')

  const result = await transferNFT(mint.toBase58(), to.toBase58(), config)

  return {
    signature: result.signature,
    from,
    to,
    mint,
  }
}
