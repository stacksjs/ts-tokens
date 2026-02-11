import { getConfig } from '../../src/config'

export function register(cli: any): void {
  cli
    .command('batch:metadata <json-file>', 'Batch update metadata from JSON file')
    .option('--batch-size <size>', 'Items per batch', '5')
    .option('--delay <ms>', 'Delay between batches (ms)', '500')
    .option('--alt', 'Use Address Lookup Tables')
    .action(async (jsonFile: string, options: { batchSize?: string; delay?: string; alt?: boolean }) => {
      const fs = await import('node:fs')
      if (!fs.existsSync(jsonFile)) {
        console.error(`File not found: ${jsonFile}`)
        process.exit(1)
      }

      const config = await getConfig()
      const { batchMetadataUpdate } = await import('../../src/batch/metadata')
      const items = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'))

      console.log(`Batch updating metadata for ${items.length} items...`)

      const result = await batchMetadataUpdate({
        items,
        batchSize: parseInt(options.batchSize || '5'),
        delayMs: parseInt(options.delay || '500'),
        useLookupTable: options.alt,
        onProgress: (completed, total, mint) => {
          console.log(`  [${completed}/${total}]${mint ? ` ${mint}` : ''}`)
        },
      }, config)

      console.log(`\n\u2713 Batch metadata update complete`)
      console.log(`  Successful: ${result.successful}`)
      console.log(`  Failed: ${result.failed}`)
      if (result.errors.length > 0) {
        console.log('  Errors:')
        for (const err of result.errors) {
          console.log(`    ${err.mint}: ${err.error}`)
        }
      }
    })

  cli
    .command('batch:create-alt', 'Create a new Address Lookup Table')
    .action(async () => {
      const config = await getConfig()
      const { createLookupTable } = await import('../../src/batch/lookup-table')

      console.log('Creating Address Lookup Table...')
      const result = await createLookupTable(config)
      console.log(`\n\u2713 Lookup Table created`)
      console.log(`  Address: ${result.address}`)
      console.log(`  Signature: ${result.signature}`)
    })

  cli
    .command('batch:extend-alt <table> <addresses...>', 'Extend ALT with addresses')
    .action(async (table: string, addresses: string[]) => {
      const config = await getConfig()
      const { extendLookupTable } = await import('../../src/batch/lookup-table')

      console.log(`Extending ALT ${table} with ${addresses.length} addresses...`)
      const signatures = await extendLookupTable(table, addresses, config)
      console.log(`\n\u2713 Lookup Table extended`)
      console.log(`  Signatures: ${signatures.join(', ')}`)
    })
}
