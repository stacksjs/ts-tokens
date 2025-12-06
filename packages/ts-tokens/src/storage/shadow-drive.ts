/**
 * Shadow Drive Storage Adapter
 *
 * Solana-native decentralized storage using GenesysGo Shadow Drive.
 */

import type { BatchUploadResult, StorageAdapter, TokenConfig, UploadOptions, UploadResult } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'

/**
 * Shadow Drive configuration
 */
export interface ShadowDriveConfig {
  storageAccount?: string
  rpcEndpoint?: string
  endpoint: string
}

/**
 * Default Shadow Drive configuration
 */
const DEFAULT_CONFIG: ShadowDriveConfig = {
  endpoint: 'https://shadow-storage.genesysgo.net',
}

/**
 * Shadow Drive Storage Adapter
 */
export class ShadowDriveStorageAdapter implements StorageAdapter {
  readonly name = 'shadow-drive' as const
  private config: ShadowDriveConfig
  private tokenConfig: TokenConfig | null = null

  constructor(config: Partial<ShadowDriveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Set token configuration for wallet access
   */
  setTokenConfig(config: TokenConfig): void {
    this.tokenConfig = config
  }

  /**
   * Upload data to Shadow Drive
   */
  async upload(
    data: Uint8Array | string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    if (!this.config.storageAccount) {
      throw new Error('Shadow Drive requires a storage account. Set storageAccount in config.')
    }

    if (!this.tokenConfig) {
      throw new Error('Shadow Drive requires token config. Call setTokenConfig() first.')
    }

    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const contentType = options?.contentType || 'application/octet-stream'
    const fileName = `file_${Date.now()}`

    const wallet = loadWallet(this.tokenConfig)

    // Create form data for upload
    const formData = new FormData()
    const blob = new Blob([bytes], { type: contentType })
    formData.append('file', blob, fileName)
    formData.append('storageAccount', this.config.storageAccount)
    formData.append('message', 'upload')

    // Sign the upload request
    const message = new TextEncoder().encode(`Shadow Drive Upload: ${fileName}`)
    // Note: Actual signing would require tweetnacl or similar
    const signature = Buffer.from(wallet.secretKey.slice(0, 64)).toString('base64')

    const response = await fetch(`${this.config.endpoint}/upload`, {
      method: 'POST',
      headers: {
        'x-shadow-signature': signature,
        'x-shadow-signer': wallet.publicKey.toBase58(),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Shadow Drive upload failed: ${error}`)
    }

    const result = await response.json()

    return {
      id: result.finalized_location || result.location,
      url: result.finalized_location || result.location,
      provider: 'shadow-drive',
      size: bytes.length,
      contentType,
    }
  }

  /**
   * Upload a file from path
   */
  async uploadFile(path: string, options?: UploadOptions): Promise<UploadResult> {
    const fs = await import('node:fs')
    const nodePath = await import('node:path')

    const data = fs.readFileSync(path)
    const ext = nodePath.extname(path).toLowerCase()
    const contentType = options?.contentType || this.getContentType(ext)

    return this.upload(data, { ...options, contentType })
  }

  /**
   * Upload multiple files
   */
  async uploadBatch(
    files: Array<{ path: string, name?: string }>,
    options?: UploadOptions,
  ): Promise<BatchUploadResult> {
    const results: UploadResult[] = []
    const failed: Array<{ file: string, error: string }> = []

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.path, options)
        results.push(result)
      }
      catch (error) {
        failed.push({
          file: file.path,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { results, failed }
  }

  /**
   * Upload JSON data
   */
  async uploadJson(
    data: Record<string, unknown>,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const json = JSON.stringify(data)
    return this.upload(json, {
      ...options,
      contentType: 'application/json',
    })
  }

  /**
   * Download content from Shadow Drive
   */
  async download(url: string): Promise<Uint8Array> {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download from Shadow Drive: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * Get public URL for content
   */
  getUrl(id: string): string {
    // Shadow Drive URLs are already full URLs
    if (id.startsWith('http')) {
      return id
    }
    return `${this.config.endpoint}/${this.config.storageAccount}/${id}`
  }

  /**
   * Check if content exists
   */
  async exists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    }
    catch {
      return false
    }
  }

  /**
   * Estimate upload cost in lamports
   */
  async estimateCost(size: number): Promise<bigint> {
    // Shadow Drive pricing: ~$0.05 per GB per year
    // Convert to approximate lamports
    const gbSize = size / (1024 * 1024 * 1024)
    const usdCost = gbSize * 0.05
    // Rough conversion: 1 SOL = ~$20, 1 SOL = 1e9 lamports
    const lamports = Math.ceil((usdCost / 20) * 1e9)
    return BigInt(lamports)
  }

  /**
   * Create a new storage account
   */
  async createStorageAccount(
    name: string,
    size: number, // Size in bytes
    config: TokenConfig,
  ): Promise<string> {
    const wallet = loadWallet(config)
    const connection = createConnection(config)

    // This would require the actual Shadow Drive program interaction
    // For now, throw an informative error
    throw new Error(
      'Storage account creation requires Shadow Drive SDK integration. '
      + 'Create an account at https://portal.genesysgo.net and set storageAccount in config.',
    )
  }

  /**
   * Delete a file from Shadow Drive
   */
  async deleteFile(url: string): Promise<void> {
    if (!this.tokenConfig) {
      throw new Error('Shadow Drive requires token config. Call setTokenConfig() first.')
    }

    const wallet = loadWallet(this.tokenConfig)

    const response = await fetch(`${this.config.endpoint}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shadow-signature': Buffer.from(wallet.secretKey.slice(0, 64)).toString('base64'),
        'x-shadow-signer': wallet.publicKey.toBase58(),
      },
      body: JSON.stringify({
        storageAccount: this.config.storageAccount,
        url,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Shadow Drive delete failed: ${error}`)
    }
  }

  /**
   * Get content type from file extension
   */
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
    }
    return types[ext] || 'application/octet-stream'
  }
}

/**
 * Create a Shadow Drive storage adapter
 */
export function createShadowDriveAdapter(config?: Partial<ShadowDriveConfig>): ShadowDriveStorageAdapter {
  return new ShadowDriveStorageAdapter(config)
}
