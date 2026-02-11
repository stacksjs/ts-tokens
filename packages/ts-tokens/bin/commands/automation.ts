import {
  automationSchedule, automationJobs, automationCancel, automationRun,
  automationCron, automationCronList, automationCronRemove, automationMintSchedule,
} from '../../src/cli/commands/automation'

export function register(cli: any): void {
  cli
    .command('automation:schedule <action-type>', 'Schedule a future transaction')
    .option('--at <iso-date>', 'When to execute (ISO 8601)')
    .option('--mint <address>', 'Token mint address')
    .option('--to <address>', 'Recipient address')
    .option('--amount <amount>', 'Amount')
    .option('--name <name>', 'Job name')
    .action(async (actionType: string, options: any) => {
      await automationSchedule(actionType, options)
    })

  cli
    .command('automation:jobs', 'List scheduled jobs')
    .option('--status <status>', 'Filter by status')
    .action(async (options: { status?: string }) => {
      await automationJobs(options)
    })

  cli
    .command('automation:cancel <job-id>', 'Cancel a scheduled job')
    .action(async (jobId: string) => {
      await automationCancel(jobId)
    })

  cli
    .command('automation:run', 'Process all due scheduled jobs (one-shot)')
    .action(async () => {
      await automationRun()
    })

  cli
    .command('automation:cron <action-type>', 'Create a recurring cron job')
    .option('--schedule <cron>', 'Cron expression (e.g., "0 */6 * * *")')
    .option('--mint <address>', 'Token mint address')
    .option('--to <address>', 'Recipient address')
    .option('--amount <amount>', 'Amount')
    .option('--name <name>', 'Job name')
    .option('--max-runs <n>', 'Maximum number of runs')
    .action(async (actionType: string, options: any) => {
      await automationCron(actionType, options)
    })

  cli
    .command('automation:cron-list', 'List cron jobs')
    .action(async () => {
      await automationCronList()
    })

  cli
    .command('automation:cron-remove <id>', 'Remove a cron job')
    .action(async (id: string) => {
      await automationCronRemove(id)
    })

  cli
    .command('automation:mint-schedule <mint>', 'Set mint schedule')
    .option('--start <iso-date>', 'Minting start time (ISO 8601)')
    .option('--end <iso-date>', 'Minting end time (ISO 8601)')
    .option('--max-supply <amount>', 'Maximum supply cap')
    .option('--price <sol>', 'Price per mint in SOL lamports')
    .action(async (mint: string, options: any) => {
      await automationMintSchedule(mint, options)
    })
}
