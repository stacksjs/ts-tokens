/**
 * Token-2022 Embedded Metadata
 *
 * Create, read, and update embedded Token Metadata extension (no Metaplex needed).
 */

import { PublicKey } from '@solana/web3.js'
import type { Connection, TransactionInstruction } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { ExtensionType } from '../programs/token-2022/types'
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

// SPL Token Metadata interface discriminators —
// sha256("spl_token_metadata_interface:<name>")[0..8]
const TOKEN_METADATA_INITIALIZE = Buffer.from([53, 201, 129, 93, 171, 163, 190, 1])
const TOKEN_METADATA_UPDATE_FIELD = Buffer.from([130, 68, 42, 109, 52, 18, 206, 255])

/**
 * Encode the UpdateField Field enum: Name = 0, Symbol = 1, Uri = 2,
 * Key(String) = 3 for custom fields
 */
function packField(field: string): Buffer {
  switch (field.toLowerCase()) {
    case 'name':
      return Buffer.from([0])
    case 'symbol':
      return Buffer.from([1])
    case 'uri':
      return Buffer.from([2])
    default:
      return Buffer.concat([Buffer.from([3]), packString(field)])
  }
}

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
export function createInitializeTokenMetadataInstruction(
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
export function createUpdateTokenMetadataFieldInstruction(
  mint: PublicKey,
  updateAuthority: PublicKey,
  field: string,
  value: string
): TransactionInstruction {
  const data = Buffer.concat([
    TOKEN_METADATA_UPDATE_FIELD,
    packField(field),
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

    // Mints with extensions are zero-padded to the legacy account size (165),
    // followed by a 1-byte account type at offset 165, then the TLV entries.
    // Each TLV header is 4 bytes: u16 type + u16 length — NOT 8 bytes.
    const data = accountInfo.data
    const ACCOUNT_SIZE = 165

    if (data.length <= ACCOUNT_SIZE + 1) return null // No extensions present

    let offset = ACCOUNT_SIZE + 1
    while (offset + 4 <= data.length) {
      const type = data.readUInt16LE(offset)
      const length = data.readUInt16LE(offset + 2)
      offset += 4

      // Uninitialized (type 0) terminates the TLV list
      if (type === 0 || offset + length > data.length) break

      if (type === ExtensionType.TokenMetadata) {
        return parseMetadataExtension(data.subarray(offset, offset + length))
      }

      offset += length
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse the TokenMetadata extension VALUE (after its 4-byte TLV header)
 */
function parseMetadataExtension(data: Buffer): EmbeddedMetadata | null {
  try {
    let offset = 0

    const readString = (): string => {
      if (offset + 4 > data.length) return ''
      const len = data.readUInt32LE(offset)
      offset += 4
      if (offset + len > data.length) return ''
      const str = data.subarray(offset, offset + len).toString('utf-8')
      offset += len
      return str
    }

    // TokenMetadata value layout: update_authority(32) + mint(32), then the
    // length-prefixed strings.
    offset = 32 + 32

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
