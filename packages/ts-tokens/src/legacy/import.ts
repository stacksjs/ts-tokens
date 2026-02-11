/**
 * Legacy Import Utilities
 *
 * Import collection data from on-chain sources and Sugar config files.
 */

import type { TokenConfig } from '../types'
import type {
  LegacyCollectionInfo,
  ImportResult,
  SugarConfig,
  LegacyNFTItem,
} from '../types/legacy'
import { CollectionVersion } from '../types/legacy'

/**
 * Full import of a collection from on-chain data
 *
 * Fetches all metadata, detects version, and returns complete collection info.
 */
export async function importCollectionFromOnChain(
  collectionMint: string,
  config: TokenConfig
): Promise<ImportResult> {
  const { importCollection } = await import('./collection')
  return importCollection(collectionMint, config)
}

/**
 * Import collection configuration from a Sugar config file
 *
 * Parses the Sugar (Metaplex CLI) JSON config format and returns
 * a normalized LegacyCollectionInfo object.
 */
export function importFromSugarConfig(
  configJson: string
): {
  config: SugarConfig
  collectionInfo: Partial<LegacyCollectionInfo>
} {
  const parsed: SugarConfig = JSON.parse(configJson)

  // Validate required fields
  if (!parsed.number || !parsed.sellerFeeBasisPoints) {
    throw new Error('Invalid Sugar config: missing required fields (number, sellerFeeBasisPoints)')
  }

  const collectionInfo: Partial<LegacyCollectionInfo> = {
    mint: parsed.collection || '',
    name: '',
    symbol: parsed.symbol || '',
    uri: '',
    version: CollectionVersion.Legacy,
    sellerFeeBasisPoints: parsed.sellerFeeBasisPoints,
    isMutable: !parsed.noMutable,
    creators: (parsed.creators || []).map(c => ({
      address: c.address,
      verified: false,
      share: c.share,
    })),
  }

  return { config: parsed, collectionInfo }
}

/**
 * Validate a Sugar config object
 */
export function validateSugarConfig(config: SugarConfig): string[] {
  const errors: string[] = []

  if (!config.number || config.number <= 0) {
    errors.push('number must be a positive integer')
  }

  if (config.sellerFeeBasisPoints < 0 || config.sellerFeeBasisPoints > 10000) {
    errors.push('sellerFeeBasisPoints must be between 0 and 10000')
  }

  if (!config.solTreasuryAccount) {
    errors.push('solTreasuryAccount is required')
  }

  if (config.creators) {
    const totalShares = config.creators.reduce((sum, c) => sum + c.share, 0)
    if (totalShares !== 100) {
      errors.push(`Creator shares must sum to 100, got ${totalShares}`)
    }
  }

  return errors
}
