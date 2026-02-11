/**
 * Automation & Scheduling Types
 */

export type JobStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Action to execute for a scheduled job
 */
export type JobAction =
  | { type: 'transfer'; mint: string; to: string; amount: string }
  | { type: 'mint'; mint: string; to: string; amount: string }
  | { type: 'batch-transfer'; mint: string; recipients: Array<{ address: string; amount: string }> }
  | { type: 'metadata-update'; mint: string; updates: Record<string, unknown> }
  | { type: 'freeze'; mint: string; account: string }
  | { type: 'thaw'; mint: string; account: string }
  | { type: 'custom'; handler: string; params: Record<string, unknown> }

/**
 * A scheduled job for one-time future execution
 */
export interface ScheduledJob {
  id: string
  name: string
  status: JobStatus
  scheduledAt: number          // Unix timestamp (ms) to execute
  createdAt: number
  executedAt?: number
  completedAt?: number
  error?: string
  result?: Record<string, unknown>
  action: JobAction
}

/**
 * A recurring job using cron-like scheduling
 */
export interface CronJob {
  id: string
  name: string
  schedule: string             // Cron expression: "0 */6 * * *"
  action: JobAction
  enabled: boolean
  lastRun?: number
  nextRun?: number
  runCount: number
  maxRuns?: number             // Optional limit
  createdAt: number
}

/**
 * Mint schedule configuration
 */
export interface MintSchedule {
  mint: string
  startTime?: number           // When minting opens (ms)
  endTime?: number             // When minting closes (ms)
  maxSupply?: string           // Supply cap (as string for JSON)
  pricePerMint?: string        // SOL cost per mint (as string for JSON)
  allowlist?: string[]         // Allowed wallet addresses
}

/**
 * Parsed cron schedule fields
 */
export interface CronSchedule {
  minutes: number[]
  hours: number[]
  daysOfMonth: number[]
  months: number[]
  daysOfWeek: number[]
}

/**
 * Serialized job for JSON persistence (same as ScheduledJob — all fields JSON-safe)
 */
export interface SerializedJob {
  id: string
  name: string
  status: JobStatus
  scheduledAt: number
  createdAt: number
  executedAt?: number
  completedAt?: number
  error?: string
  result?: Record<string, unknown>
  action: JobAction
}

/**
 * Serialized cron job for JSON persistence
 */
export interface SerializedCronJob {
  id: string
  name: string
  schedule: string
  action: JobAction
  enabled: boolean
  lastRun?: number
  nextRun?: number
  runCount: number
  maxRuns?: number
  createdAt: number
}

/**
 * Serialized mint schedule for JSON persistence
 */
export interface SerializedMintSchedule {
  mint: string
  startTime?: number
  endTime?: number
  maxSupply?: string
  pricePerMint?: string
  allowlist?: string[]
}

/**
 * Persistent scheduler state
 */
export interface SchedulerState {
  jobs: Record<string, SerializedJob>
  cronJobs: Record<string, SerializedCronJob>
  mintSchedules: Record<string, SerializedMintSchedule>
}
