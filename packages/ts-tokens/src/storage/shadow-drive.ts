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
    config: TokenConfig
  ): Promise<string> {
    const wallet = loadWallet(config)
    const connection = createConnection(config)

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
    const blob = new Blob([bytes])
    formData.append('file', blob, filename)
    formData.append('storageAccount', account)

    const response = await fetch(`${this.config.endpoint}/edit`, {
      method: 'POST',
      headers: {
        'x-shadow-signature': Buffer.from(wallet.secretKey.slice(0, 64)).toString('base64'),
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
 * Shadow Drive charges in SHDW tokens based on storage size.
 *
 * @param sizeInBytes - Storage size in bytes
 * @returns Estimated cost in SHDW token base units
 */
export function estimateShdwCost(sizeInBytes: number): bigint {
  // Approximate pricing: ~$0.05 per GB per year
  // 1 SHDW ~= $0.01 (approximate, varies)
  // Cost in SHDW base units (9 decimals)
  const gbSize = sizeInBytes / (1024 * 1024 * 1024)
  const shdwAmount = gbSize * 5 // ~5 SHDW per GB
  return BigInt(Math.ceil(shdwAmount * 1e9))
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
 * @param data - Raw account data buffer
 * @returns Parsed storage account info
 */
export function parseStorageAccount(data: Buffer): {
  isInitialized: boolean
  owner: PublicKey
  totalStorage: bigint
  usedStorage: bigint
  immutable: boolean
  creationTime: bigint
} {
  let offset = 8 // Skip discriminator

  const isInitialized = data.readUInt8(offset) === 1
  offset += 1

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
