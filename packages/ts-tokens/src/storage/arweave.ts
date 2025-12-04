/**
 * Arweave Storage Adapter
 *
 * Direct Arweave HTTP API implementation without external SDKs.
 */

import type { StorageAdapter, UploadResult, UploadOptions, UploadProgress, BatchUploadResult } from '../types'

/**
 * Arweave configuration
 */
export interface ArweaveConfig {
  gateway: string
  timeout: number
}

/**
 * Default Arweave configuration
 */
const DEFAULT_CONFIG: ArweaveConfig = {
  gateway: 'https://arweave.net',
  timeout: 30000,
}

/**
 * Arweave transaction structure
 */
interface ArweaveTransaction {
  id: string
  last_tx: string
  owner: string
  tags: Array<{ name: string; value: string }>
  target: string
  quantity: string
  data: string
  data_size: string
  data_root: string
  reward: string
  signature: string
}

/**
 * Arweave Storage Adapter
 *
 * Implements direct Arweave HTTP API calls without external dependencies.
 */
export class ArweaveStorageAdapter implements StorageAdapter {
  readonly name = 'arweave' as const
  private config: ArweaveConfig
  private wallet: { publicKey: string; secretKey: Uint8Array } | null = null

  constructor(config: Partial<ArweaveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Set the wallet for signing transactions
   */
  setWallet(wallet: { publicKey: string; secretKey: Uint8Array }): void {
    this.wallet = wallet
  }

  /**
   * Upload data to Arweave
   */
  async upload(
    data: Uint8Array | string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const contentType = options?.contentType || 'application/octet-stream'

    // Get upload price
    const cost = await this.estimateCost(bytes.length)

    // Build tags
    const tags = [
      { name: 'Content-Type', value: contentType },
      ...(options?.tags || []),
    ]

    // For now, we'll use a simplified upload that works with Arweave gateways
    // In production, this would need proper transaction signing
    const txId = await this.submitData(bytes, tags, options?.onProgress)

    return {
      id: txId,
      url: this.getUrl(txId),
      provider: 'arweave',
      size: bytes.length,
      contentType,
      cost,
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

    // Detect content type from extension
    const contentType = options?.contentType || this.getContentType(ext)

    return this.upload(data, { ...options, contentType })
  }

  /**
   * Upload multiple files
   */
  async uploadBatch(
    files: Array<{ path: string; name?: string }>,
    options?: UploadOptions
  ): Promise<BatchUploadResult> {
    const results: UploadResult[] = []
    const failed: Array<{ file: string; error: string }> = []
    let totalCost = 0n

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.path, options)
        results.push(result)
        if (result.cost) {
          totalCost += result.cost
        }
      } catch (error) {
        failed.push({
          file: file.path,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      results,
      totalCost,
      failed,
    }
  }

  /**
   * Upload JSON data
   */
  async uploadJson(
    data: Record<string, unknown>,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const json = JSON.stringify(data)
    return this.upload(json, {
      ...options,
      contentType: 'application/json',
    })
  }

  /**
   * Download content from Arweave
   */
  async download(id: string): Promise<Uint8Array> {
    const url = `${this.config.gateway}/${id}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      throw new Error(`Failed to download from Arweave: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * Get public URL for content
   */
  getUrl(id: string): string {
    return `${this.config.gateway}/${id}`
  }

  /**
   * Check if content exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const url = `${this.config.gateway}/tx/${id}/status`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Estimate upload cost in winston (Arweave's smallest unit)
   */
  async estimateCost(size: number): Promise<bigint> {
    try {
      const url = `${this.config.gateway}/price/${size}`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        throw new Error(`Failed to get price: ${response.statusText}`)
      }

      const price = await response.text()
      return BigInt(price)
    } catch {
      // Return a rough estimate if API fails
      // ~0.0001 AR per KB
      return BigInt(Math.ceil(size / 1024) * 100000000)
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(id: string): Promise<{
    confirmed: boolean
    blockHeight?: number
    blockHash?: string
  }> {
    try {
      const url = `${this.config.gateway}/tx/${id}/status`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        return { confirmed: false }
      }

      const status = await response.json()
      return {
        confirmed: true,
        blockHeight: status.block_height,
        blockHash: status.block_indep_hash,
      }
    } catch {
      return { confirmed: false }
    }
  }

  /**
   * Submit data to Arweave
   * Note: This is a simplified implementation. Full implementation would require
   * proper transaction signing with RSA keys or using Bundlr/Irys for Solana wallets.
   */
  private async submitData(
    data: Uint8Array,
    tags: Array<{ name: string; value: string }>,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    // For large files, use chunked upload
    if (data.length > 100 * 1024) {
      return this.submitChunkedData(data, tags, onProgress)
    }

    // Convert data to base64
    const base64Data = this.uint8ArrayToBase64(data)

    // Report progress
    if (onProgress) {
      onProgress({ loaded: 0, total: data.length, percentage: 0 })
    }

    // In a real implementation, we would:
    // 1. Create a transaction with proper format
    // 2. Sign it with the wallet
    // 3. Submit to the network
    // For now, we'll throw an error indicating this needs wallet setup
    if (!this.wallet) {
      throw new Error(
        'Arweave upload requires a wallet. Use setWallet() or consider using Bundlr/Irys for Solana wallet support.'
      )
    }

    // Placeholder for actual transaction submission
    // This would need proper Arweave transaction signing
    throw new Error(
      'Direct Arweave uploads not yet implemented. Use uploadViaGateway() or Bundlr/Irys integration.'
    )
  }

  /**
   * Submit chunked data for large files
   */
  private async submitChunkedData(
    data: Uint8Array,
    tags: Array<{ name: string; value: string }>,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const CHUNK_SIZE = 256 * 1024 // 256KB chunks
    const chunks: Uint8Array[] = []

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      chunks.push(data.slice(i, i + CHUNK_SIZE))
    }

    // Report initial progress
    if (onProgress) {
      onProgress({ loaded: 0, total: data.length, percentage: 0 })
    }

    // In a real implementation, each chunk would be uploaded separately
    // and then combined into a final transaction
    throw new Error(
      'Chunked Arweave uploads not yet implemented. Consider using Bundlr/Irys for large files.'
    )
  }

  /**
   * Convert Uint8Array to base64
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
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
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.txt': 'text/plain',
    }
    return types[ext] || 'application/octet-stream'
  }
}

/**
 * Create an Arweave storage adapter
 */
export function createArweaveAdapter(config?: Partial<ArweaveConfig>): ArweaveStorageAdapter {
  return new ArweaveStorageAdapter(config)
}
