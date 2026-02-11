/**
 * Token-2022 Embedded Metadata
 *
 * Create, read, and update embedded Token Metadata extension (no Metaplex needed).
 */

import { PublicKey } from '@solana/web3.js'
import type { Connection, TransactionInstruction } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'

/**
 * Embedded metadata for a token
 */
export interface EmbeddedMetadata {
  name: string
  symbol: string
  uri: string
  additionalFields?: Array<[string, string]>
}

// Token Metadata extension instruction discriminators
const TOKEN_METADATA_INITIALIZE = Buffer.from([210, 225, 30, 162, 88, 184, 238, 125])
const TOKEN_METADATA_UPDATE_FIELD = Buffer.from([221, 233, 49, 45, 181, 202, 220, 200])

/**
 * Build a serialized string for metadata instruction
 */
function packString(value: string): Buffer {
  const encoded = Buffer.from(value, 'utf-8')
  const buf = Buffer.alloc(4 + encoded.length)
  buf.writeUInt32LE(encoded.length, 0)
  encoded.copy(buf, 4)
  return buf
}

/**
 * Create instruction to initialize token metadata on a Token-2022 mint
 */
function createInitializeTokenMetadataInstruction(
  mint: PublicKey,
  updateAuthority: PublicKey,
  mintAuthority: PublicKey,
  name: string,
  symbol: string,
  uri: string
): TransactionInstruction {
  const data = Buffer.concat([
    TOKEN_METADATA_INITIALIZE,
    packString(name),
    packString(symbol),
    packString(uri),
  ])

  return {
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: updateAuthority, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  }
}

/**
 * Create instruction to update a metadata field
 */
function createUpdateTokenMetadataFieldInstruction(
  mint: PublicKey,
  updateAuthority: PublicKey,
  field: string,
  value: string
): TransactionInstruction {
  const data = Buffer.concat([
    TOKEN_METADATA_UPDATE_FIELD,
    packString(field),
    packString(value),
  ])

  return {
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: updateAuthority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  }
}

/**
 * Set embedded metadata on a Token-2022 mint
 */
export async function setEmbeddedMetadata(
  mint: string,
  metadata: EmbeddedMetadata,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(mint)

  const instructions: TransactionInstruction[] = [
    createInitializeTokenMetadataInstruction(
      mintPubkey,
      payer.publicKey,
      payer.publicKey,
      metadata.name,
      metadata.symbol,
      metadata.uri
    ),
  ]

  // Add additional fields
  if (metadata.additionalFields) {
    for (const [key, value] of metadata.additionalFields) {
      instructions.push(
        createUpdateTokenMetadataFieldInstruction(
          mintPubkey,
          payer.publicKey,
          key,
          value
        )
      )
    }
  }

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}

/**
 * Update a single metadata field on a Token-2022 mint
 */
export async function updateEmbeddedMetadataField(
  mint: string,
  field: string,
  value: string,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(mint)

  const instruction = createUpdateTokenMetadataFieldInstruction(
    mintPubkey,
    payer.publicKey,
    field,
    value
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}

/**
 * Read embedded metadata from a Token-2022 mint account
 */
export async function getEmbeddedMetadata(
  mint: string,
  config: TokenConfig
): Promise<EmbeddedMetadata | null> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  try {
    const accountInfo = await connection.getAccountInfo(mintPubkey)
    if (!accountInfo || !accountInfo.data) return null

    // Token metadata extension starts after the base mint data
    // This is a simplified parser; full implementation would walk the TLV structure
    const data = accountInfo.data

    // Look for the metadata extension in the account data
    // The extension data follows the base mint layout (82 bytes for Token-2022)
    if (data.length <= 166) return null // No extensions present

    // Simplified: try to parse as JSON-like structure
    // Real implementation would use proper TLV parsing
    const extensionData = data.subarray(166)
    return parseMetadataExtension(extensionData)
  } catch {
    return null
  }
}

/**
 * Parse metadata extension from raw account data
 */
function parseMetadataExtension(data: Buffer): EmbeddedMetadata | null {
  try {
    let offset = 0

    // Skip extension type and length headers
    // Look for string patterns in the data
    const readString = (): string => {
      if (offset + 4 > data.length) return ''
      const len = data.readUInt32LE(offset)
      offset += 4
      if (offset + len > data.length) return ''
      const str = data.subarray(offset, offset + len).toString('utf-8')
      offset += len
      return str
    }

    // Skip to metadata content (past discriminator and authority)
    offset = 8 + 32 + 32 // discriminator + update authority + mint

    const name = readString()
    const symbol = readString()
    const uri = readString()

    if (!name && !symbol && !uri) return null

    // Read additional fields count
    const additionalFields: Array<[string, string]> = []
    if (offset + 4 <= data.length) {
      const fieldCount = data.readUInt32LE(offset)
      offset += 4

      for (let i = 0; i < fieldCount && offset < data.length; i++) {
        const key = readString()
        const value = readString()
        if (key) {
          additionalFields.push([key, value])
        }
      }
    }

    return {
      name,
      symbol,
      uri,
      additionalFields: additionalFields.length > 0 ? additionalFields : undefined,
    }
  } catch {
    return null
  }
}
