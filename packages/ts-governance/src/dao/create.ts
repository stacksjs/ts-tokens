/**
 * DAO Creation
 */

import type { Connection, Keypair } from '@solana/web3.js'
import type { DAO, DAOConfig, CreateDAOOptions } from '../types'
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
 * Create a new DAO using PDA-derived addresses
 */
export async function createDAO(
  _connection: Connection,
  payer: Keypair,
  options: CreateDAOOptions
): Promise<{ dao: DAO; signature: string }> {
  const { name, governanceToken, config } = options

  const votingPeriod = parseDuration(config.votingPeriod)
  const executionDelay = config.executionDelay
    ? parseDuration(config.executionDelay)
    : 86400n

  if (config.quorum < 1 || config.quorum > 100) {
    throw new Error('Quorum must be between 1 and 100')
  }
  if (config.approvalThreshold < 1 || config.approvalThreshold > 100) {
    throw new Error('Approval threshold must be between 1 and 100')
  }

  const daoAddress = getDAOAddress(payer.publicKey, name)
  const treasury = getTreasuryAddress(daoAddress)

  const daoConfig: DAOConfig = {
    votingPeriod,
    quorum: config.quorum,
    approvalThreshold: config.approvalThreshold,
    executionDelay,
    minProposalThreshold: config.minProposalThreshold ?? 0n,
    vetoAuthority: config.vetoAuthority,
    voteWeightType: config.voteWeightType ?? 'token',
    allowEarlyExecution: config.allowEarlyExecution ?? false,
    allowVoteChange: config.allowVoteChange ?? false,
  }

  const dao: DAO = {
    address: daoAddress,
    name,
    authority: payer.publicKey,
    governanceToken,
    treasury,
    config: daoConfig,
    proposalCount: 0n,
    totalVotingPower: 0n,
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
  }

  return {
    dao,
    signature: `dao_created_${daoAddress.toBase58().slice(0, 8)}`,
  }
}
