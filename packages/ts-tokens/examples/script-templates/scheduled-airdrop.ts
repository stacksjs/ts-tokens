/**
 * Scheduled Airdrop Script Template
 *
 * Schedule future token transfers and recurring distributions.
 *
 * Usage:
 *   MODE=schedule MINT_ADDRESS="..." RECIPIENT="..." AMOUNT="1000" \
 *   SCHEDULE_AT="2025-06-01T00:00:00Z" \
 *   bun run examples/script-templates/scheduled-airdrop.ts
 *
 *   MODE=cron MINT_ADDRESS="..." RECIPIENT="..." AMOUNT="100" \
 *   CRON_SCHEDULE="0 0 * * 1" MAX_RUNS=10 \
 *   bun run examples/script-templates/scheduled-airdrop.ts
 *
 *   MODE=run \
 *   bun run examples/script-templates/scheduled-airdrop.ts
 *
 * Environment Variables:
 *   MODE           - "schedule" (one-time), "cron" (recurring), or "run" (execute due jobs)
 *   MINT_ADDRESS   - Token mint address
 *   RECIPIENT      - Recipient wallet address
 *   AMOUNT         - Token amount to transfer
 *   SCHEDULE_AT    - ISO 8601 date for one-time schedule
 *   CRON_SCHEDULE  - Cron expression for recurring schedule
 *   MAX_RUNS       - Maximum number of cron executions (optional)
 *   JOB_NAME       - Custom job name (optional)
 */

import { scheduleJob, processDueJobs, listJobs } from '../../src/automation/scheduler'
import { createCronJob, listCronJobs } from '../../src/automation/cron'
import { getConfig } from '../../src/config'

async function main() {
  const mode = process.env.MODE || 'run'
  const mint = process.env.MINT_ADDRESS
  const recipient = process.env.RECIPIENT
  const amount = process.env.AMOUNT
  const config = await getConfig()

  switch (mode) {
    case 'schedule': {
      if (!mint || !recipient || !amount) {
        console.error('Required for schedule mode: MINT_ADDRESS, RECIPIENT, AMOUNT, SCHEDULE_AT')
        process.exit(1)
      }

      const scheduleAt = process.env.SCHEDULE_AT
      if (!scheduleAt) {
        console.error('Required: SCHEDULE_AT (ISO 8601 date)')
        process.exit(1)
      }

      const scheduledTime = new Date(scheduleAt).getTime()
      if (scheduledTime <= Date.now()) {
        console.error('SCHEDULE_AT must be in the future')
        process.exit(1)
      }

      const jobName = process.env.JOB_NAME || `Scheduled transfer to ${recipient}`
      const job = scheduleJob({
        name: jobName,
        scheduledAt: scheduledTime,
        action: {
          type: 'transfer',
          mint,
          to: recipient,
          amount,
        },
      })

      console.log('Job scheduled!')
      console.log(`  ID: ${job.id}`)
      console.log(`  Name: ${job.name}`)
      console.log(`  Executes at: ${new Date(job.scheduledAt).toISOString()}`)
      console.log(`  Action: transfer ${amount} tokens to ${recipient}`)
      break
    }

    case 'cron': {
      if (!mint || !recipient || !amount) {
        console.error('Required for cron mode: MINT_ADDRESS, RECIPIENT, AMOUNT, CRON_SCHEDULE')
        process.exit(1)
      }

      const cronSchedule = process.env.CRON_SCHEDULE
      if (!cronSchedule) {
        console.error('Required: CRON_SCHEDULE (e.g., "0 0 * * 1" for weekly on Monday)')
        process.exit(1)
      }

      const maxRuns = process.env.MAX_RUNS ? parseInt(process.env.MAX_RUNS) : undefined
      const jobName = process.env.JOB_NAME || `Recurring transfer to ${recipient}`

      const cronJob = createCronJob({
        name: jobName,
        schedule: cronSchedule,
        action: {
          type: 'transfer',
          mint,
          to: recipient,
          amount,
        },
        maxRuns,
      })

      console.log('Cron job created!')
      console.log(`  ID: ${cronJob.id}`)
      console.log(`  Name: ${cronJob.name}`)
      console.log(`  Schedule: ${cronJob.schedule}`)
      console.log(`  Next run: ${cronJob.nextRun ? new Date(cronJob.nextRun).toISOString() : 'N/A'}`)
      if (maxRuns) console.log(`  Max runs: ${maxRuns}`)
      break
    }

    case 'run': {
      console.log('Processing due jobs...')
      const executed = await processDueJobs(config)

      if (executed.length === 0) {
        console.log('No due jobs found.')
      } else {
        console.log(`Executed ${executed.length} jobs:`)
        for (const job of executed) {
          console.log(`  ${job.id}: ${job.name} — ${job.status}`)
          if (job.error) console.log(`    Error: ${job.error}`)
        }
      }

      // Show upcoming jobs
      const pending = listJobs({ status: 'scheduled' })
      if (pending.length > 0) {
        console.log(`\nUpcoming scheduled jobs (${pending.length}):`)
        for (const job of pending.slice(0, 10)) {
          console.log(`  ${job.id}: ${job.name}`)
          console.log(`    Executes at: ${new Date(job.scheduledAt).toISOString()}`)
        }
      }

      // Show active cron jobs
      const crons = listCronJobs()
      const activeCrons = crons.filter(c => c.enabled)
      if (activeCrons.length > 0) {
        console.log(`\nActive cron jobs (${activeCrons.length}):`)
        for (const cron of activeCrons) {
          console.log(`  ${cron.id}: ${cron.name} (${cron.schedule})`)
          console.log(`    Runs: ${cron.runCount}${cron.maxRuns ? `/${cron.maxRuns}` : ''}`)
        }
      }
      break
    }

    default:
      console.error(`Unknown mode: ${mode}. Use "schedule", "cron", or "run".`)
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Scheduled airdrop failed:', error)
  process.exit(1)
})
