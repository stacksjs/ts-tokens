/**
 * Vesting Types
 *
 * Types for token vesting schedules.
 */

/**
 * Vesting schedule status
 */
export type VestingStatus = 'pending' | 'active' | 'completed' | 'cancelled'

/**
 * Cliff configuration
 */
export interface CliffConfig {
  months: number
  percentage?: number
}

/**
 * Vesting schedule configuration
 */
export interface VestingConfig {
  recipient: string
  mint: string
  totalAmount: bigint
  cliffMonths: number
  vestingMonths: number
  startDate: number
  cliffPercentage?: number
}

/**
 * Vesting schedule
 */
export interface VestingSchedule {
  id: string
  recipient: string
  mint: string
  totalAmount: bigint
  vestedAmount: bigint
  claimedAmount: bigint
  cliffMonths: number
  vestingMonths: number
  cliffPercentage: number
  startDate: number
  cliffDate: number
  endDate: number
  status: VestingStatus
  escrowAccount?: string
  fundSignature?: string
  claimSignatures: string[]
  createdAt: number
}

/**
 * Vesting status report
 */
export interface VestingStatusReport {
  id: string
  recipient: string
  mint: string
  totalAmount: bigint
  vestedAmount: bigint
  claimedAmount: bigint
  unvestedAmount: bigint
  claimableAmount: bigint
  percentageVested: number
  percentageClaimed: number
  nextVestingDate?: number
  isCliffReached: boolean
  status: VestingStatus
}

/**
 * Serialized vesting schedule for persistence
 */
export interface SerializedVestingSchedule {
  id: string
  recipient: string
  mint: string
  totalAmount: string
  vestedAmount: string
  claimedAmount: string
  cliffMonths: number
  vestingMonths: number
  cliffPercentage: number
  startDate: number
  cliffDate: number
  endDate: number
  status: VestingStatus
  escrowAccount?: string
  fundSignature?: string
  claimSignatures: string[]
  createdAt: number
}

/**
 * Vesting state file
 */
export interface VestingState {
  schedules: Record<string, SerializedVestingSchedule>
}
