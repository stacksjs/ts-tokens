/**
 * IPFS Storage Adapter
 *
 * Direct IPFS HTTP API implementation without external SDKs.
 */

import type { StorageAdapter, UploadResult, UploadOptions, UploadProgress, BatchUploadResult } from '../types'

/**
 * IPFS configuration
 */
export interface IPFSConfig {
  gateway: string
  apiEndpoint?: string
  pinningService?: 'pinata' | 'nft.storage' | 'web3.storage' | 'infura'
  pinningApiKey?: string
  pinningSecret?: string
  timeout: number
}

/**
 * Default IPFS configuration
 */
const DEFAULT_CONFIG: IPFSConfig = {
  gateway: 'https://ipfs.io',
  timeout: 30000,
}

/**
 * IPFS Storage Adapter
 *
 * Implements IPFS uploads via pinning services or local node.
 */
export class IPFSStorageAdapter implements StorageAdapter {
  readonly name = 'ipfs' as const
  private config: IPFSConfig

  constructor(config: Partial<IPFSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Upload data to IPFS
   */
  async upload(
    data: Uint8Array | string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const contentType = options?.contentType || 'application/octet-stream'

    let cid: string

    if (this.config.pinningService) {
      cid = await this.uploadViaPinningService(bytes, contentType, options)
    } else if (this.config.apiEndpoint) {
      cid = await this.uploadViaLocalNode(bytes, options)
    } else {
      throw new Error(
        'IPFS upload requires either a pinning service or local node API endpoint. ' +
        'Set pinningService and pinningApiKey, or set apiEndpoint.'
      )
    }

    return {
      id: cid,
      url: this.getUrl(cid),
      provider: 'ipfs',
      size: bytes.length,
      contentType,
    }
  }

  /**
   * Upload via pinning service
   */
  private async uploadViaPinningService(
    data: Uint8Array,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    switch (this.config.pinningService) {
      case 'pinata':
        return this.uploadToPinata(data, contentType, options)
      case 'nft.storage':
        return this.uploadToNFTStorage(data, contentType, options)
      case 'web3.storage':
        return this.uploadToWeb3Storage(data, contentType, options)
      case 'infura':
        return this.uploadToInfura(data, contentType, options)
      default:
        throw new Error(`Unknown pinning service: ${this.config.pinningService}`)
    }
  }

  /**
   * Upload to Pinata
   */
  private async uploadToPinata(
    data: Uint8Array,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    if (!this.config.pinningApiKey) {
      throw new Error('Pinata requires pinningApiKey (JWT token)')
    }

    const formData = new FormData()
    const blob = new Blob([data], { type: contentType })
    formData.append('file', blob)

    if (options?.tags) {
      const metadata = {
        keyvalues: Object.fromEntries(options.tags.map(t => [t.name, t.value])),
      }
      formData.append('pinataMetadata', JSON.stringify(metadata))
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.pinningApiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Pinata upload failed: ${error}`)
    }

    const result = await response.json()
    return result.IpfsHash
  }

  /**
   * Upload to NFT.Storage
   */
  private async uploadToNFTStorage(
    data: Uint8Array,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    if (!this.config.pinningApiKey) {
      throw new Error('NFT.Storage requires pinningApiKey')
    }

    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.pinningApiKey}`,
        'Content-Type': contentType,
      },
      body: data,
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`NFT.Storage upload failed: ${error}`)
    }

    const result = await response.json()
    return result.value.cid
  }

  /**
   * Upload to Web3.Storage
   */
  private async uploadToWeb3Storage(
    data: Uint8Array,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    if (!this.config.pinningApiKey) {
      throw new Error('Web3.Storage requires pinningApiKey')
    }

    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.pinningApiKey}`,
        'X-Content-Type': contentType,
      },
      body: data,
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Web3.Storage upload failed: ${error}`)
    }

    const result = await response.json()
    return result.cid
  }

  /**
   * Upload to Infura IPFS
   */
  private async uploadToInfura(
    data: Uint8Array,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    if (!this.config.pinningApiKey || !this.config.pinningSecret) {
      throw new Error('Infura requires both pinningApiKey (project ID) and pinningSecret')
    }

    const auth = btoa(`${this.config.pinningApiKey}:${this.config.pinningSecret}`)

    const formData = new FormData()
    const blob = new Blob([data], { type: contentType })
    formData.append('file', blob)

    const response = await fetch('https://ipfs.infura.io:5001/api/v0/add', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: formData,
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Infura upload failed: ${error}`)
    }

    const result = await response.json()
    return result.Hash
  }

  /**
   * Upload via local IPFS node
   */
  private async uploadViaLocalNode(
    data: Uint8Array,
    options?: UploadOptions
  ): Promise<string> {
    const formData = new FormData()
    const blob = new Blob([data])
    formData.append('file', blob)

    const response = await fetch(`${this.config.apiEndpoint}/api/v0/add`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`IPFS node upload failed: ${error}`)
    }

    const result = await response.json()
    return result.Hash
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
    files: Array<{ path: string; name?: string }>,
    options?: UploadOptions
  ): Promise<BatchUploadResult> {
    const results: UploadResult[] = []
    const failed: Array<{ file: string; error: string }> = []

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.path, options)
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
   * Download content from IPFS
   */
  async download(cid: string): Promise<Uint8Array> {
    const url = `${this.config.gateway}/ipfs/${cid}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      throw new Error(`Failed to download from IPFS: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * Get public URL for content
   */
  getUrl(cid: string): string {
    return `${this.config.gateway}/ipfs/${cid}`
  }

  /**
   * Check if content exists
   */
  async exists(cid: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.gateway}/ipfs/${cid}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Estimate upload cost (IPFS is generally free, pinning may have costs)
   */
  async estimateCost(size: number): Promise<bigint> {
    // IPFS uploads are generally free, pinning services may charge
    return 0n
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
      '.txt': 'text/plain',
    }
    return types[ext] || 'application/octet-stream'
  }
}

/**
 * Create an IPFS storage adapter
 */
export function createIPFSAdapter(config?: Partial<IPFSConfig>): IPFSStorageAdapter {
  return new IPFSStorageAdapter(config)
}
