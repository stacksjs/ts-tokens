/**
 * Compressed Token Transfers
 *
 * Transfer compressed tokens with proof verification.
 */

import type { TokenConfig } from '../types'
import type { TransferCompressedTokenOptions } from './types'

/**
 * Transfer compressed tokens.
 *
 * Not implemented. A real compressed-token transfer needs an 8-byte Anchor
 * discriminator, the full Light Protocol account set (CPI authority PDA, token
 * pool, registered-program PDA, noop, account-compression, input/output Merkle
 * trees and nullifier queue), and a validity proof produced by a Photon
 * indexer. The previous implementation invented a 1-byte `[2]` discriminator,
 * three metas, and a hand-serialized hex "proof" — a transaction that always
 * fails on-chain. Fail loudly rather than return a signature for a transfer
 * that never happened.
 */
export async function transferCompressedTokens(
  _options: TransferCompressedTokenOptions,
  _config: TokenConfig
): Promise<{ signature: string }> {
  throw new Error(
    'transferCompressedTokens is not implemented: the Light Protocol ' +
    'compressed-token transfer requires an 8-byte Anchor discriminator, its ' +
    'full account set (CPI authority PDA, token pool, registered-program PDA, ' +
    'noop, account-compression, Merkle trees/queue) and a real validity proof, ' +
    'none of which are built here. Use the @lightprotocol/compressed-token SDK ' +
    'to transfer.'
  )
}
