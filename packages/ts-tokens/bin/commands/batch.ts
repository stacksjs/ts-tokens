import {
  batchRetry, batchStatus, batchMetadata, batchCreateAlt, batchExtendAlt,
} from '../../src/cli/commands/batch'

export function register(cli: any): void {
  cli
    .command('batch:retry <recovery-file>', 'Retry failed items from recovery state')
    .action(async (recoveryFile: string) => {
      await batchRetry(recoveryFile)
    })

  cli
    .command('batch:status <recovery-file>', 'Show batch operation status')
    .action(async (recoveryFile: string) => {
      await batchStatus(recoveryFile)
    })

  cli
    .command('batch:metadata <json-file>', 'Batch update metadata from JSON file')
    .option('--batch-size <size>', 'Items per batch', '5')
    .option('--delay <ms>', 'Delay between batches (ms)', '500')
    .option('--alt', 'Use Address Lookup Tables')
    .action(async (jsonFile: string, options: { batchSize?: string; delay?: string; alt?: boolean }) => {
      await batchMetadata(jsonFile, options)
    })

  cli
    .command('batch:create-alt', 'Create a new Address Lookup Table')
    .action(async () => {
      await batchCreateAlt()
    })

  cli
    .command('batch:extend-alt <table> <addresses...>', 'Extend ALT with addresses')
    .action(async (table: string, addresses: string[]) => {
      await batchExtendAlt(table, addresses)
    })
}
