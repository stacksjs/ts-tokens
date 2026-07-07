/**
 * DAO Management
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import type { DAOConfig, CreateDAOOptions } from '../types'
import { parseDuration } from './create'

/**
 * Update DAO configuration
 */
export async function updateDAOConfig(
  _connection: Connection,
  _dao: PublicKey,
  _authority: Keypair,
  newConfig: Partial<DAOConfig>
): Promise<{ signature: string }> {
  // Validate inputs before the not-implemented throw so bad config surfaces.
  if (newConfig.quorum !== undefined && (newConfig.quorum < 1 || newConfig.quorum > 100)) {
    throw new Error('Quorum must be between 1 and 100')
  }
  if (newConfig.approvalThreshold !== undefined && (newConfig.approvalThreshold < 1 || newConfig.approvalThreshold > 100)) {
    throw new Error('Approval threshold must be between 1 and 100')
  }

  throw new Error(
    'updateDAOConfig is not implemented: the governance program that stores ' +
    'DAO accounts is not deployed. No configuration was updated on-chain.'
  )
}

/**
 * Set new DAO authority
 */
export async function setDAOAuthority(
  _connection: Connection,
  _dao: PublicKey,
  _currentAuthority: Keypair,
  _newAuthority: PublicKey
): Promise<{ signature: string }> {
  throw new Error(
    'setDAOAuthority is not implemented: the governance program that stores ' +
    'DAO accounts is not deployed. The authority was not changed on-chain.'
  )
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

  // quorum and approvalThreshold are percentages of different denominators
  // (turnout vs. total supply), so they are validated independently — there is
  // no requirement that approvalThreshold >= quorum.

  try {
    parseDuration(config.votingPeriod)
  } catch {
    errors.push('Invalid voting period format')
  }

  return errors
}
