/**
 * Programmable NFT Transfers
 *
 * The pNFT program is not deployed (see program.ts). Rule enforcement,
 * transfers, delegation, history, and royalty estimation all depend on reading
 * pNFT state that does not exist, so every function here throws via
 * `pnftNotImplemented`.
 *
 * In particular `canTransfer` must NOT default to `{ allowed: true }`: doing so
 * silently disables every transfer rule (soulbound, allow/deny lists, cooldowns,
 * royalty enforcement), which is a security hazard. It throws instead.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  TransferValidation,
  PNFTTransferOptions,
  PNFTResult,
  PNFTTransferResult,
} from './types'
import { pnftNotImplemented } from './program'

/**
 * Validate if transfer is allowed.
 *
 * Throws: without the deployed program there is no way to read the pNFT's rules,
 * and returning `allowed: true` would let callers bypass every transfer rule.
 */
export async function canTransfer(
  _connection: Connection,
  _mint: PublicKey,
  _from: PublicKey,
  _to: PublicKey
): Promise<TransferValidation> {
  pnftNotImplemented('canTransfer')
}

/**
 * Transfer programmable NFT
 */
export async function transferPNFT(
  _options: PNFTTransferOptions,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTTransferResult> {
  pnftNotImplemented('transferPNFT')
}

/**
 * Delegate transfer authority
 */
export async function delegateTransfer(
  _mint: PublicKey,
  _delegate: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('delegateTransfer')
}

/**
 * Revoke transfer delegation
 */
export async function revokeDelegate(
  _mint: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('revokeDelegate')
}

/**
 * Get transfer history for pNFT
 */
export async function getTransferHistory(
  _connection: Connection,
  _mint: PublicKey,
  _limit: number = 20
): Promise<Array<{
  from: PublicKey
  to: PublicKey
  timestamp: number
  signature: string
  royaltyPaid?: bigint
}>> {
  pnftNotImplemented('getTransferHistory')
}

/**
 * Estimate royalty for transfer
 */
export async function estimateRoyalty(
  _connection: Connection,
  _mint: PublicKey,
  _salePrice: bigint
): Promise<{ amount: bigint; recipients: Array<{ address: PublicKey; amount: bigint }> }> {
  pnftNotImplemented('estimateRoyalty')
}
