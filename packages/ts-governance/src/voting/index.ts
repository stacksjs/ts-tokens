/**
 * Voting Module
 */

export { castVote, changeVote, withdrawVote } from './cast'
export { getVotingPower, getVotingPowerSnapshot, calculateQuadraticPower, calculateNFTVotingPower, calculateWeightedPower } from './power'
export { calculateTimeWeightedPower, getTimeWeightedMultiplier } from './time-weighted'
export type { CurveType, TimeWeightConfig } from './time-weighted'
export { getVoteRecord, getProposalVotes, hasVoted, calculateVoteBreakdown, isVotingOpen, getVotingTimeRemaining } from './queries'
