/**
 * Cron-like Scheduling
 *
 * Simple 5-field cron parser and scheduler. No external deps.
 * Supports standard cron: minute hour day-of-month month day-of-week
 */

import type { TokenConfig } from '../types'
import type { CronJob, CronSchedule, JobAction, SerializedCronJob } from './types'
import { loadSchedulerState, saveSchedulerState, generateId } from './scheduler'
import { executeJob, scheduleJob as scheduleOneTimeJob } from './scheduler'

// ============================================
// Cron Expression Parser
// ============================================

/**
 * Parse a 5-field cron expression
 *
 * Fields: minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-6, 0=Sunday)
 *
 * Supports:
 *  - `*`        every value
 *  - `n`        specific value
 *  - `n-m`      range
 *  - `n,m,o`    list
 *  - `*​/n`      step (every n)
 *  - `n-m/s`    range with step
 */
export function parseCronExpression(expr: string): CronSchedule {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`)
  }

  return {
    minutes: parseField(parts[0], 0, 59),
    hours: parseField(parts[1], 0, 23),
    daysOfMonth: parseField(parts[2], 1, 31),
    months: parseField(parts[3], 1, 12),
    daysOfWeek: parseField(parts[4], 0, 6),
  }
}

/**
 * Parse a single cron field
 */
export function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>()

  for (const part of field.split(',')) {
    const trimmed = part.trim()

    if (trimmed === '*') {
      for (let i = min; i <= max; i++) values.add(i)
      continue
    }

    // Step: */n or n-m/s
    if (trimmed.includes('/')) {
      const [range, stepStr] = trimmed.split('/')
      const step = parseInt(stepStr, 10)

      if (isNaN(step) || step <= 0) {
        throw new Error(`Invalid step value: ${stepStr}`)
      }

      let start = min
      let end = max

      if (range !== '*') {
        if (range.includes('-')) {
          const [s, e] = range.split('-').map(Number)
          start = s
          end = e
        } else {
          start = parseInt(range, 10)
        }
      }

      for (let i = start; i <= end; i += step) {
        if (i >= min && i <= max) values.add(i)
      }
      continue
    }

    // Range: n-m
    if (trimmed.includes('-')) {
      const [s, e] = trimmed.split('-').map(Number)
      if (isNaN(s) || isNaN(e)) {
        throw new Error(`Invalid range: ${trimmed}`)
      }
      for (let i = s; i <= e; i++) {
        if (i >= min && i <= max) values.add(i)
      }
      continue
    }

    // Single value
    const val = parseInt(trimmed, 10)
    if (isNaN(val)) {
      throw new Error(`Invalid cron value: ${trimmed}`)
    }
    if (val < min || val > max) {
      throw new Error(`Value ${val} out of range [${min}-${max}]`)
    }
    values.add(val)
  }

  if (values.size === 0) {
    throw new Error(`Empty field after parsing: ${field}`)
  }

  return Array.from(values).sort((a, b) => a - b)
}

/**
 * Calculate the next run time from a CronSchedule
 *
 * Iterates forward from `from` (default: now) minute by minute,
 * returning the first timestamp that matches all cron fields.
 * Scans up to 366 days ahead.
 */
export function getNextRun(schedule: CronSchedule, from?: Date): Date {
  const start = from ? new Date(from) : new Date()

  // Start from the next minute
  start.setSeconds(0, 0)
  start.setMinutes(start.getMinutes() + 1)

  // Scan up to 366 days ahead
  const maxIterations = 366 * 24 * 60
  const candidate = new Date(start)

  for (let i = 0; i < maxIterations; i++) {
    const month = candidate.getMonth() + 1 // 1-12
    const dayOfMonth = candidate.getDate()  // 1-31
    const dayOfWeek = candidate.getDay()    // 0-6
    const hour = candidate.getHours()       // 0-23
    const minute = candidate.getMinutes()   // 0-59

    if (
      schedule.months.includes(month)
      && schedule.daysOfMonth.includes(dayOfMonth)
      && schedule.daysOfWeek.includes(dayOfWeek)
      && schedule.hours.includes(hour)
      && schedule.minutes.includes(minute)
    ) {
      return candidate
    }

    // Advance by 1 minute
    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  throw new Error('Could not find next run within 366 days')
}

// ============================================
// Cron Job CRUD
// ============================================

/**
 * Create a new cron job
 */
export function createCronJob(
  options: {
    name: string
    schedule: string
    action: JobAction
    maxRuns?: number
  },
  storePath?: string,
): CronJob {
  // Validate cron expression
  const parsed = parseCronExpression(options.schedule)
  const nextRun = getNextRun(parsed)

  const job: CronJob = {
    id: generateId('cron'),
    name: options.name,
    schedule: options.schedule,
    action: options.action,
    enabled: true,
    nextRun: nextRun.getTime(),
    runCount: 0,
    maxRuns: options.maxRuns,
    createdAt: Date.now(),
  }

  const state = loadSchedulerState(storePath)
  state.cronJobs[job.id] = job as SerializedCronJob
  saveSchedulerState(state, storePath)

  return job
}

/**
 * Remove a cron job
 */
export function removeCronJob(cronId: string, storePath?: string): boolean {
  const state = loadSchedulerState(storePath)
  if (!state.cronJobs[cronId]) return false
  delete state.cronJobs[cronId]
  saveSchedulerState(state, storePath)
  return true
}

/**
 * Enable a cron job
 */
export function enableCronJob(cronId: string, storePath?: string): boolean {
  const state = loadSchedulerState(storePath)
  const job = state.cronJobs[cronId]
  if (!job) return false

  job.enabled = true
  const parsed = parseCronExpression(job.schedule)
  job.nextRun = getNextRun(parsed).getTime()
  saveSchedulerState(state, storePath)
  return true
}

/**
 * Disable a cron job
 */
export function disableCronJob(cronId: string, storePath?: string): boolean {
  const state = loadSchedulerState(storePath)
  const job = state.cronJobs[cronId]
  if (!job) return false

  job.enabled = false
  saveSchedulerState(state, storePath)
  return true
}

/**
 * List all cron jobs
 */
export function listCronJobs(storePath?: string): CronJob[] {
  const state = loadSchedulerState(storePath)
  return Object.values(state.cronJobs) as CronJob[]
}

/**
 * Get a cron job by ID
 */
export function getCronJob(cronId: string, storePath?: string): CronJob | null {
  const state = loadSchedulerState(storePath)
  return (state.cronJobs[cronId] as CronJob) ?? null
}

/**
 * Process due cron jobs (one-shot)
 */
export async function processDueCronJobs(
  config: TokenConfig,
  storePath?: string,
): Promise<CronJob[]> {
  const state = loadSchedulerState(storePath)
  const now = Date.now()
  const executed: CronJob[] = []

  for (const cronJob of Object.values(state.cronJobs)) {
    if (!cronJob.enabled) continue
    if (cronJob.nextRun && cronJob.nextRun > now) continue
    if (cronJob.maxRuns && cronJob.runCount >= cronJob.maxRuns) {
      cronJob.enabled = false
      continue
    }

    try {
      // Create a one-time job from the cron action and execute immediately
      const tempJobId = generateId('cron-exec')
      state.jobs[tempJobId] = {
        id: tempJobId,
        name: `${cronJob.name} (run #${cronJob.runCount + 1})`,
        status: 'scheduled',
        scheduledAt: now,
        createdAt: now,
        action: cronJob.action,
      }
      saveSchedulerState(state, storePath)

      await executeJob(tempJobId, config, storePath)

      // Reload state after execution
      const freshState = loadSchedulerState(storePath)
      const freshCron = freshState.cronJobs[cronJob.id]
      if (freshCron) {
        freshCron.lastRun = now
        freshCron.runCount++

        // Calculate next run
        const parsed = parseCronExpression(freshCron.schedule)
        freshCron.nextRun = getNextRun(parsed).getTime()

        // Check maxRuns
        if (freshCron.maxRuns && freshCron.runCount >= freshCron.maxRuns) {
          freshCron.enabled = false
        }

        saveSchedulerState(freshState, storePath)
        executed.push(freshCron as CronJob)
      }
    } catch {
      // Continue on failure
    }
  }

  return executed
}

/**
 * Run the cron scheduler as a polling loop
 */
export function runCronScheduler(
  config: TokenConfig,
  storePath?: string,
  intervalMs: number = 30000,
): { stop: () => void } {
  let running = true

  const poll = async () => {
    while (running) {
      try {
        await processDueCronJobs(config, storePath)
      } catch {
        // Silently continue
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  poll()

  return {
    stop: () => { running = false },
  }
}
