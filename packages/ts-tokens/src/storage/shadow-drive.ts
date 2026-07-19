/**
 * Shadow Drive Storage Adapter
 *
 * Solana-native decentralized storage using GenesysGo Shadow Drive.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js'
import nacl from 'tweetnacl'
import { createHash } from 'node:crypto'
import type { StorageAdapter, UploadResult, UploadOptions, BatchUploadResult, TokenConfig } from '../types'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'

/**
 * Shadow Drive Program ID
 */
export const SHADOW_DRIVE_PROGRAM_ID = new PublicKey('2e1wdyNhUvE76y6yUCvah2KaviavMJYKoRun8acMRBZZ')

/**
 * SHDW Token Mint
 */
export const SHDW_TOKEN_MINT = new PublicKey('SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y')

/**
 * Default Shadow Drive upload endpoint.
 *
 * WARNING: the hosted GenesysGo service at this URL is DEFUNCT — uploads
 * against it will fail. This default is kept only for backwards
 * compatibility; you MUST point `endpoint` at a running SHDW storage node
 * (self-hosted or a community-operated one) via
 * `storage.shadowDrive.endpoint` in your config.
 */
export const DEFAULT_SHADOW_ENDPOINT = 'https://shadow-storage.genesysgo.net'

/**
 * Shadow Drive configuration
 */
export interface ShadowDriveConfig {
  storageAccount?: string
  rpcEndpoint?: string
  /**
   * SHDW node upload endpoint. The default (GenesysGo hosted service) is
   * defunct — set this to a running Shadow Drive node. See
   * DEFAULT_SHADOW_ENDPOINT for details.
   */
  endpoint: string
}

/**
 * Default Shadow Drive configuration
 */
const DEFAULT_CONFIG: ShadowDriveConfig = {
  endpoint: DEFAULT_SHADOW_ENDPOINT,
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
    options?: UploadOptions
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

    if (this.config.endpoint === DEFAULT_SHADOW_ENDPOINT) {
      console.warn(
        '[ts-tokens] WARNING: using the defunct GenesysGo Shadow Drive endpoint ' +
        `(${DEFAULT_SHADOW_ENDPOINT}). Set storage.shadowDrive.endpoint to a running SHDW node.`
      )
    }

    const wallet = loadWallet(this.tokenConfig)

    // Create form data for upload
    const formData = new FormData()
    const blob = new Blob([bytes as BlobPart], { type: contentType })
    formData.append('file', blob, fileName)
    formData.append('storageAccount', this.config.storageAccount)
    formData.append('message', 'upload')

    // Shadow Drive verifies the upload against the file's SHA-256 hash,
    // NOT the client-generated filename — sign the hash.
    const fileHash = createHash('sha256').update(bytes).digest('hex')

    // Sign the upload request
    const message = new TextEncoder().encode(`Shadow Drive Signed Message:\nStorage Account: ${this.config.storageAccount}\nUpload files with hash: ${fileHash}`)
    const signature = Buffer.from(nacl.sign.detached(message, wallet.secretKey)).toString('base64')

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
    } catch {
      return false
    }
  }

  /**
   * Estimate upload cost in lamports
   *
   * Honest answer: unavailable. Shadow Drive pricing depends on live SHDW
   * token economics that must be queried from a running node — the previous
   * implementation hardcoded a fabricated "$20/SOL" conversion, which was
   * removed rather than mislead callers.
   */
  async estimateCost(_size: number): Promise<bigint> {
    throw new Error(
      'Shadow Drive cost estimates are unavailable: pricing must be queried from a ' +
      'running SHDW node (the old hardcoded SOL/SHDW price guesses were removed as fabricated).'
    )
  }

  /**
   * Create a new storage account
   */
  async createStorageAccount(
    name: string,
    size: number, // Size in bytes
    config: TokenConfig
  ): Promise<string> {
    const wallet = loadWallet(config)
    const _connection = createConnection(config)

    // This would require the actual Shadow Drive program interaction
    // For now, throw an informative error
    throw new Error(
      'Storage account creation requires Shadow Drive SDK integration. ' +
      'Create an account at https://portal.genesysgo.net and set storageAccount in config.'
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

    const deleteMessage = new TextEncoder().encode(`Shadow Drive Signed Message:\nDelete file: ${url}`)
    const deleteSignature = Buffer.from(nacl.sign.detached(deleteMessage, wallet.secretKey)).toString('base64')

    const response = await fetch(`${this.config.endpoint}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shadow-signature': deleteSignature,
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
   * Initialize a new storage account on Shadow Drive
   *
   * Creates a storage account instruction for the Shadow Drive program.
   * The account size determines how much storage is allocated and the
   * corresponding SHDW token cost.
   *
   * @param size - Storage size in bytes
   * @param owner - Owner public key for the storage account
   * @returns TransactionInstruction for account initialization
   */
  initializeAccount(
    size: number,
    owner: PublicKey
  ): TransactionInstruction {
    // Instruction data: discriminator (8 bytes) + size (8 bytes) + name length + name
    const name = `storage-${Date.now()}`
    const nameBytes = Buffer.from(name)

    // Anchor-style discriminator for "initialize"
    const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237])

    const sizeBuffer = Buffer.alloc(8)
    sizeBuffer.writeBigUInt64LE(BigInt(size))

    const nameLenBuffer = Buffer.alloc(4)
    nameLenBuffer.writeUInt32LE(nameBytes.length)

    const data = Buffer.concat([discriminator, sizeBuffer, nameLenBuffer, nameBytes])

    // Derive storage account PDA
    const [storageAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('storage-account'), owner.toBuffer(), Buffer.from(name)],
      SHADOW_DRIVE_PROGRAM_ID
    )

    const keys = [
      { pubkey: storageAccount, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SHDW_TOKEN_MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      keys,
      programId: SHADOW_DRIVE_PROGRAM_ID,
      data,
    })
  }

  /**
   * Edit/replace a file on Shadow Drive
   *
   * @param account - Storage account address
   * @param filename - Name of the file to replace
   * @param data - New file data
   */
  async editFile(
    account: string,
    filename: string,
    data: Uint8Array | string
  ): Promise<{ url: string }> {
    if (!this.tokenConfig) {
      throw new Error('Shadow Drive requires token config. Call setTokenConfig() first.')
    }

    const wallet = loadWallet(this.tokenConfig)
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const formData = new FormData()
    const blob = new Blob([bytes as BlobPart])
    formData.append('file', blob, filename)
    formData.append('storageAccount', account)

    const editMessage = new TextEncoder().encode(`Shadow Drive Signed Message:\nStorage Account: ${account}\nEdit file: ${filename}`)
    const editSignature = Buffer.from(nacl.sign.detached(editMessage, wallet.secretKey)).toString('base64')

    const response = await fetch(`${this.config.endpoint}/edit`, {
      method: 'POST',
      headers: {
        'x-shadow-signature': editSignature,
        'x-shadow-signer': wallet.publicKey.toBase58(),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Shadow Drive edit failed: ${error}`)
    }

    const result = await response.json()
    return { url: result.finalized_location || result.location }
  }

  /**
   * Add storage capacity to an existing account
   *
   * @param account - Storage account address
   * @param additionalBytes - Number of bytes to add
   * @returns TransactionInstruction
   */
  addStorage(account: PublicKey, additionalBytes: number): TransactionInstruction {
    const discriminator = Buffer.from([223, 50, 224, 227, 151, 8, 115, 106])
    const sizeBuffer = Buffer.alloc(8)
    sizeBuffer.writeBigUInt64LE(BigInt(additionalBytes))

    const data = Buffer.concat([discriminator, sizeBuffer])

    const keys = [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: SHDW_TOKEN_MINT, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      keys,
      programId: SHADOW_DRIVE_PROGRAM_ID,
      data,
    })
  }

  /**
   * Reduce storage capacity of an existing account
   *
   * @param account - Storage account address
   * @param bytesToReduce - Number of bytes to reduce
   * @returns TransactionInstruction
   */
  reduceStorage(account: PublicKey, bytesToReduce: number): TransactionInstruction {
    const discriminator = Buffer.from([51, 57, 225, 47, 182, 146, 137, 166])
    const sizeBuffer = Buffer.alloc(8)
    sizeBuffer.writeBigUInt64LE(BigInt(bytesToReduce))

    const data = Buffer.concat([discriminator, sizeBuffer])

    const keys = [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: SHDW_TOKEN_MINT, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      keys,
      programId: SHADOW_DRIVE_PROGRAM_ID,
      data,
    })
  }

  /**
   * Claim staked SOL from a storage account
   *
   * When storage is reduced, the corresponding staked SOL can be claimed
   * back to the owner's wallet.
   *
   * @param account - Storage account address
   * @returns TransactionInstruction
   */
  claimStake(account: PublicKey): TransactionInstruction {
    const discriminator = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34])
    const data = Buffer.from(discriminator)

    const keys = [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: SHDW_TOKEN_MINT, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      keys,
      programId: SHADOW_DRIVE_PROGRAM_ID,
      data,
    })
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

// ============================================
// SHDW Token Payment Utilities
// ============================================

/**
 * Estimate SHDW token cost for storage
 *
 * @deprecated UNAVAILABLE — the previous implementation hardcoded fabricated
 * pricing ("~5 SHDW per GB", "~$0.05/GB/year", "1 SHDW ~= $0.01"). Real SHDW
 * pricing must be obtained from a running Shadow Drive node or live market
 * data. This function now throws rather than return made-up numbers.
 *
 * @param sizeInBytes - Storage size in bytes
 */
export function estimateShdwCost(sizeInBytes: number): bigint {
  throw new Error(
    `estimateShdwCost(${sizeInBytes}) is unavailable: SHDW pricing is no longer hardcoded ` +
    '(previous figures were fabricated). Query a running SHDW node for current storage pricing.'
  )
}

/**
 * Create a SHDW token transfer instruction for storage payment
 *
 * @param from - Payer's token account
 * @param to - Shadow Drive treasury token account
 * @param owner - Payer wallet (signer)
 * @param amount - SHDW token amount in base units
 * @returns TransactionInstruction for the token transfer
 */
export function createShdwPaymentInstruction(
  from: PublicKey,
  to: PublicKey,
  owner: PublicKey,
  amount: bigint
): TransactionInstruction {
  // SPL Token transfer instruction (program ID: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

  const data = Buffer.alloc(9)
  data.writeUInt8(3, 0) // Transfer instruction discriminator
  data.writeBigUInt64LE(amount, 1)

  return new TransactionInstruction({
    keys: [
      { pubkey: from, isSigner: false, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data,
  })
}

// ============================================
// Storage Account Management Utilities
// ============================================

/**
 * Derive the storage account PDA for a given owner and name
 *
 * @param owner - Owner public key
 * @param name - Storage account name
 * @returns [PDA address, bump seed]
 */
export function findStorageAccountPda(
  owner: PublicKey,
  name: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('storage-account'), owner.toBuffer(), Buffer.from(name)],
    SHADOW_DRIVE_PROGRAM_ID
  )
}

/**
 * Parse storage account data from on-chain account info
 *
 * WARNING: This binary layout is UNVERIFIED — it was reverse-guessed, never
 * checked against the actual Shadow Drive program's account schema. It may
 * silently produce wrong values. To avoid mis-parsing, this function fails
 * gracefully: it returns null when the buffer is too short to match the
 * assumed layout (66 bytes) or when the initialized flag is not set, rather
 * than returning garbage. Verify the layout against the Shadow Drive program
 * source before relying on the returned fields.
 *
 * @param data - Raw account data buffer
 * @returns Parsed storage account info, or null if the buffer doesn't match
 *          the assumed (unverified) layout
 */
export function parseStorageAccount(data: Buffer): {
  isInitialized: boolean
  owner: PublicKey
  totalStorage: bigint
  usedStorage: bigint
  immutable: boolean
  creationTime: bigint
} | null {
  // Assumed layout: discriminator(8) + isInitialized(1) + owner(32) +
  // totalStorage(8) + usedStorage(8) + immutable(1) + creationTime(8) = 66 bytes
  const ASSUMED_MIN_LENGTH = 66
  if (data.length < ASSUMED_MIN_LENGTH) {
    return null
  }

  let offset = 8 // Skip discriminator

  const isInitialized = data.readUInt8(offset) === 1
  offset += 1
  if (!isInitialized) {
    return null
  }

  const owner = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  const totalStorage = data.readBigUInt64LE(offset)
  offset += 8

  const usedStorage = data.readBigUInt64LE(offset)
  offset += 8

  const immutable = data.readUInt8(offset) === 1
  offset += 1

  const creationTime = data.readBigInt64LE(offset)

  return {
    isInitialized,
    owner,
    totalStorage,
    usedStorage,
    immutable,
    creationTime,
  }
}
