/**
 * Compressed Token Minting
 *
 * Mint compressed tokens to recipients.
 */

import type { TokenConfig } from '../types'
import type { MintCompressedTokenOptions } from './types'

/**
 * Mint compressed tokens to a destination address.
 *
 * Not implemented. Minting compressed tokens through the Light Protocol program
 * needs an 8-byte Anchor discriminator plus the CPI authority PDA, token pool,
 * registered-program PDA, noop program, account-compression program, and the
 * output Merkle tree — none of which are built here. The previous 1-byte `[1]`
 * discriminator with three metas produces a transaction that always fails
 * on-chain, so fail loudly rather than return a signature for tokens that were
 * never minted.
 */
export async function mintCompressedTokens(
  _options: MintCompressedTokenOptions,
  _config: TokenConfig
): Promise<{ signature: string }> {
  throw new Error(
    'mintCompressedTokens is not implemented: the Light Protocol ' +
    'compressed-token mint instruction requires an 8-byte Anchor discriminator ' +
    'and its full account set (CPI authority PDA, token pool, registered-program ' +
    'PDA, noop, account-compression, output Merkle tree) which are not built ' +
    'here. Use the @lightprotocol/compressed-token SDK to mint.'
  )
}
