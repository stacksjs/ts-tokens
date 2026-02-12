/**
 * DAO Management
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, Keypair } from '@solana/web3.js'
import { getDAOAddress, getTreasuryAddress } from 'ts-governance/programs'
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
export async function createDAO(
  connection: Connection,
  payer: Keypair,
  options: CreateDAOOptions
): Promise<{ dao: DAO; signature: string }> {
  const { name, governanceToken, config } = options

  // Parse durations
  const votingPeriod = parseDuration(config.votingPeriod)
  const executionDelay = config.executionDelay
    ? parseDuration(config.executionDelay)
    : 86400n // 1 day default

  // Validate config
  if (config.quorum < 1 || config.quorum > 100) {
    throw new Error('Quorum must be between 1 and 100')
  }
  if (config.approvalThreshold < 1 || config.approvalThreshold > 100) {
    throw new Error('Approval threshold must be between 1 and 100')
  }

  // Derive deterministic PDA addresses from the governance program
  const daoAddress = getDAOAddress(payer.publicKey, name)
  const treasury = getTreasuryAddress(daoAddress)

  const daoConfig: DAOConfig = {
    votingPeriod,
    quorum: config.quorum,
    approvalThreshold: config.approvalThreshold,
    executionDelay,
    minProposalThreshold: config.minProposalThreshold ?? 0n,
    vetoAuthority: config.vetoAuthority,
  }

  const dao: DAO = {
    address: daoAddress,
    name,
    governanceToken,
    treasury,
    config: daoConfig,
    proposalCount: 0n,
    totalVotingPower: 0n,
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
  }

  // In production, would create on-chain accounts
  return {
    dao,
    signature: `dao_created_${daoAddress.toBase58().slice(0, 8)}`,
  }
}

/**
 * Get DAO info
 */
export async function getDAO(
  connection: Connection,
  address: PublicKey
): Promise<DAO | null> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    return null
  }

  // Parse DAO data (simplified)
  // In production, would deserialize from account data
  return null
}

/**
 * Update DAO config
 */
export async function updateDAOConfig(
  connection: Connection,
  dao: PublicKey,
  authority: Keypair,
  newConfig: Partial<DAOConfig>
): Promise<{ signature: string }> {
  // In production, would update on-chain
  return {
    signature: `config_updated_${dao.toBase58().slice(0, 8)}`,
  }
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
