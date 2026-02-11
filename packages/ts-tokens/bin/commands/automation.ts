import { getConfig } from '../../src/config'

export function register(cli: any): void {
  cli
    .command('automation:schedule <action-type>', 'Schedule a future transaction')
    .option('--at <iso-date>', 'When to execute (ISO 8601)')
    .option('--mint <address>', 'Token mint address')
    .option('--to <address>', 'Recipient address')
    .option('--amount <amount>', 'Amount')
    .option('--name <name>', 'Job name')
    .action(async (actionType: string, options: {
      at?: string; mint?: string; to?: string; amount?: string; name?: string
    }) => {
      if (!options.at) {
        console.error('Error: --at is required (ISO 8601 date)')
        process.exit(1)
      }

      const scheduledAt = new Date(options.at).getTime()
      if (isNaN(scheduledAt) || scheduledAt <= Date.now()) {
        console.error('Error: --at must be a valid future date')
        process.exit(1)
      }

      const { scheduleJob } = await import('../../src/automation/scheduler')

      let action: any
      switch (actionType) {
        case 'transfer':
          if (!options.mint || !options.to || !options.amount) {
            console.error('Transfer requires --mint, --to, and --amount')
            process.exit(1)
          }
          action = { type: 'transfer', mint: options.mint, to: options.to, amount: options.amount }
          break
        case 'mint':
          if (!options.mint || !options.to || !options.amount) {
            console.error('Mint requires --mint, --to, and --amount')
            process.exit(1)
          }
          action = { type: 'mint', mint: options.mint, to: options.to, amount: options.amount }
          break
        default:
          console.error(`Unknown action type: ${actionType}. Supported: transfer, mint`)
          process.exit(1)
      }

      const job = scheduleJob({
        name: options.name || `Scheduled ${actionType}`,
        scheduledAt,
        action,
      })

      console.log(`\u2713 Job scheduled`)
      console.log(`  ID: ${job.id}`)
      console.log(`  Executes at: ${new Date(job.scheduledAt).toISOString()}`)
    })

  cli
    .command('automation:jobs', 'List scheduled jobs')
    .option('--status <status>', 'Filter by status')
    .action(async (options: { status?: string }) => {
      const { listJobs } = await import('../../src/automation/scheduler')
      const jobs = listJobs(options.status ? { status: options.status as any } : undefined)

      if (jobs.length === 0) {
        console.log('No jobs found')
        return
      }

      console.log(`Jobs (${jobs.length}):`)
      for (const job of jobs) {
        console.log(`  ${job.id}`)
        console.log(`    Name: ${job.name}`)
        console.log(`    Status: ${job.status}`)
        console.log(`    Scheduled: ${new Date(job.scheduledAt).toISOString()}`)
        console.log(`    Action: ${job.action.type}`)
        if (job.error) console.log(`    Error: ${job.error}`)
        console.log('')
      }
    })

  cli
    .command('automation:cancel <job-id>', 'Cancel a scheduled job')
    .action(async (jobId: string) => {
      const { cancelJob } = await import('../../src/automation/scheduler')
      const cancelled = cancelJob(jobId)

      if (cancelled) {
        console.log(`\u2713 Job ${jobId} cancelled`)
      } else {
        console.error(`Could not cancel job ${jobId} (not found or not cancellable)`)
        process.exit(1)
      }
    })

  cli
    .command('automation:run', 'Process all due scheduled jobs (one-shot)')
    .action(async () => {
      const config = await getConfig()
      const { processDueJobs } = await import('../../src/automation/scheduler')
      const { processDueCronJobs } = await import('../../src/automation/cron')

      console.log('Processing due jobs...')
      const executed = await processDueJobs(config)
      const cronExecuted = await processDueCronJobs(config)

      const total = executed.length + cronExecuted.length
      if (total === 0) {
        console.log('No due jobs found')
      } else {
        console.log(`\u2713 Executed ${total} jobs:`)
        for (const job of executed) {
          console.log(`  ${job.id}: ${job.name} \u2014 ${job.status}`)
        }
        for (const cron of cronExecuted) {
          console.log(`  ${cron.id}: ${cron.name} (cron) \u2014 run #${cron.runCount}`)
        }
      }
    })

  cli
    .command('automation:cron <action-type>', 'Create a recurring cron job')
    .option('--schedule <cron>', 'Cron expression (e.g., "0 */6 * * *")')
    .option('--mint <address>', 'Token mint address')
    .option('--to <address>', 'Recipient address')
    .option('--amount <amount>', 'Amount')
    .option('--name <name>', 'Job name')
    .option('--max-runs <n>', 'Maximum number of runs')
    .action(async (actionType: string, options: {
      schedule?: string; mint?: string; to?: string; amount?: string; name?: string; maxRuns?: string
    }) => {
      if (!options.schedule) {
        console.error('Error: --schedule is required (cron expression)')
        process.exit(1)
      }

      const { createCronJob } = await import('../../src/automation/cron')

      let action: any
      switch (actionType) {
        case 'transfer':
          if (!options.mint || !options.to || !options.amount) {
            console.error('Transfer requires --mint, --to, and --amount')
            process.exit(1)
          }
          action = { type: 'transfer', mint: options.mint, to: options.to, amount: options.amount }
          break
        case 'mint':
          if (!options.mint || !options.to || !options.amount) {
            console.error('Mint requires --mint, --to, and --amount')
            process.exit(1)
          }
          action = { type: 'mint', mint: options.mint, to: options.to, amount: options.amount }
          break
        default:
          console.error(`Unknown action type: ${actionType}. Supported: transfer, mint`)
          process.exit(1)
      }

      const cronJob = createCronJob({
        name: options.name || `Cron ${actionType}`,
        schedule: options.schedule,
        action,
        maxRuns: options.maxRuns ? parseInt(options.maxRuns) : undefined,
      })

      console.log(`\u2713 Cron job created`)
      console.log(`  ID: ${cronJob.id}`)
      console.log(`  Schedule: ${cronJob.schedule}`)
      console.log(`  Next run: ${cronJob.nextRun ? new Date(cronJob.nextRun).toISOString() : 'N/A'}`)
    })

  cli
    .command('automation:cron-list', 'List cron jobs')
    .action(async () => {
      const { listCronJobs } = await import('../../src/automation/cron')
      const jobs = listCronJobs()

      if (jobs.length === 0) {
        console.log('No cron jobs found')
        return
      }

      console.log(`Cron jobs (${jobs.length}):`)
      for (const job of jobs) {
        console.log(`  ${job.id}`)
        console.log(`    Name: ${job.name}`)
        console.log(`    Schedule: ${job.schedule}`)
        console.log(`    Enabled: ${job.enabled}`)
        console.log(`    Runs: ${job.runCount}${job.maxRuns ? `/${job.maxRuns}` : ''}`)
        console.log(`    Next run: ${job.nextRun ? new Date(job.nextRun).toISOString() : 'N/A'}`)
        console.log('')
      }
    })

  cli
    .command('automation:cron-remove <id>', 'Remove a cron job')
    .action(async (id: string) => {
      const { removeCronJob } = await import('../../src/automation/cron')
      const removed = removeCronJob(id)

      if (removed) {
        console.log(`\u2713 Cron job ${id} removed`)
      } else {
        console.error(`Cron job not found: ${id}`)
        process.exit(1)
      }
    })

  cli
    .command('automation:mint-schedule <mint>', 'Set mint schedule')
    .option('--start <iso-date>', 'Minting start time (ISO 8601)')
    .option('--end <iso-date>', 'Minting end time (ISO 8601)')
    .option('--max-supply <amount>', 'Maximum supply cap')
    .option('--price <sol>', 'Price per mint in SOL lamports')
    .action(async (mint: string, options: {
      start?: string; end?: string; maxSupply?: string; price?: string
    }) => {
      const { setMintSchedule } = await import('../../src/automation/mint-automation')

      setMintSchedule({
        mint,
        startTime: options.start ? new Date(options.start).getTime() : undefined,
        endTime: options.end ? new Date(options.end).getTime() : undefined,
        maxSupply: options.maxSupply,
        pricePerMint: options.price,
      })

      console.log(`\u2713 Mint schedule set for ${mint}`)
      if (options.start) console.log(`  Start: ${options.start}`)
      if (options.end) console.log(`  End: ${options.end}`)
      if (options.maxSupply) console.log(`  Max Supply: ${options.maxSupply}`)
      if (options.price) console.log(`  Price: ${options.price}`)
    })
}
