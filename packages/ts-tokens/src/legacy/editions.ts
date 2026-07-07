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
// eslint-disable-next-line no-unused-vars
export async function printLegacyEdition(
  masterMint: string,
  editionNumber: number,
  config: TokenConfig,
  options?: TransactionOptions
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
// eslint-disable-next-line no-unused-vars
export async function getEditionsByMaster(
  masterMint: string,
  config: TokenConfig,
  limit?: number
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
 * NOT SUPPORTED: The Token Metadata program has no instruction to change a
 * master edition's max supply after it has been created. Max supply is fixed
 * at CreateMasterEditionV3 time; there is no on-chain path to modify it.
 */
// eslint-disable-next-line no-unused-vars
export async function updateMasterEditionMaxSupply(
  mint: string,
  newMaxSupply: number | null,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  throw new Error(
    'updateMasterEditionMaxSupply is not implemented: max supply cannot be changed after the master edition is created. The Token Metadata program provides no instruction to modify max supply, and re-sending CreateMasterEditionV3 against an already-initialized edition PDA is rejected on-chain.'
  )
}
