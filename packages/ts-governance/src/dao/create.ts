/**
 * DAO Creation
 */

import type { Connection, Keypair } from '@solana/web3.js'
import type { DAO, CreateDAOOptions } from '../types'
import { getDAOAddress, getTreasuryAddress } from '../programs/program'

/**
 * Parse duration string to seconds
 */
export function parseDuration(duration: string | bigint): bigint {
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
 * Create a new DAO using PDA-derived addresses.
 *
 * Validates the requested configuration and derives the on-chain addresses,
 * but does not fabricate a transaction: the governance program that would
 * persist the DAO account is not deployed, so this throws rather than returning
 * a fake signature for a DAO that was never created on-chain. Input validation
 * runs first so callers still get a meaningful error for bad config.
 */
export async function createDAO(
  _connection: Connection,
  payer: Keypair,
  options: CreateDAOOptions
): Promise<{ dao: DAO; signature: string }> {
  const { name, config } = options

  // Validate before the not-implemented throw so config/name errors surface.
  if (Buffer.byteLength(name) > 32) {
    throw new Error('DAO name must be 32 bytes or fewer (it is used as a PDA seed)')
  }
  if (config.quorum < 1 || config.quorum > 100) {
    throw new Error('Quorum must be between 1 and 100')
  }
  if (config.approvalThreshold < 1 || config.approvalThreshold > 100) {
    throw new Error('Approval threshold must be between 1 and 100')
  }

  // Parse durations to surface format errors (also validates the inputs).
  parseDuration(config.votingPeriod)
  if (config.executionDelay) parseDuration(config.executionDelay)

  // Derive the addresses that a real deployment would use.
  const daoAddress = getDAOAddress(payer.publicKey, name)
  getTreasuryAddress(daoAddress)

  throw new Error(
    'createDAO is not implemented: the governance program that stores DAO ' +
    'accounts is not deployed. No DAO was created on-chain.'
  )
}
