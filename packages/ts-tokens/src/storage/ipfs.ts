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
    const blob = new Blob([data as BlobPart], { type: contentType })
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
      body: data as BodyInit,
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
      body: data as BodyInit,
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
    const blob = new Blob([data as BlobPart], { type: contentType })
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
    const blob = new Blob([data as BlobPart])
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

/**
 * Pin content on an IPFS node
 *
 * Sends a POST request to /api/v0/pin/add to pin content by CID.
 *
 * @param cid - Content identifier to pin
 * @param config - IPFS configuration (requires apiEndpoint)
 * @returns Pin result with the pinned CID
 */
export async function pinContent(
  cid: string,
  config: Partial<IPFSConfig>
): Promise<{ cid: string; pinned: boolean }> {
  const endpoint = config.apiEndpoint
  if (!endpoint) {
    throw new Error('IPFS pinContent requires apiEndpoint in config')
  }

  const timeout = config.timeout || 30000
  const response = await fetch(`${endpoint}/api/v0/pin/add?arg=${encodeURIComponent(cid)}`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeout),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`IPFS pin/add failed: ${error}`)
  }

  const result = await response.json()
  return { cid: result.Pins?.[0] || cid, pinned: true }
}

/**
 * Unpin content from an IPFS node
 *
 * Sends a POST request to /api/v0/pin/rm to remove a pin.
 *
 * @param cid - Content identifier to unpin
 * @param config - IPFS configuration (requires apiEndpoint)
 * @returns Unpin result
 */
export async function unpinContent(
  cid: string,
  config: Partial<IPFSConfig>
): Promise<{ cid: string; unpinned: boolean }> {
  const endpoint = config.apiEndpoint
  if (!endpoint) {
    throw new Error('IPFS unpinContent requires apiEndpoint in config')
  }

  const timeout = config.timeout || 30000
  const response = await fetch(`${endpoint}/api/v0/pin/rm?arg=${encodeURIComponent(cid)}`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeout),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`IPFS pin/rm failed: ${error}`)
  }

  const result = await response.json()
  return { cid: result.Pins?.[0] || cid, unpinned: true }
}

/**
 * Convert a CIDv0 (Qm...) to CIDv1 (bafy...)
 *
 * CIDv0 is a bare multihash (sha2-256, base58btc).
 * CIDv1 format: <multibase><version><codec><multihash>
 * This produces a base32-encoded CIDv1 with dag-pb codec.
 *
 * @param cidV0 - CIDv0 string starting with "Qm"
 * @returns CIDv1 string in base32lower encoding
 */
export function toCIDv1(cidV0: string): string {
  if (!cidV0.startsWith('Qm')) {
    // Already v1 or invalid
    return cidV0
  }

  // Decode the base58 CIDv0 to get the raw multihash
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const alphabetMap = new Map<string, number>()
  for (let i = 0; i < ALPHABET.length; i++) {
    alphabetMap.set(ALPHABET[i], i)
  }

  // Decode base58
  let zeros = 0
  for (let i = 0; i < cidV0.length && cidV0[i] === '1'; i++) zeros++
  const size = Math.ceil(cidV0.length * 733 / 1000) + 1
  const b256 = new Uint8Array(size)
  let length = 0
  for (let i = zeros; i < cidV0.length; i++) {
    const value = alphabetMap.get(cidV0[i])
    if (value === undefined) throw new Error(`Invalid Base58 character: ${cidV0[i]}`)
    let carry = value
    let j = 0
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 58 * b256[k]
      b256[k] = carry % 256
      carry = Math.floor(carry / 256)
    }
    length = j
  }
  let idx = size - length
  while (idx < size && b256[idx] === 0) idx++
  const multihash = new Uint8Array(zeros + (size - idx))
  let ji = zeros
  while (idx < size) multihash[ji++] = b256[idx++]

  // CIDv1: version(1) + codec(dag-pb=0x70) + multihash
  const cidV1Bytes = new Uint8Array(2 + multihash.length)
  cidV1Bytes[0] = 0x01 // version 1
  cidV1Bytes[1] = 0x70 // dag-pb codec
  cidV1Bytes.set(multihash, 2)

  // Encode as base32lower with 'b' multibase prefix
  const base32Chars = 'abcdefghijklmnopqrstuvwxyz234567'
  let bits = 0
  let value = 0
  let base32 = ''
  for (const byte of cidV1Bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      base32 += base32Chars[(value >> bits) & 0x1f]
    }
  }
  if (bits > 0) {
    base32 += base32Chars[(value << (5 - bits)) & 0x1f]
  }

  return 'b' + base32
}

/**
 * Convert a CIDv1 back to CIDv0 format
 *
 * Only works for CIDv1 with dag-pb codec and sha2-256 multihash.
 *
 * @param cidV1 - CIDv1 string (base32 with 'b' prefix)
 * @returns CIDv0 string starting with "Qm"
 */
export function toCIDv0(cidV1: string): string {
  if (cidV1.startsWith('Qm')) {
    // Already v0
    return cidV1
  }

  if (!cidV1.startsWith('b')) {
    throw new Error('toCIDv0 only supports base32lower CIDv1 (starting with "b")')
  }

  // Decode base32lower
  const base32Chars = 'abcdefghijklmnopqrstuvwxyz234567'
  const base32Map = new Map<string, number>()
  for (let i = 0; i < base32Chars.length; i++) {
    base32Map.set(base32Chars[i], i)
  }

  const encoded = cidV1.slice(1) // remove 'b' prefix
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of encoded) {
    const v = base32Map.get(char)
    if (v === undefined) throw new Error(`Invalid base32 character: ${char}`)
    value = (value << 5) | v
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 0xff)
    }
  }

  const cidBytes = new Uint8Array(bytes)

  // Verify: version must be 1, codec must be dag-pb (0x70)
  if (cidBytes[0] !== 0x01) {
    throw new Error('Not a CIDv1')
  }
  if (cidBytes[1] !== 0x70) {
    throw new Error('toCIDv0 only supports dag-pb codec (0x70)')
  }

  // Extract multihash (everything after version + codec)
  const multihash = cidBytes.slice(2)

  // Encode multihash as base58
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let leadingZeros = 0
  for (let i = 0; i < multihash.length && multihash[i] === 0; i++) leadingZeros++

  const b58Size = Math.ceil(multihash.length * 138 / 100) + 1
  const b58 = new Uint8Array(b58Size)
  let b58Len = 0
  for (let i = leadingZeros; i < multihash.length; i++) {
    let carry = multihash[i]
    let j = 0
    for (let k = b58Size - 1; (carry !== 0 || j < b58Len) && k >= 0; k--, j++) {
      carry += 256 * b58[k]
      b58[k] = carry % 58
      carry = Math.floor(carry / 58)
    }
    b58Len = j
  }
  let si = b58Size - b58Len
  while (si < b58Size && b58[si] === 0) si++

  let result = '1'.repeat(leadingZeros)
  for (; si < b58Size; si++) {
    result += ALPHABET[b58[si]]
  }

  return result
}

/**
 * Upload multiple files as an IPFS directory
 *
 * Uploads files using the IPFS /api/v0/add endpoint with wrap-with-directory,
 * producing a single directory CID containing all files.
 *
 * @param files - Array of file objects with name and data
 * @param config - IPFS configuration (requires apiEndpoint)
 * @returns Directory CID and individual file CIDs
 */
export async function uploadDirectory(
  files: Array<{ name: string; data: Uint8Array; contentType?: string }>,
  config: Partial<IPFSConfig>
): Promise<{
  directoryCid: string
  files: Array<{ name: string; cid: string }>
}> {
  const endpoint = config.apiEndpoint
  if (!endpoint) {
    throw new Error('IPFS uploadDirectory requires apiEndpoint in config')
  }

  const timeout = config.timeout || 60000
  const formData = new FormData()

  for (const file of files) {
    const blob = new Blob([file.data as BlobPart], { type: file.contentType || 'application/octet-stream' })
    formData.append('file', blob, file.name)
  }

  const response = await fetch(
    `${endpoint}/api/v0/add?wrap-with-directory=true&pin=true`,
    {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(timeout),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`IPFS directory upload failed: ${error}`)
  }

  // IPFS /api/v0/add returns newline-delimited JSON objects
  const text = await response.text()
  const lines = text.trim().split('\n').map(line => JSON.parse(line))

  // Last entry with empty name is the directory wrapper
  const fileResults: Array<{ name: string; cid: string }> = []
  let directoryCid = ''

  for (const line of lines) {
    if (line.Name === '') {
      directoryCid = line.Hash
    } else {
      fileResults.push({ name: line.Name, cid: line.Hash })
    }
  }

  if (!directoryCid && lines.length > 0) {
    directoryCid = lines[lines.length - 1].Hash
  }

  return { directoryCid, files: fileResults }
}
