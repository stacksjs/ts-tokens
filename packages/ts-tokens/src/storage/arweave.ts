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
    const _base64Data = this.uint8ArrayToBase64(data)

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

/**
 * Sign data with a Solana keypair for Arweave transactions
 *
 * Uses ed25519 signing from the Solana keypair to produce a signature
 * compatible with Arweave's cross-chain signing requirements.
 * This enables Solana wallets to sign Arweave data items without
 * needing an RSA Arweave wallet.
 *
 * @param data - Raw bytes to sign
 * @param keypair - Solana keypair with secretKey (64 bytes: secret + public)
 * @returns Signature as Uint8Array (64 bytes ed25519 signature)
 */
export async function signWithSolanaKeypair(
  data: Uint8Array,
  keypair: { publicKey: Uint8Array; secretKey: Uint8Array }
): Promise<Uint8Array> {
  // ed25519 signing using Node.js crypto
  const crypto = await import('node:crypto')

  // Solana secret keys are 64 bytes: 32 bytes private + 32 bytes public
  const privateKey = keypair.secretKey.slice(0, 32)

  // Build the ed25519 private key in PKCS8 format
  // ed25519 OID prefix for PKCS8
  const pkcs8Prefix = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
    0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ])
  const pkcs8Key = new Uint8Array(pkcs8Prefix.length + privateKey.length)
  pkcs8Key.set(pkcs8Prefix, 0)
  pkcs8Key.set(privateKey, pkcs8Prefix.length)

  const keyObject = crypto.createPrivateKey({
    key: Buffer.from(pkcs8Key),
    format: 'der',
    type: 'pkcs8',
  })

  const signature = crypto.sign(null, Buffer.from(data), keyObject)
  return new Uint8Array(signature)
}

/**
 * ANS-104 DataItem structure for bundled transactions
 */
export interface DataItem {
  /** Raw data bytes */
  data: Uint8Array
  /** Arweave tags */
  tags: Array<{ name: string; value: string }>
  /** Signer public key (owner) */
  owner: Uint8Array
  /** Signature over the data item */
  signature?: Uint8Array
  /** Target address (optional) */
  target?: string
  /** Anchor value (optional) */
  anchor?: string
}

/**
 * Bundle multiple data items into ANS-104 bundle format
 *
 * ANS-104 bundles allow multiple data items to be submitted in a
 * single Arweave transaction, reducing costs and improving throughput.
 *
 * Bundle format:
 *   - 32 bytes: item count (u256 LE)
 *   - For each item: 32 bytes offset (u256 LE) + 32 bytes item ID
 *   - Concatenated serialized data items
 *
 * @param items - Array of DataItem objects to bundle
 * @returns Serialized bundle as Uint8Array
 */
export function bundleTransactions(items: DataItem[]): Uint8Array {
  const serializedItems: Uint8Array[] = items.map(item => serializeDataItem(item))

  // Header: number of items (32 bytes, little-endian u256)
  const countBytes = new Uint8Array(32)
  const countView = new DataView(countBytes.buffer)
  countView.setUint32(0, items.length, true)

  // Build offset/ID pairs
  const pairs: Uint8Array[] = []
  let currentOffset = 0
  for (let i = 0; i < serializedItems.length; i++) {
    // 32-byte offset
    const offsetBytes = new Uint8Array(32)
    const offsetView = new DataView(offsetBytes.buffer)
    offsetView.setUint32(0, serializedItems[i].length, true)

    // 32-byte ID (SHA-256 of the serialized item)
    const idBytes = new Uint8Array(32)
    // Use a simple hash of the data as placeholder ID
    for (let j = 0; j < Math.min(serializedItems[i].length, 32); j++) {
      idBytes[j] = serializedItems[i][j]
    }

    pairs.push(offsetBytes, idBytes)
    currentOffset += serializedItems[i].length
  }

  // Combine: count + pairs + items
  const headerSize = 32 + (pairs.length * 32)
  const totalSize = headerSize + serializedItems.reduce((sum, item) => sum + item.length, 0)
  const bundle = new Uint8Array(totalSize)

  let offset = 0
  bundle.set(countBytes, offset)
  offset += 32

  for (const pair of pairs) {
    bundle.set(pair, offset)
    offset += pair.length
  }

  for (const item of serializedItems) {
    bundle.set(item, offset)
    offset += item.length
  }

  return bundle
}

/**
 * Serialize a single DataItem to bytes (ANS-104 format)
 */
function serializeDataItem(item: DataItem): Uint8Array {
  const parts: Uint8Array[] = []

  // Signature type: 1 = ed25519 (2 bytes LE)
  const sigType = new Uint8Array(2)
  sigType[0] = 1
  parts.push(sigType)

  // Signature (64 bytes for ed25519, zero-filled if not provided)
  const signature = item.signature || new Uint8Array(64)
  parts.push(signature)

  // Owner (32 bytes for ed25519)
  parts.push(item.owner)

  // Target (optional): 1 byte presence flag + 32 bytes if present
  if (item.target) {
    parts.push(new Uint8Array([1]))
    const targetBytes = new Uint8Array(32)
    const encoded = new TextEncoder().encode(item.target)
    targetBytes.set(encoded.slice(0, 32))
    parts.push(targetBytes)
  } else {
    parts.push(new Uint8Array([0]))
  }

  // Anchor (optional): 1 byte presence flag + 32 bytes if present
  if (item.anchor) {
    parts.push(new Uint8Array([1]))
    const anchorBytes = new Uint8Array(32)
    const encoded = new TextEncoder().encode(item.anchor)
    anchorBytes.set(encoded.slice(0, 32))
    parts.push(anchorBytes)
  } else {
    parts.push(new Uint8Array([0]))
  }

  // Number of tags (8 bytes LE)
  const tagCount = new Uint8Array(8)
  new DataView(tagCount.buffer).setUint32(0, item.tags.length, true)
  parts.push(tagCount)

  // Number of tag bytes (8 bytes LE) — compute after serializing tags
  const serializedTags = serializeAvroTags(item.tags)
  const tagBytesLen = new Uint8Array(8)
  new DataView(tagBytesLen.buffer).setUint32(0, serializedTags.length, true)
  parts.push(tagBytesLen)

  // Serialized tags
  parts.push(serializedTags)

  // Data
  parts.push(item.data)

  // Combine all parts
  const totalLen = parts.reduce((sum, p) => sum + p.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

/**
 * Serialize tags in Avro format for ANS-104
 */
function serializeAvroTags(tags: Array<{ name: string; value: string }>): Uint8Array {
  const parts: Uint8Array[] = []
  for (const tag of tags) {
    const nameBytes = new TextEncoder().encode(tag.name)
    const valueBytes = new TextEncoder().encode(tag.value)

    // Name length (2 bytes LE) + name + value length (2 bytes LE) + value
    const nameLen = new Uint8Array(2)
    new DataView(nameLen.buffer).setUint16(0, nameBytes.length, true)
    const valueLen = new Uint8Array(2)
    new DataView(valueLen.buffer).setUint16(0, valueBytes.length, true)

    parts.push(nameLen, nameBytes, valueLen, valueBytes)
  }

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}
