/**
 * DAO Management
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, Keypair } from '@solana/web3.js'
import type { DAO, DAOConfig, CreateDAOOptions } from './types'

/**
 * Parse duration string to seconds
 */
function parseDuration(duration: string | bigint): bigint {
  if (typeof duration === 'bigint') return duration

  const match = duration.match(/^(\d+)\s*(second|minute|hour|day|week)s?$/i)
  if (!match) throw new Error(`Invalid duration: ${duration}`)

  const value = BigInt(match[1])
  const unit = match[2].toLowerCase()

  const multipliers: Record<string, bigint> = {
    second: 1n,
    minute: 60n,
    hour: 3600n,
    day: 86400n,
    week: 604800n,
  }

  return value * multipliers[unit]
}

/**
 * Create a new DAO
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function createDAO(
  _connection: Connection,
  payer: Keypair,
  options: CreateDAOOptions
): Promise<{ dao: DAO; signature: string }> {
  const { name, config } = options

  // Validate inputs up front so callers get a precise error before the
  // not-implemented failure below.
  parseDuration(config.votingPeriod)
  if (config.executionDelay) parseDuration(config.executionDelay)
  if (config.quorum < 1 || config.quorum > 100) {
    throw new Error('Quorum must be between 1 and 100')
  }
  if (config.approvalThreshold < 1 || config.approvalThreshold > 100) {
    throw new Error('Approval threshold must be between 1 and 100')
  }
  if (Buffer.byteLength(name, 'utf8') > 32) {
    throw new Error('DAO name must be at most 32 bytes (it is used as a PDA seed)')
  }

  // The governance program that stores DAO accounts is not deployed, so there is
  // nothing to create the account against. Returning a fabricated signature and
  // a locally-built DAO object would let callers believe a DAO exists on-chain.
  throw new Error(
    'createDAO is not implemented: the governance program is not deployed. ' +
    'No DAO account can be created on-chain.'
  )
}

/**
 * Get DAO info.
 *
 * Returns null when the account does not exist. When it DOES exist we cannot
 * deserialize it without the (undeployed) governance program's account layout,
 * so we throw rather than silently returning null (which previously made a live
 * DAO indistinguishable from a missing one).
 */
export async function getDAO(
  connection: Connection,
  address: PublicKey
): Promise<DAO | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  throw new Error(
    `getDAO cannot deserialize ${address.toBase58()}: the governance program ` +
    `and its account layout are not available (program not deployed).`
  )
}

/**
 * Update DAO config.
 *
 * Not implemented — depends on the undeployed governance program.
 */
export async function updateDAOConfig(
  _connection: Connection,
  _dao: PublicKey,
  _authority: Keypair,
  _newConfig: Partial<DAOConfig>
): Promise<{ signature: string }> {
  throw new Error(
    'updateDAOConfig is not implemented: the governance program is not deployed.'
  )
}

/**
 * Get DAO treasury balance
 */
export async function getTreasuryBalance(
  connection: Connection,
  dao: DAO
): Promise<{ sol: number; tokens: Array<{ mint: string; amount: bigint }> }> {
  const solBalance = await connection.getBalance(dao.treasury)

  // Get token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(dao.treasury, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  })

  const tokens = tokenAccounts.value.map(account => ({
    mint: account.account.data.parsed.info.mint,
    amount: BigInt(account.account.data.parsed.info.tokenAmount.amount),
  }))

  return {
    sol: solBalance / 1e9,
    tokens,
  }
}

/**
 * Get total voting power for a DAO
 */
export async function getTotalVotingPower(
  connection: Connection,
  governanceToken: PublicKey
): Promise<bigint> {
  // Get token supply
  const supply = await connection.getTokenSupply(governanceToken)
  return BigInt(supply.value.amount)
}

/**
 * Validate DAO config
 */
export function validateDAOConfig(config: CreateDAOOptions['config']): string[] {
  const errors: string[] = []

  if (config.quorum < 1 || config.quorum > 100) {
    errors.push('Quorum must be between 1 and 100')
  }

  if (config.approvalThreshold < 1 || config.approvalThreshold > 100) {
    errors.push('Approval threshold must be between 1 and 100')
  }

  // Note: quorum and approvalThreshold are percentages of DIFFERENT
  // denominators — quorum is % of total supply that must participate, threshold
  // is % of the cast for/against votes required to pass — so they are not
  // comparable (e.g. quorum 60% / threshold 51% is perfectly valid).

  try {
    parseDuration(config.votingPeriod)
  } catch {
    errors.push('Invalid voting period format')
  }

  return errors
}
