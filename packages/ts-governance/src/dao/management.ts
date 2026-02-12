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
  connection: Connection,
  dao: PublicKey,
  authority: Keypair,
  newConfig: Partial<DAOConfig>
): Promise<{ signature: string }> {
  if (newConfig.quorum !== undefined && (newConfig.quorum < 1 || newConfig.quorum > 100)) {
    throw new Error('Quorum must be between 1 and 100')
  }
  if (newConfig.approvalThreshold !== undefined && (newConfig.approvalThreshold < 1 || newConfig.approvalThreshold > 100)) {
    throw new Error('Approval threshold must be between 1 and 100')
  }

  return {
    signature: `config_updated_${dao.toBase58().slice(0, 8)}`,
  }
}

/**
 * Set new DAO authority
 */
export async function setDAOAuthority(
  connection: Connection,
  dao: PublicKey,
  currentAuthority: Keypair,
  newAuthority: PublicKey
): Promise<{ signature: string }> {
  return {
    signature: `authority_set_${dao.toBase58().slice(0, 8)}`,
  }
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

  if (config.approvalThreshold < config.quorum) {
    errors.push('Approval threshold should be >= quorum')
  }

  try {
    parseDuration(config.votingPeriod)
  } catch {
    errors.push('Invalid voting period format')
  }

  return errors
}
