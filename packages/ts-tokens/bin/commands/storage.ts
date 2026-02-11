import { getConfig } from '../../src/config'

export function register(cli: any): void {
  cli
    .command('upload <path>', 'Upload file to storage')
    .option('--provider <provider>', 'Storage provider (arweave/ipfs/shadow)', 'arweave')
    .option('--type <type>', 'Content type (image/json/etc)')
    .action(async (filePath: string, options: { provider?: string; type?: string }) => {
      const config = await getConfig()
      const fs = await import('node:fs')
      const pathModule = await import('node:path')

      try {
        const resolved = pathModule.resolve(filePath)
        if (!fs.existsSync(resolved)) {
          console.error(`File not found: ${resolved}`)
          process.exit(1)
        }

        const provider = options.provider || config.storageProvider || 'arweave'
        const stats = fs.statSync(resolved)

        console.log(`Uploading ${pathModule.basename(resolved)}...`)
        console.log(`  Provider: ${provider}`)
        console.log(`  Size: ${stats.size} bytes`)
        if (options.type) {
          console.log(`  Type: ${options.type}`)
        }

        const { getStorageAdapter } = await import('../../src/storage')
        const adapter = getStorageAdapter(provider as any, config)
        const result = await adapter.uploadFile(resolved, {
          contentType: options.type,
        })

        console.log(`\n\u2713 Upload complete!`)
        console.log(`  URL: ${result.url}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('upload-assets <directory>', 'Bulk upload assets')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .option('--output <path>', 'Output manifest path')
    .action(async (directory: string, options: { provider?: string; output?: string }) => {
      const config = await getConfig()
      const fs = await import('node:fs')
      const pathModule = await import('node:path')

      try {
        const resolved = pathModule.resolve(directory)
        if (!fs.existsSync(resolved)) {
          console.error(`Directory not found: ${resolved}`)
          process.exit(1)
        }

        const files = fs.readdirSync(resolved)
          .filter((f: string) => !f.startsWith('.'))
          .map((f: string) => ({
            path: pathModule.join(resolved, f),
            name: f,
          }))

        console.log(`Uploading ${files.length} files from ${resolved}...`)
        console.log(`  Provider: ${options.provider || 'arweave'}`)

        const { getStorageAdapter } = await import('../../src/storage')
        const adapter = getStorageAdapter((options.provider || 'arweave') as any, config)
        const result = await adapter.uploadBatch(files)

        console.log(`\n\u2713 Upload complete!`)
        console.log(`  Files uploaded: ${result.results.length}`)
        if (result.failed.length > 0) {
          console.log(`  Failed: ${result.failed.length}`)
          for (const f of result.failed) {
            console.log(`    - ${f.file}: ${f.error}`)
          }
        }

        if (options.output) {
          fs.writeFileSync(options.output, JSON.stringify(result, null, 2))
          console.log(`  Manifest saved to: ${options.output}`)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('upload-metadata <path>', 'Upload metadata JSON')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .action(async (filePath: string, options: { provider?: string }) => {
      const config = await getConfig()
      const fs = await import('node:fs')
      const pathModule = await import('node:path')

      try {
        const resolved = pathModule.resolve(filePath)
        if (!fs.existsSync(resolved)) {
          console.error(`File not found: ${resolved}`)
          process.exit(1)
        }

        const content = fs.readFileSync(resolved, 'utf-8')
        // Validate JSON
        JSON.parse(content)

        const provider = options.provider || config.storageProvider || 'arweave'
        console.log(`Uploading metadata from ${pathModule.basename(resolved)}...`)
        console.log(`  Provider: ${provider}`)

        const { getStorageAdapter } = await import('../../src/storage')
        const adapter = getStorageAdapter(provider as any, config)
        const result = await adapter.upload(content, {
          contentType: 'application/json',
        })

        console.log(`\n\u2713 Metadata uploaded!`)
        console.log(`  URL: ${result.url}`)
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error('Error: Invalid JSON file')
        } else {
          console.error('Error:', error instanceof Error ? error.message : error)
        }
        process.exit(1)
      }
    })

  cli
    .command('storage:balance', 'Check storage balance')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .action(async (options: { provider?: string }) => {
      const config = await getConfig()
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')

      try {
        const provider = options.provider || config.storageProvider || 'arweave'
        const wallet = getPublicKey(config)

        console.log(`Storage Balance:`)
        console.log(`  Provider: ${provider}`)
        console.log(`  Wallet: ${wallet}`)
        console.log('\nNote: Balance checking depends on the specific storage provider.')
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('storage:fund <amount>', 'Fund storage account')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .action(async (amount: string, options: { provider?: string }) => {
      const config = await getConfig()
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')

      try {
        const provider = options.provider || config.storageProvider || 'arweave'
        const wallet = getPublicKey(config)

        console.log(`Fund Storage Account:`)
        console.log(`  Provider: ${provider}`)
        console.log(`  Amount: ${amount}`)
        console.log(`  Wallet: ${wallet}`)
        console.log('\nNote: Funding requires a transaction to the storage provider.')
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
