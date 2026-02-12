/**
 * Governance Module
 *
 * DAO creation, proposals, and voting.
 * Program layer re-exported from ts-governance for backward compatibility.
 */

export * from './types'
export * from './dao'
export * from './proposal'
export * from './vote'

// Re-export program layer from ts-governance
export {
  GOVERNANCE_PROGRAM_ID,
  getDAOAddress,
  getProposalAddress,
  getVoteRecordAddress,
  getDelegationAddress,
  getTreasuryAddress,
  DISCRIMINATORS,
} from 'ts-governance/programs'
