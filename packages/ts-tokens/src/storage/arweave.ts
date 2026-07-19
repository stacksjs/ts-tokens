/**
 * Arweave Storage Adapter
 *
 * Uploads go through an Irys (formerly Bundlr) node using spec-compliant
 * ANS-104 data items signed with the Solana ed25519 keypair (tweetnacl).
 * Reads go directly against an Arweave gateway. No external SDKs.
 *
 * Credentials: a Solana keypair is required for uploads (used to sign data
 * items and as the Irys account address). Resolution order mirrors
 * `loadWallet()`: wallet.keypairPath, TOKENS_KEYPAIR env var, or
 * ~/.config/solana/id.json. The Irys account must also be funded — see the
 * actionable error thrown on insufficient balance.
 *
 * Environment variables:
 *   IRYS_NODE_URL   - override the Irys node (default https://node1.irys.xyz)
 *   TOKENS_KEYPAIR  - Solana keypair (JSON byte array or base58 secret key)
 */

import { createHash } from 'node:crypto'
import nacl from 'tweetnacl'
import type { StorageAdapter, UploadResult, UploadOptions, UploadProgress, BatchUploadResult } from '../types'
import { encode as encodeBase58, decode as decodeBase58 } from '../utils/base58'

/**
 * Arweave configuration
 */
export interface ArweaveConfig {
  /** Arweave gateway used for reads. @default 'https://arweave.net' */
  gateway: string
  /**
   * Irys (formerly Bundlr) node used for uploads.
   * Overridable via adapter options or the IRYS_NODE_URL env var.
   * @default 'https://node1.irys.xyz'
   */
  irysNode: string
  timeout: number
}

/**
 * Default Arweave configuration
 */
const DEFAULT_CONFIG: ArweaveConfig = {
  gateway: 'https://arweave.net',
  irysNode: 'https://node1.irys.xyz',
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
  private wallet: DataItemSigner | null = null

  constructor(config: Partial<ArweaveConfig> = {}) {
    const envNode = typeof process !== 'undefined' ? process.env?.IRYS_NODE_URL : undefined
    this.config = {
      ...DEFAULT_CONFIG,
      ...(envNode ? { irysNode: envNode } : {}),
      ...config,
    }
  }

  /**
   * Set the wallet used to sign ANS-104 data items.
   *
   * Accepts a Solana-style keypair: `publicKey` may be raw 32 bytes, a base58
   * string, or a web3.js PublicKey-like object; `secretKey` is the 64-byte
   * Solana secret key (or a 32-byte ed25519 seed).
   */
  setWallet(wallet: DataItemSigner): void {
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
   * Submit data to Arweave via an Irys node.
   *
   * Flow: build a signed ANS-104 ed25519 data item, check the node price for
   * the item's byte count, verify the Irys account balance, then POST the
   * data item. Large payloads are fine — Irys accepts data items of any
   * practical size in a single POST, so no chunked path is needed.
   *
   * @returns The data item ID (which is also the Arweave transaction ID once seeded)
   */
  private async submitData(
    data: Uint8Array,
    tags: Array<{ name: string; value: string }>,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error(
        'Arweave uploads require a Solana keypair to sign ANS-104 data items. ' +
        'Set wallet.keypairPath in tokens.config.ts, set the TOKENS_KEYPAIR environment variable, ' +
        'create ~/.config/solana/id.json, or call setWallet() on the adapter.'
      )
    }

    if (onProgress) {
      onProgress({ loaded: 0, total: data.length, percentage: 0 })
    }

    const { id, raw, owner } = createSignedDataItem(data, tags, this.wallet)
    const node = this.config.irysNode.replace(/\/+$/, '')
    const address = encodeBase58(owner)

    // 1. Price for this many bytes, in winston.
    let price: bigint
    try {
      const res = await fetch(`${node}/price/arweave/${raw.length}`, {
        signal: AbortSignal.timeout(this.config.timeout),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      price = BigInt((await res.text()).trim())
    } catch (err) {
      throw new Error(
        `Failed to get upload price from Irys node ${node}: ` +
        `${err instanceof Error ? err.message : String(err)}`
      )
    }

    // 2. Balance of the signer's Irys account.
    let balance: bigint
    try {
      const res = await fetch(`${node}/account/balance/arweave?address=${address}`, {
        signal: AbortSignal.timeout(this.config.timeout),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      const body = await res.json() as { balance?: string | number }
      balance = BigInt(body.balance ?? '0')
    } catch (err) {
      throw new Error(
        `Failed to check Irys balance for ${address} on ${node}: ` +
        `${err instanceof Error ? err.message : String(err)}`
      )
    }

    if (balance < price) {
      throw new Error(
        `Insufficient Irys balance on ${node}: the upload costs ${price} winston but the ` +
        `account for ${address} holds ${balance} winston. Fund the Irys account first ` +
        `(e.g. \`npx irys fund ${price - balance} -n node1 -c arweave\` or the Irys dashboard), then retry.`
      )
    }

    // 3. Submit the data item.
    let response: Response
    try {
      response = await fetch(`${node}/tx/arweave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: raw as unknown as BodyInit,
        signal: AbortSignal.timeout(this.config.timeout),
      })
    } catch (err) {
      throw new Error(
        `Irys upload request failed (${node}/tx/arweave): ` +
        `${err instanceof Error ? err.message : String(err)}`
      )
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Irys node rejected the data item (HTTP ${response.status}): ${text}`)
    }

    if (onProgress) {
      onProgress({ loaded: data.length, total: data.length, percentage: 100 })
    }
    return id
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
  /** Signer public key (owner) — 32 bytes for ed25519 items */
  owner: Uint8Array
  /** ed25519 signature over the data item (64 bytes) */
  signature?: Uint8Array
  /** Target address (optional) */
  target?: string
  /** Anchor value (optional) */
  anchor?: string
}

/**
 * ANS-104 signature type for ed25519 (Solana) data items.
 * Per the ANS-104 spec this is 2 (64-byte signature, 32-byte owner);
 * type 1 is RSA (4096-bit Arweave wallets) and was used here incorrectly.
 */
export const ANS104_SIG_TYPE_ED25519 = 2

/**
 * Minimal signer shape for ANS-104 data items: a Solana ed25519 keypair.
 * `publicKey` may be raw 32 bytes, a base58 string, or a web3.js
 * PublicKey-like object; `secretKey` is the 64-byte Solana secret key
 * (or a 32-byte ed25519 seed).
 */
export interface DataItemSigner {
  publicKey: string | Uint8Array | { toBytes(): Uint8Array }
  secretKey: Uint8Array
}

/**
 * Resolve a signer public key to raw 32 bytes.
 */
function resolvePublicKeyBytes(
  publicKey: DataItemSigner['publicKey']
): Uint8Array {
  if (typeof publicKey === 'string') {
    return decodeBase58(publicKey)
  }
  if (publicKey instanceof Uint8Array) {
    return publicKey
  }
  return publicKey.toBytes()
}

/**
 * Resolve a signer secret key to the 64-byte ed25519 secret key tweetnacl
 * expects. A 32-byte input is treated as a seed.
 */
function resolveSecretKey(secretKey: Uint8Array): Uint8Array {
  if (secretKey.length === 64) {
    return secretKey
  }
  if (secretKey.length === 32) {
    return nacl.sign.keyPair.fromSeed(secretKey).secretKey
  }
  throw new Error(
    `Invalid secret key length: expected 64 bytes (Solana secret key) or 32 bytes (seed), got ${secretKey.length}`
  )
}

/**
 * base64url-encode bytes (no padding) per RFC 4648 §5 — the encoding used
 * for ANS-104 data item IDs.
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(data).digest())
}

function sha384(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha384').update(data).digest())
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s)

/**
 * Arweave deep-hash (SHA-384 based). This is the message that ANS-104
 * data item signatures are computed over.
 */
function deepHashBlob(data: Uint8Array): Uint8Array {
  const tag = concatBytes(utf8('blob'), utf8(String(data.length)))
  return sha384(concatBytes(sha384(tag), data))
}

function deepHashList(chunks: Uint8Array[]): Uint8Array {
  const tag = concatBytes(utf8('list'), utf8(String(chunks.length)))
  let acc = sha384(tag)
  for (const chunk of chunks) {
    acc = sha384(concatBytes(acc, deepHashBlob(chunk)))
  }
  return acc
}

/**
 * Encode a non-negative Avro long as zigzag varint.
 * (Avro longs are zigzag-encoded; for n >= 0, zigzag(n) = 2n.)
 */
function writeAvroLong(n: number, out: number[]): void {
  let v = n * 2
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80)
    v = Math.floor(v / 128)
  }
  out.push(v & 0x7f)
}

/**
 * Serialize tags per the ANS-104 Avro schema:
 *
 *   { "type": "array", "items": { "type": "record", "name": "Tag",
 *     "fields": [ { "name": "name", "type": "string" },
 *                 { "name": "value", "type": "string" } ] } }
 *
 * Avro binary encoding of an array: a zigzag-varint block count, the items,
 * then a zero terminator (single byte 0x00 encodes the empty array).
 * Strings are a zigzag-varint byte length followed by UTF-8 bytes.
 */
export function serializeAvroTags(
  tags: Array<{ name: string; value: string }>
): Uint8Array {
  if (tags.length === 0) {
    return new Uint8Array([0])
  }

  const out: number[] = []
  writeAvroLong(tags.length, out)
  for (const tag of tags) {
    const nameBytes = utf8(tag.name)
    writeAvroLong(nameBytes.length, out)
    out.push(...nameBytes)
    const valueBytes = utf8(tag.value)
    writeAvroLong(valueBytes.length, out)
    out.push(...valueBytes)
  }
  out.push(0) // array terminator
  return new Uint8Array(out)
}

/**
 * ANS-104 data item ID: base64url(sha256(signature)).
 */
export function getDataItemId(signature: Uint8Array): string {
  return base64UrlEncode(sha256(signature))
}

/**
 * Build and sign an ANS-104 ed25519 data item.
 *
 * The signing message is the Arweave deep-hash of:
 *   ["dataitem", "1", "2", owner, target, anchor, avroTags, data]
 * matching the reference implementation (arbundles) used by Irys nodes.
 *
 * @param data - Raw payload bytes
 * @param tags - Arweave tags (empty tags are valid)
 * @param signer - Solana ed25519 keypair
 * @returns The item ID, the serialized item, the signature, and the owner bytes
 */
export function createSignedDataItem(
  data: Uint8Array,
  tags: Array<{ name: string; value: string }>,
  signer: DataItemSigner
): { id: string; raw: Uint8Array; signature: Uint8Array; owner: Uint8Array } {
  const owner = resolvePublicKeyBytes(signer.publicKey)
  if (owner.length !== 32) {
    throw new Error(`Invalid ed25519 public key length: expected 32 bytes, got ${owner.length}`)
  }
  const secretKey = resolveSecretKey(signer.secretKey)

  // Sanity check: the secret key must match the declared public key.
  const derived = nacl.sign.keyPair.fromSecretKey(secretKey).publicKey
  if (!derived.every((b, i) => b === owner[i])) {
    throw new Error('Signer public key does not match the provided secret key')
  }

  const tagsBytes = serializeAvroTags(tags)
  const message = deepHashList([
    utf8('dataitem'),
    utf8('1'),
    utf8(String(ANS104_SIG_TYPE_ED25519)),
    owner,
    new Uint8Array(0), // target (absent)
    new Uint8Array(0), // anchor (absent)
    tagsBytes,
    data,
  ])

  const signature = nacl.sign.detached(message, secretKey)
  const raw = serializeDataItem({ data, tags, owner, signature })
  return { id: getDataItemId(signature), raw, signature, owner }
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
 * The item ID is the raw 32-byte sha256 of the item's signature
 * (base64url-encoded it becomes the textual item ID), per the ANS-104
 * spec — NOT a prefix of the serialized item.
 *
 * @param items - Array of signed DataItem objects to bundle
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
  for (let i = 0; i < serializedItems.length; i++) {
    // 32-byte offset (byte length of the serialized item)
    const offsetBytes = new Uint8Array(32)
    const offsetView = new DataView(offsetBytes.buffer)
    offsetView.setUint32(0, serializedItems[i].length, true)

    // 32-byte ID = sha256(signature). Unsigned items have no valid ID.
    const signature = items[i].signature
    if (!signature || signature.length !== 64) {
      throw new Error(
        'bundleTransactions requires signed data items: item ' +
        `${i} is missing its 64-byte ed25519 signature`
      )
    }
    const idBytes = sha256(signature)

    pairs.push(offsetBytes, idBytes)
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
 * Serialize a single DataItem to bytes (ANS-104 format, ed25519 / signature type 2)
 */
export function serializeDataItem(item: DataItem): Uint8Array {
  const parts: Uint8Array[] = []

  // Signature type: 2 = ed25519 (2 bytes LE)
  const sigType = new Uint8Array(2)
  new DataView(sigType.buffer).setUint16(0, ANS104_SIG_TYPE_ED25519, true)
  parts.push(sigType)

  // Signature (64 bytes for ed25519, zero-filled if not provided)
  const signature = item.signature || new Uint8Array(64)
  parts.push(signature)

  // Owner (32 bytes for ed25519)
  if (item.owner.length !== 32) {
    throw new Error(`Invalid owner length: expected 32 bytes, got ${item.owner.length}`)
  }
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

  // Number of tag bytes (8 bytes LE)
  const serializedTags = serializeAvroTags(item.tags)
  const tagBytesLen = new Uint8Array(8)
  new DataView(tagBytesLen.buffer).setUint32(0, serializedTags.length, true)
  parts.push(tagBytesLen)

  // Avro-serialized tags
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
