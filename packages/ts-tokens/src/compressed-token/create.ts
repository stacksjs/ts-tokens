/**
 * Compressed Token Creation
 *
 * Create compressed token mints via Light Protocol.
 */

import type { TokenConfig } from '../types'
import type { CreateCompressedTokenOptions } from './types'

/**
 * Create a compressed token mint.
 *
 * Not implemented. The Light Protocol compressed-token program is an Anchor
 * program: its instructions use 8-byte discriminators (not the 1-byte `[0]`
 * used previously) and require a full account set — the CPI authority PDA, the
 * token pool PDA, the registered-program PDA, the noop program, the
 * account-compression program, and the target Merkle tree/queue — none of which
 * were provided. A transaction built without them cannot succeed on-chain, so
 * rather than send a doomed transaction and return a signature for a mint that
 * was never created, fail loudly.
 */
export async function createCompressedTokenMint(
  _options: CreateCompressedTokenOptions,
  _config: TokenConfig
): Promise<{ mint: string; signature: string }> {
  throw new Error(
    'createCompressedTokenMint is not implemented: the Light Protocol ' +
    'compressed-token program requires 8-byte Anchor discriminators and its ' +
    'full account set (CPI authority PDA, token pool, registered-program PDA, ' +
    'noop, account-compression, Merkle tree/queue) which are not built here. ' +
    'Use the @lightprotocol/compressed-token SDK to create a compressed mint.'
  )
}
