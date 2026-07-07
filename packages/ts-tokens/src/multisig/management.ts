/**
 * Multi-Sig Management
 *
 * High-level multisig CRUD operations: create, addOwner, removeOwner, changeThreshold.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  MultisigResult,
  AddOwnerOptions,
  RemoveOwnerOptions,
  ChangeThresholdOptions,
  OnChainMultisig,
} from './types'
import { loadWallet } from '../drivers/solana/wallet'
import { getMultisigAddress, MULTISIG_PROGRAM_ID } from './program'
import { validateMultisigConfig } from './create'

/**
 * The custom on-chain multisig program is a placeholder that has not been
 * deployed. Any attempt to submit a transaction against MULTISIG_PROGRAM_ID
 * would fail on-chain, so these entry points throw instead of sending a doomed
 * transaction (which could still burn fees or return a misleading result).
 */
function programNotDeployedError(): Error {
  return new Error(
    `On-chain multisig program is not deployed (placeholder id ` +
    `${MULTISIG_PROGRAM_ID.toBase58()}). This operation is unavailable until ` +
    `the program is deployed; use SPL token multisig via createMultisig instead.`
  )
}

/**
 * Create a new on-chain multisig account
 */
export async function createOnChainMultisig(
  owners: PublicKey[],
  threshold: number,
  config: TokenConfig,
  _txOptions?: TransactionOptions,
  nonce: bigint = 0n
): Promise<MultisigResult> {
  const errors = validateMultisigConfig({ signers: owners, threshold })
  if (errors.length > 0) {
    throw new Error(`Invalid multisig config: ${errors.join(', ')}`)
  }

  // Previously this always derived the PDA with a hardcoded nonce of 0, so a
  // creator's second multisig collided with their first. The nonce is now a
  // parameter; the derivation stays deterministic for a given (creator, nonce).
  const payer = loadWallet(config)
  getMultisigAddress(payer.publicKey, nonce)

  // The custom multisig program is undeployed — refuse rather than sending.
  throw programNotDeployedError()
}

/**
 * Add an owner to an existing multisig
 */
export async function addOwner(
  _options: AddOwnerOptions,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<MultisigResult> {
  throw programNotDeployedError()
}

/**
 * Remove an owner from a multisig
 */
export async function removeOwner(
  _options: RemoveOwnerOptions,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<MultisigResult> {
  throw programNotDeployedError()
}

/**
 * Change the signature threshold of a multisig
 */
export async function changeThreshold(
  _options: ChangeThresholdOptions,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<MultisigResult> {
  throw programNotDeployedError()
}

/**
 * Fetch and parse an on-chain multisig account
 */
export async function getOnChainMultisig(
  connection: import('@solana/web3.js').Connection,
  address: PublicKey
): Promise<OnChainMultisig | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  if (!accountInfo.owner.equals(MULTISIG_PROGRAM_ID)) {
    return null
  }

  const data = accountInfo.data

  // Account layout:
  // 32 bytes: creator
  // 1 byte:   threshold
  // 8 bytes:  nonce (u64 LE)
  // 8 bytes:  transactionCount (u64 LE)
  // 8 bytes:  createdAt (i64 LE)
  // 1 byte:   ownerCount
  // 32 * ownerCount: owner pubkeys

  let offset = 0
  const creator = new PublicKey(data.subarray(offset, offset + 32)); offset += 32
  const threshold = data.readUInt8(offset); offset += 1
  const nonce = data.readBigUInt64LE(offset); offset += 8
  const transactionCount = data.readBigUInt64LE(offset); offset += 8
  const createdAt = data.readBigInt64LE(offset); offset += 8
  const ownerCount = data.readUInt8(offset); offset += 1

  const owners: PublicKey[] = []
  for (let i = 0; i < ownerCount; i++) {
    owners.push(new PublicKey(data.subarray(offset, offset + 32)))
    offset += 32
  }

  return {
    address,
    creator,
    owners,
    threshold,
    nonce,
    transactionCount,
    createdAt: BigInt(createdAt),
  }
}
