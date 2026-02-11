/** CLI automation command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { getConfig } from '../../config'

export async function automationSchedule(actionType: string, options: {
  at?: string
  mint?: string
  to?: string
  amount?: string
  name?: string
}): Promise<void> {
  if (!options.at) {
    error('--at is required (ISO 8601 date)')
    process.exit(1)
  }

  const scheduledAt = new Date(options.at).getTime()
  if (isNaN(scheduledAt) || scheduledAt <= Date.now()) {
    error('--at must be a valid future date')
    process.exit(1)
  }

  try {
    const { scheduleJob } = await import('../../automation/scheduler')

    let action: any
    switch (actionType) {
      case 'transfer':
        if (!options.mint || !options.to || !options.amount) {
          error('Transfer requires --mint, --to, and --amount')
          process.exit(1)
        }
        action = { type: 'transfer', mint: options.mint, to: options.to, amount: options.amount }
        break
      case 'mint':
        if (!options.mint || !options.to || !options.amount) {
          error('Mint requires --mint, --to, and --amount')
          process.exit(1)
        }
        action = { type: 'mint', mint: options.mint, to: options.to, amount: options.amount }
        break
      default:
        error(`Unknown action type: ${actionType}. Supported: transfer, mint`)
        process.exit(1)
    }

    const job = scheduleJob({
      name: options.name || `Scheduled ${actionType}`,
      scheduledAt,
      action,
    })

    success('Job scheduled')
    keyValue('ID', job.id)
    keyValue('Executes at', new Date(job.scheduledAt).toISOString())
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function automationJobs(options: { status?: string }): Promise<void> {
  try {
    const { listJobs } = await import('../../automation/scheduler')
    const jobs = listJobs(options.status ? { status: options.status as any } : undefined)

    if (jobs.length === 0) {
      info('No jobs found')
      return
    }

    header(`Jobs (${jobs.length})`)
    for (const job of jobs) {
      keyValue('ID', job.id)
      keyValue('Name', job.name)
      keyValue('Status', job.status)
      keyValue('Scheduled', new Date(job.scheduledAt).toISOString())
      keyValue('Action', job.action.type)
      if (job.error) keyValue('Error', job.error)
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function automationCancel(jobId: string): Promise<void> {
  try {
    const { cancelJob } = await import('../../automation/scheduler')
    const cancelled = cancelJob(jobId)

    if (cancelled) {
      success(`Job ${jobId} cancelled`)
    } else {
      error(`Could not cancel job ${jobId} (not found or not cancellable)`)
      process.exit(1)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function automationRun(): Promise<void> {
  try {
    const config = await getConfig()
    const { processDueJobs } = await import('../../automation/scheduler')
    const { processDueCronJobs } = await import('../../automation/cron')

    info('Processing due jobs...')
    const executed = await processDueJobs(config)
    const cronExecuted = await processDueCronJobs(config)

    const total = executed.length + cronExecuted.length
    if (total === 0) {
      info('No due jobs found')
    } else {
      success(`Executed ${total} jobs`)
      for (const job of executed) {
        keyValue(job.id, `${job.name} — ${job.status}`)
      }
      for (const cron of cronExecuted) {
        keyValue(cron.id, `${cron.name} (cron) — run #${cron.runCount}`)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function automationCron(actionType: string, options: {
  schedule?: string
  mint?: string
  to?: string
  amount?: string
  name?: string
  maxRuns?: string
}): Promise<void> {
  if (!options.schedule) {
    error('--schedule is required (cron expression)')
    process.exit(1)
  }

  try {
    const { createCronJob } = await import('../../automation/cron')

    let action: any
    switch (actionType) {
      case 'transfer':
        if (!options.mint || !options.to || !options.amount) {
          error('Transfer requires --mint, --to, and --amount')
          process.exit(1)
        }
        action = { type: 'transfer', mint: options.mint, to: options.to, amount: options.amount }
        break
      case 'mint':
        if (!options.mint || !options.to || !options.amount) {
          error('Mint requires --mint, --to, and --amount')
          process.exit(1)
        }
        action = { type: 'mint', mint: options.mint, to: options.to, amount: options.amount }
        break
      default:
        error(`Unknown action type: ${actionType}. Supported: transfer, mint`)
        process.exit(1)
    }

    const cronJob = createCronJob({
      name: options.name || `Cron ${actionType}`,
      schedule: options.schedule,
      action,
      maxRuns: options.maxRuns ? parseInt(options.maxRuns) : undefined,
    })

    success('Cron job created')
    keyValue('ID', cronJob.id)
    keyValue('Schedule', cronJob.schedule)
    keyValue('Next run', cronJob.nextRun ? new Date(cronJob.nextRun).toISOString() : 'N/A')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function automationCronList(): Promise<void> {
  try {
    const { listCronJobs } = await import('../../automation/cron')
    const jobs = listCronJobs()

    if (jobs.length === 0) {
      info('No cron jobs found')
      return
    }

    header(`Cron Jobs (${jobs.length})`)
    for (const job of jobs) {
      keyValue('ID', job.id)
      keyValue('Name', job.name)
      keyValue('Schedule', job.schedule)
      keyValue('Enabled', String(job.enabled))
      keyValue('Runs', `${job.runCount}${job.maxRuns ? `/${job.maxRuns}` : ''}`)
      keyValue('Next run', job.nextRun ? new Date(job.nextRun).toISOString() : 'N/A')
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function automationCronRemove(id: string): Promise<void> {
  try {
    const { removeCronJob } = await import('../../automation/cron')
    const removed = removeCronJob(id)

    if (removed) {
      success(`Cron job ${id} removed`)
    } else {
      error(`Cron job not found: ${id}`)
      process.exit(1)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function automationMintSchedule(mint: string, options: {
  start?: string
  end?: string
  maxSupply?: string
  price?: string
}): Promise<void> {
  try {
    const { setMintSchedule } = await import('../../automation/mint-automation')

    setMintSchedule({
      mint,
      startTime: options.start ? new Date(options.start).getTime() : undefined,
      endTime: options.end ? new Date(options.end).getTime() : undefined,
      maxSupply: options.maxSupply,
      pricePerMint: options.price,
    })

    success(`Mint schedule set for ${mint}`)
    if (options.start) keyValue('Start', options.start)
    if (options.end) keyValue('End', options.end)
    if (options.maxSupply) keyValue('Max Supply', options.maxSupply)
    if (options.price) keyValue('Price', options.price)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
