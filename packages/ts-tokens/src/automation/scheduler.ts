/**
 * Scheduler — Delayed & Scheduled Transactions
 *
 * Persistent scheduler state at ~/.ts-tokens/scheduler-state.json.
 * Follows the same state persistence pattern as src/marketplace/store.ts.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { TokenConfig } from '../types'
import type {
  ScheduledJob,
  SchedulerState,
  SerializedJob,
  JobAction,
  JobStatus,
} from './types'

// ============================================
// State Persistence
// ============================================

/**
 * Get the default scheduler state path
 */
export function getSchedulerStatePath(): string {
  return path.join(os.homedir(), '.ts-tokens', 'scheduler-state.json')
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create an empty scheduler state
 */
function createEmptyState(): SchedulerState {
  return {
    jobs: {},
    cronJobs: {},
    mintSchedules: {},
  }
}

/**
 * Load scheduler state from disk
 */
export function loadSchedulerState(storePath?: string): SchedulerState {
  const filePath = storePath ?? getSchedulerStatePath()
  const resolved = path.resolve(filePath)

  if (!fs.existsSync(resolved)) {
    return createEmptyState()
  }

  const content = fs.readFileSync(resolved, 'utf-8')
  return JSON.parse(content) as SchedulerState
}

/**
 * Save scheduler state to disk
 */
export function saveSchedulerState(state: SchedulerState, storePath?: string): string {
  const filePath = storePath ?? getSchedulerStatePath()
  const resolved = path.resolve(filePath)
  const dir = path.dirname(resolved)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(resolved, JSON.stringify(state, null, 2), { mode: 0o600 })
  return resolved
}

// ============================================
// Job CRUD
// ============================================

/**
 * Schedule a job for future execution
 */
export function scheduleJob(
  options: {
    name: string
    scheduledAt: number
    action: JobAction
  },
  storePath?: string,
): ScheduledJob {
  if (options.scheduledAt <= Date.now()) {
    throw new Error('scheduledAt must be in the future')
  }

  const job: ScheduledJob = {
    id: generateId('job'),
    name: options.name,
    status: 'scheduled',
    scheduledAt: options.scheduledAt,
    createdAt: Date.now(),
    action: options.action,
  }

  const state = loadSchedulerState(storePath)
  state.jobs[job.id] = job as SerializedJob
  saveSchedulerState(state, storePath)

  return job
}

/**
 * Cancel a pending/scheduled job
 */
export function cancelJob(jobId: string, storePath?: string): boolean {
  const state = loadSchedulerState(storePath)
  const job = state.jobs[jobId]

  if (!job) {
    return false
  }

  if (job.status !== 'pending' && job.status !== 'scheduled') {
    return false
  }

  job.status = 'cancelled'
  saveSchedulerState(state, storePath)
  return true
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string, storePath?: string): ScheduledJob | null {
  const state = loadSchedulerState(storePath)
  return state.jobs[jobId] ?? null
}

/**
 * List jobs with optional status filter
 */
export function listJobs(
  filter?: { status?: JobStatus },
  storePath?: string,
): ScheduledJob[] {
  const state = loadSchedulerState(storePath)
  let jobs = Object.values(state.jobs) as ScheduledJob[]

  if (filter?.status) {
    jobs = jobs.filter(j => j.status === filter.status)
  }

  return jobs.sort((a, b) => a.scheduledAt - b.scheduledAt)
}

/**
 * Execute a scheduled job by running its action
 */
export async function executeJob(
  jobId: string,
  config: TokenConfig,
  storePath?: string,
): Promise<ScheduledJob> {
  const state = loadSchedulerState(storePath)
  const job = state.jobs[jobId]

  if (!job) {
    throw new Error(`Job not found: ${jobId}`)
  }

  // Update status to running
  job.status = 'running'
  job.executedAt = Date.now()
  saveSchedulerState(state, storePath)

  try {
    const result = await executeAction(job.action, config)
    job.status = 'completed'
    job.completedAt = Date.now()
    job.result = result
  } catch (error) {
    job.status = 'failed'
    job.completedAt = Date.now()
    job.error = error instanceof Error ? error.message : String(error)
  }

  saveSchedulerState(state, storePath)
  return job as ScheduledJob
}

/**
 * Execute a job action by dispatching to the appropriate ts-tokens function
 */
async function executeAction(
  action: JobAction,
  config: TokenConfig,
): Promise<Record<string, unknown>> {
  switch (action.type) {
    case 'transfer': {
      const { transfer } = await import('../token/transfer')
      const result = await transfer(action.mint, action.to, BigInt(action.amount), config)
      return { signature: result.signature, confirmed: result.confirmed }
    }

    case 'mint': {
      const { mintTokens } = await import('../token/mint')
      const result = await mintTokens({
        mint: action.mint,
        amount: BigInt(action.amount),
        destination: action.to,
      }, config)
      return { signature: result.signature }
    }

    case 'batch-transfer': {
      const { batchTransfer } = await import('../batch/transfer')
      const { createConnection } = await import('../drivers/solana/connection')
      const { loadWallet } = await import('../drivers/solana/wallet')
      const { PublicKey } = await import('@solana/web3.js')

      const connection = createConnection(config)
      const payer = loadWallet(config)

      const result = await batchTransfer(connection, payer.publicKey, {
        mint: new PublicKey(action.mint),
        recipients: action.recipients.map(r => ({
          address: r.address,
          amount: BigInt(r.amount),
        })),
      })
      return {
        successful: result.successful,
        failed: result.failed,
        total: result.total,
      }
    }

    case 'metadata-update': {
      const { updateNFTMetadata } = await import('../nft/metadata')
      const result = await updateNFTMetadata(action.mint, action.updates as any, config)
      return { signature: result.signature, confirmed: result.confirmed }
    }

    case 'freeze': {
      const { freezeAccount } = await import('../token/authority')
      const result = await freezeAccount(action.mint, action.account, config)
      return { signature: result.signature }
    }

    case 'thaw': {
      const { thawAccount } = await import('../token/authority')
      const result = await thawAccount(action.mint, action.account, config)
      return { signature: result.signature }
    }

    case 'custom': {
      return { handler: action.handler, status: 'custom actions require manual execution' }
    }

    default:
      throw new Error(`Unknown action type: ${(action as any).type}`)
  }
}

/**
 * Process all due jobs (one-shot, for CLI use)
 */
export async function processDueJobs(
  config: TokenConfig,
  storePath?: string,
): Promise<ScheduledJob[]> {
  const state = loadSchedulerState(storePath)
  const now = Date.now()
  const executed: ScheduledJob[] = []

  for (const job of Object.values(state.jobs)) {
    if (
      (job.status === 'pending' || job.status === 'scheduled')
      && job.scheduledAt <= now
    ) {
      const result = await executeJob(job.id, config, storePath)
      executed.push(result)
    }
  }

  return executed
}

/**
 * Run the scheduler as a polling loop
 *
 * Returns a handle with a stop() method.
 */
export function runScheduler(
  config: TokenConfig,
  storePath?: string,
  intervalMs: number = 1000,
): { stop: () => void } {
  let running = true

  const poll = async () => {
    while (running) {
      try {
        await processDueJobs(config, storePath)
      } catch {
        // Silently continue on errors
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  poll()

  return {
    stop: () => { running = false },
  }
}

/**
 * Clean up completed/failed/cancelled jobs older than the given age (ms)
 */
export function cleanupJobs(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000, storePath?: string): number {
  const state = loadSchedulerState(storePath)
  const cutoff = Date.now() - maxAgeMs
  let removed = 0

  for (const [id, job] of Object.entries(state.jobs)) {
    if (
      (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')
      && job.createdAt < cutoff
    ) {
      delete state.jobs[id]
      removed++
    }
  }

  if (removed > 0) {
    saveSchedulerState(state, storePath)
  }

  return removed
}
