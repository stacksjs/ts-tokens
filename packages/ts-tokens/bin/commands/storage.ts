import { upload, uploadAssets, uploadMetadata, storageBalance, storageFund } from '../../src/cli/commands/storage'

export function register(cli: any): void {
  cli
    .command('upload <path>', 'Upload file to storage')
    .option('--provider <provider>', 'Storage provider (arweave/ipfs/shadow)', 'arweave')
    .option('--type <type>', 'Content type (image/json/etc)')
    .action(async (filePath: string, options: { provider?: string; type?: string }) => {
      await upload(filePath, options)
    })

  cli
    .command('upload-assets <directory>', 'Bulk upload assets')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .option('--output <path>', 'Output manifest path')
    .action(async (directory: string, options: { provider?: string; output?: string }) => {
      await uploadAssets(directory, options)
    })

  cli
    .command('upload-metadata <path>', 'Upload metadata JSON')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .action(async (filePath: string, options: { provider?: string }) => {
      await uploadMetadata(filePath, options)
    })

  cli
    .command('storage:balance', 'Check storage balance')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .action(async (options: { provider?: string }) => {
      await storageBalance(options)
    })

  cli
    .command('storage:fund <amount>', 'Fund storage account')
    .option('--provider <provider>', 'Storage provider', 'arweave')
    .action(async (amount: string, options: { provider?: string }) => {
      await storageFund(amount, options)
    })
}
