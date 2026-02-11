/**
 * Storage Adapters
 *
 * Unified storage interface for Arweave, IPFS, and Shadow Drive.
 */

export * from './arweave'
export * from './ipfs'
export * from './shadow-drive'

import type { StorageAdapter, StorageProvider, TokenConfig } from '../types'
import { ArweaveStorageAdapter, createArweaveAdapter } from './arweave'
import { IPFSStorageAdapter, createIPFSAdapter } from './ipfs'
import { ShadowDriveStorageAdapter, createShadowDriveAdapter } from './shadow-drive'

/**
 * Storage adapter registry
 */
const adapters = new Map<StorageProvider, StorageAdapter>()

/**
 * Get or create a storage adapter for a provider.
 *
 * Returns a cached adapter instance if one has already been created
 * for the given provider. Supports Arweave, IPFS, Shadow Drive, and
 * a local filesystem adapter for development.
 *
 * @param provider - Storage provider name ('arweave' | 'ipfs' | 'shadow-drive' | 'local')
 * @param config - Optional ts-tokens configuration with storage settings
 * @returns A StorageAdapter instance for the specified provider
 *
 * @example
 * ```ts
 * const adapter = getStorageAdapter('arweave', config)
 * const result = await adapter.uploadFile('./image.png')
 * console.log('URL:', result.url)
 * ```
 */
export function getStorageAdapter(
  provider: StorageProvider,
  config?: TokenConfig
): StorageAdapter {
  // Check cache
  const cached = adapters.get(provider)
  if (cached) {
    return cached
  }

  // Create new adapter
  let adapter: StorageAdapter

  switch (provider) {
    case 'arweave':
      adapter = createArweaveAdapter(config?.storage?.arweave)
      break
    case 'ipfs':
      adapter = createIPFSAdapter(config?.storage?.ipfs)
      break
    case 'shadow-drive':
      const shadowAdapter = createShadowDriveAdapter(config?.storage?.shadowDrive)
      if (config) {
        shadowAdapter.setTokenConfig(config)
      }
      adapter = shadowAdapter
      break
    case 'local':
      // Local storage for development
      adapter = createLocalAdapter(config?.storage?.local)
      break
    default:
      throw new Error(`Unknown storage provider: ${provider}`)
  }

  // Cache and return
  adapters.set(provider, adapter)
  return adapter
}

/**
 * Clear all cached storage adapter instances.
 *
 * Call this when you need to reconfigure adapters (e.g., after changing storage settings).
 */
export function clearStorageAdapters(): void {
  adapters.clear()
}

/**
 * Local storage adapter for development
 */
class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local' as const
  private baseDir: string
  private baseUrl: string

  constructor(config?: { baseDir?: string; baseUrl?: string }) {
    this.baseDir = config?.baseDir || './storage'
    this.baseUrl = config?.baseUrl || 'http://localhost:3000/storage'
  }

  async upload(data: Uint8Array | string, options?: { contentType?: string }): Promise<{
    id: string
    url: string
    provider: 'local'
    size: number
    contentType: string
  }> {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const crypto = await import('node:crypto')

    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const contentType = options?.contentType || 'application/octet-stream'

    // Generate unique ID
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16)
    const ext = this.getExtension(contentType)
    const id = `${hash}${ext}`

    // Ensure directory exists
    const fullDir = path.resolve(this.baseDir)
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true })
    }

    // Write file
    const filePath = path.join(fullDir, id)
    fs.writeFileSync(filePath, bytes)

    return {
      id,
      url: `${this.baseUrl}/${id}`,
      provider: 'local',
      size: bytes.length,
      contentType,
    }
  }

  async uploadFile(filePath: string, options?: { contentType?: string }): Promise<{
    id: string
    url: string
    provider: 'local'
    size: number
    contentType: string
  }> {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = options?.contentType || this.getContentType(ext)

    return this.upload(data, { contentType })
  }

  async uploadBatch(files: Array<{ path: string; name?: string }>): Promise<{
    results: Array<{ id: string; url: string; provider: 'local'; size: number; contentType: string }>
    failed: Array<{ file: string; error: string }>
  }> {
    const results: Array<{ id: string; url: string; provider: 'local'; size: number; contentType: string }> = []
    const failed: Array<{ file: string; error: string }> = []

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.path)
        results.push(result)
      } catch (error) {
        failed.push({
          file: file.path,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { results, failed }
  }

  async uploadJson(data: Record<string, unknown>): Promise<{
    id: string
    url: string
    provider: 'local'
    size: number
    contentType: string
  }> {
    const json = JSON.stringify(data, null, 2)
    return this.upload(json, { contentType: 'application/json' })
  }

  async download(id: string): Promise<Uint8Array> {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const filePath = path.join(path.resolve(this.baseDir), id)
    const data = fs.readFileSync(filePath)
    return new Uint8Array(data)
  }

  getUrl(id: string): string {
    return `${this.baseUrl}/${id}`
  }

  async exists(id: string): Promise<boolean> {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const filePath = path.join(path.resolve(this.baseDir), id)
    return fs.existsSync(filePath)
  }

  async estimateCost(): Promise<bigint> {
    return 0n // Local storage is free
  }

  private getExtension(contentType: string): string {
    const types: Record<string, string> = {
      'application/json': '.json',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'audio/mpeg': '.mp3',
      'text/plain': '.txt',
      'text/html': '.html',
    }
    return types[contentType] || ''
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.txt': 'text/plain',
      '.html': 'text/html',
    }
    return types[ext] || 'application/octet-stream'
  }
}

/**
 * Create a local storage adapter
 */
export function createLocalAdapter(config?: { baseDir?: string; baseUrl?: string }): LocalStorageAdapter {
  return new LocalStorageAdapter(config)
}

/**
 * Storage driver factory — auto-selects the storage adapter based on config
 *
 * Reads `config.storageProvider` (or `config.storage?.provider`) and returns
 * the corresponding adapter, with driver-specific options forwarded.
 *
 * @param config - Token configuration
 * @returns Configured storage adapter
 */
export function createStorageDriver(config: TokenConfig): StorageAdapter {
  const provider: StorageProvider =
    config.storage?.provider || config.storageProvider || 'arweave'

  return getStorageAdapter(provider, config)
}

/**
 * Storage fallback chain — tries providers in order until one succeeds
 *
 * Default order: arweave -> ipfs -> shadow-drive -> local
 *
 * @param data - Data to upload
 * @param config - Token configuration
 * @param options - Upload options
 * @param providers - Custom provider order (optional)
 * @returns Upload result from the first successful provider
 */
export async function uploadWithFallback(
  data: Uint8Array | string,
  config: TokenConfig,
  options?: { contentType?: string },
  providers: StorageProvider[] = ['arweave', 'ipfs', 'shadow-drive', 'local']
): Promise<{
  id: string
  url: string
  provider: StorageProvider
  size: number
  contentType: string
}> {
  const errors: Array<{ provider: StorageProvider; error: string }> = []

  for (const provider of providers) {
    try {
      const adapter = getStorageAdapter(provider, config)
      const result = await adapter.upload(data, options)
      return {
        id: result.id,
        url: result.url,
        provider,
        size: result.size,
        contentType: result.contentType,
      }
    } catch (error) {
      errors.push({
        provider,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  throw new Error(
    `All storage providers failed:\n${errors.map(e => `  ${e.provider}: ${e.error}`).join('\n')}`
  )
}

// Re-export adapters
export {
  ArweaveStorageAdapter,
  IPFSStorageAdapter,
  ShadowDriveStorageAdapter,
  LocalStorageAdapter,
  createArweaveAdapter,
  createIPFSAdapter,
  createShadowDriveAdapter,
}
