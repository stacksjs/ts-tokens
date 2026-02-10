/**
 * Governance CLI Commands
 *
 * CLI commands for DAO governance operations.
 */

import { PublicKey } from '@solana/web3.js'

/**
 * Governance CLI command definitions
 */
export const governanceCommands = {
  // DAO Commands
  'dao:create': {
    description: 'Create a new DAO',
    options: [
      { name: 'name', type: 'string', required: true, description: 'DAO name' },
      { name: 'token', type: 'string', required: true, description: 'Governance token mint' },
      { name: 'quorum', type: 'number', default: 10, description: 'Quorum percentage' },
      { name: 'threshold', type: 'number', default: 66, description: 'Approval threshold' },
      { name: 'voting-period', type: 'string', default: '5 days', description: 'Voting period' },
    ],
  },

  'dao:info': {
    description: 'Show DAO information',
    args: [{ name: 'address', required: true, description: 'DAO address' }],
  },

  'dao:config': {
    description: 'Show or update DAO configuration',
    args: [{ name: 'address', required: true, description: 'DAO address' }],
    options: [
      { name: 'quorum', type: 'number', description: 'New quorum percentage' },
      { name: 'threshold', type: 'number', description: 'New approval threshold' },
    ],
  },

  // Proposal Commands
  'proposal:create': {
    description: 'Create a new proposal',
    args: [{ name: 'dao', required: true, description: 'DAO address' }],
    options: [
      { name: 'title', type: 'string', required: true, description: 'Proposal title' },
      { name: 'description', type: 'string', description: 'Proposal description or IPFS URI' },
      { name: 'action', type: 'string', description: 'Action type (transfer-sol, transfer-token, etc.)' },
    ],
  },

  'proposal:list': {
    description: 'List proposals for a DAO',
    args: [{ name: 'dao', required: true, description: 'DAO address' }],
    options: [
      { name: 'status', type: 'string', description: 'Filter by status' },
      { name: 'limit', type: 'number', default: 10, description: 'Number of proposals' },
    ],
  },

  'proposal:info': {
    description: 'Show proposal details',
    args: [{ name: 'address', required: true, description: 'Proposal address' }],
  },

  'proposal:vote': {
    description: 'Vote on a proposal',
    args: [
      { name: 'address', required: true, description: 'Proposal address' },
      { name: 'vote', required: true, description: 'Vote type: for, against, or abstain' },
    ],
  },

  'proposal:execute': {
    description: 'Execute a passed proposal',
    args: [{ name: 'address', required: true, description: 'Proposal address' }],
  },

  // Delegation Commands
  'delegate': {
    description: 'Delegate voting power',
    args: [
      { name: 'dao', required: true, description: 'DAO address' },
      { name: 'to', required: true, description: 'Delegate address' },
    ],
    options: [
      { name: 'amount', type: 'string', description: 'Amount to delegate (default: all)' },
    ],
  },

  'undelegate': {
    description: 'Remove delegation',
    args: [{ name: 'dao', required: true, description: 'DAO address' }],
  },

  'power': {
    description: 'Show your voting power',
    args: [{ name: 'dao', required: true, description: 'DAO address' }],
  },

  // Treasury Commands
  'treasury:info': {
    description: 'Show treasury balance',
    args: [{ name: 'dao', required: true, description: 'DAO address' }],
  },

  'treasury:deposit': {
    description: 'Deposit to treasury',
    args: [
      { name: 'dao', required: true, description: 'DAO address' },
      { name: 'amount', required: true, description: 'Amount in SOL' },
    ],
    options: [
      { name: 'token', type: 'string', description: 'Token mint (for token deposits)' },
    ],
  },
} as const

/**
 * Format DAO info for display
 */
export function formatDAOInfo(dao: {
  address: string
  name: string
  governanceToken: string
  treasury: string
  config: {
    votingPeriod: bigint
    quorum: number
    approvalThreshold: number
  }
  proposalCount: bigint
  totalVotingPower: bigint
}): string {
  const lines = [
    `DAO: ${dao.name}`,
    `Address: ${dao.address}`,
    `Governance Token: ${dao.governanceToken}`,
    `Treasury: ${dao.treasury}`,
    '',
    'Configuration:',
    `  Voting Period: ${formatDuration(dao.config.votingPeriod)}`,
    `  Quorum: ${dao.config.quorum}%`,
    `  Approval Threshold: ${dao.config.approvalThreshold}%`,
    '',
    `Proposals: ${dao.proposalCount}`,
    `Total Voting Power: ${dao.totalVotingPower}`,
  ]
  return lines.join('\n')
}

/**
 * Format proposal info for display
 */
export function formatProposalInfo(proposal: {
  address: string
  title: string
  status: string
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  startTime: bigint
  endTime: bigint
}): string {
  const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes
  const forPct = total > 0n ? Number((proposal.forVotes * 100n) / total) : 0
  const againstPct = total > 0n ? Number((proposal.againstVotes * 100n) / total) : 0

  const lines = [
    `Proposal: ${proposal.title}`,
    `Address: ${proposal.address}`,
    `Status: ${proposal.status}`,
    '',
    'Votes:',
    `  For: ${proposal.forVotes} (${forPct}%)`,
    `  Against: ${proposal.againstVotes} (${againstPct}%)`,
    `  Abstain: ${proposal.abstainVotes}`,
    '',
    `Voting Period: ${formatTimestamp(proposal.startTime)} - ${formatTimestamp(proposal.endTime)}`,
  ]
  return lines.join('\n')
}

/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds: bigint): string {
  const days = Number(seconds / 86400n)
  const hours = Number((seconds % 86400n) / 3600n)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${seconds} seconds`
}

/**
 * Format timestamp to date string
 */
function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

/**
 * Parse vote type from string
 */
export function parseVoteType(vote: string): 'for' | 'against' | 'abstain' {
  const normalized = vote.toLowerCase()
  if (normalized === 'for' || normalized === 'yes' || normalized === 'y') return 'for'
  if (normalized === 'against' || normalized === 'no' || normalized === 'n') return 'against'
  if (normalized === 'abstain' || normalized === 'skip') return 'abstain'
  throw new Error(`Invalid vote type: ${vote}. Use 'for', 'against', or 'abstain'`)
}

/**
 * Validate DAO address
 */
export function validateDAOAddress(address: string): PublicKey {
  try {
    return new PublicKey(address)
  } catch {
    throw new Error(`Invalid DAO address: ${address}`)
  }
}
