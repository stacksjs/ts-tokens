/** Storage CLI command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function upload(filePath: string, options: { provider?: string; type?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const fs = await import('node:fs')
    const pathModule = await import('node:path')

    const resolved = pathModule.resolve(filePath)
    if (!fs.existsSync(resolved)) {
      error(`File not found: ${resolved}`)
      process.exit(1)
    }

    const provider = options.provider || config.storageProvider || 'arweave'
    const stats = fs.statSync(resolved)

    header('Upload File')
    keyValue('File', pathModule.basename(resolved))
    keyValue('Provider', provider)
    keyValue('Size', `${stats.size} bytes`)
    if (options.type) {
      keyValue('Type', options.type)
    }

    const { getStorageAdapter } = await import('../../storage')
    const adapter = getStorageAdapter(provider as any, config)

    const result = await withSpinner(
      `Uploading ${pathModule.basename(resolved)}`,
      () => adapter.uploadFile(resolved, { contentType: options.type }),
      'Upload complete'
    )

    keyValue('URL', result.url)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function uploadAssets(directory: string, options: { provider?: string; output?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const fs = await import('node:fs')
    const pathModule = await import('node:path')

    const resolved = pathModule.resolve(directory)
    if (!fs.existsSync(resolved)) {
      error(`Directory not found: ${resolved}`)
      process.exit(1)
    }

    const provider = options.provider || 'arweave'
    const files = fs.readdirSync(resolved)
      .filter((f: string) => !f.startsWith('.'))
      .map((f: string) => ({
        path: pathModule.join(resolved, f),
        name: f,
      }))

    header('Bulk Upload')
    keyValue('Directory', resolved)
    keyValue('Files', String(files.length))
    keyValue('Provider', provider)

    const { getStorageAdapter } = await import('../../storage')
    const adapter = getStorageAdapter(provider as any, config)

    const result = await withSpinner(
      `Uploading ${files.length} files`,
      () => adapter.uploadBatch(files),
      'Upload complete'
    )

    keyValue('Uploaded', String(result.results.length))

    if (result.failed.length > 0) {
      keyValue('Failed', String(result.failed.length))
      for (const f of result.failed) {
        error(`${f.file}: ${f.error}`)
      }
    }

    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2))
      success(`Manifest saved to ${options.output}`)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function uploadMetadata(filePath: string, options: { provider?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const fs = await import('node:fs')
    const pathModule = await import('node:path')

    const resolved = pathModule.resolve(filePath)
    if (!fs.existsSync(resolved)) {
      error(`File not found: ${resolved}`)
      process.exit(1)
    }

    const content = fs.readFileSync(resolved, 'utf-8')

    try {
      JSON.parse(content)
    } catch {
      error('Invalid JSON file')
      process.exit(1)
    }

    const provider = options.provider || config.storageProvider || 'arweave'

    header('Upload Metadata')
    keyValue('File', pathModule.basename(resolved))
    keyValue('Provider', provider)

    const { getStorageAdapter } = await import('../../storage')
    const adapter = getStorageAdapter(provider as any, config)

    const result = await withSpinner(
      `Uploading metadata from ${pathModule.basename(resolved)}`,
      () => adapter.upload(content, { contentType: 'application/json' }),
      'Metadata uploaded'
    )

    keyValue('URL', result.url)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function storageBalance(options: { provider?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const { getPublicKey } = await import('../../drivers/solana/wallet')

    const provider = options.provider || config.storageProvider || 'arweave'
    const wallet = getPublicKey(config)

    header('Storage Balance')
    keyValue('Provider', provider)
    keyValue('Wallet', wallet)
    info('Balance checking depends on the specific storage provider.')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function storageFund(amount: string, options: { provider?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const { getPublicKey } = await import('../../drivers/solana/wallet')

    const provider = options.provider || config.storageProvider || 'arweave'
    const wallet = getPublicKey(config)

    header('Fund Storage Account')
    keyValue('Provider', provider)
    keyValue('Amount', amount)
    keyValue('Wallet', wallet)
    info('Funding requires a transaction to the storage provider.')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
