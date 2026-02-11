/**
 * Legacy Royalty Management
 *
 * Read and update royalty information for legacy NFTs.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { RoyaltyInfo } from '../types/legacy'

/**
 * Get royalty information for an NFT or collection
 */
export async function getRoyaltyInfo(
  mint: string,
  config: TokenConfig
): Promise<RoyaltyInfo> {
  const { getNFTMetadata } = await import('../nft/metadata')

  const metadata = await getNFTMetadata(mint, config)
  if (!metadata) {
    throw new Error(`Metadata not found: ${mint}`)
  }

  return {
    basisPoints: metadata.sellerFeeBasisPoints,
    percentage: metadata.sellerFeeBasisPoints / 100,
    creators: metadata.creators || [],
    primarySaleHappened: metadata.primarySaleHappened,
  }
}

/**
 * Update royalty basis points for an NFT
 */
export async function updateRoyalty(
  mint: string,
  sellerFeeBasisPoints: number,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  if (sellerFeeBasisPoints < 0 || sellerFeeBasisPoints > 10000) {
    throw new Error('Seller fee basis points must be between 0 and 10000')
  }

  const { updateNFTMetadata } = await import('../nft/metadata')
  return updateNFTMetadata(mint, { sellerFeeBasisPoints }, config, options)
}

/**
 * Update creators list for an NFT
 */
export async function updateCreators(
  mint: string,
  creators: Array<{ address: string; share: number }>,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  // Validate shares sum to 100
  const totalShares = creators.reduce((sum, c) => sum + c.share, 0)
  if (totalShares !== 100) {
    throw new Error(`Creator shares must sum to 100, got ${totalShares}`)
  }

  const { updateNFTMetadata } = await import('../nft/metadata')
  return updateNFTMetadata(mint, { creators }, config, options)
}
