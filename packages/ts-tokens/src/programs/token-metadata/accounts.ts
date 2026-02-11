/**
 * Token Metadata Program Account Deserializers
 */

import { PublicKey } from '@solana/web3.js'
import type {
  Metadata,
  MasterEditionV2,
  Edition,
  DataV2,
  Creator,
  Collection,
  Uses,
  TokenStandard,
  CollectionDetails,
  ProgrammableConfig,
  UseMethod,
} from './types'

// Account discriminators
const METADATA_KEY = 4
const MASTER_EDITION_V2_KEY = 6
const EDITION_KEY = 1
const COLLECTION_AUTHORITY_RECORD_KEY = 9

/**
 * Deserialize a Metadata account
 */
export function deserializeMetadata(data: Buffer): Metadata {
  let offset = 0

  const key = data.readUInt8(offset)
  offset += 1

  if (key !== METADATA_KEY) {
    throw new Error(`Invalid metadata key: ${key}`)
  }

  const updateAuthority = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  const mint = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  // Parse Data struct
  const { data: metadataData, offset: newOffset } = parseDataV2(data, offset)
  offset = newOffset

  const primarySaleHappened = data.readUInt8(offset) === 1
  offset += 1

  const isMutable = data.readUInt8(offset) === 1
  offset += 1

  // Edition nonce (optional)
  const hasEditionNonce = data.readUInt8(offset) === 1
  offset += 1
  const editionNonce = hasEditionNonce ? data.readUInt8(offset) : null
  if (hasEditionNonce) offset += 1

  // Token standard (optional)
  const hasTokenStandard = data.readUInt8(offset) === 1
  offset += 1
  const tokenStandard = hasTokenStandard ? (data.readUInt8(offset) as TokenStandard) : null
  if (hasTokenStandard) offset += 1

  // Collection (optional)
  const hasCollection = data.readUInt8(offset) === 1
  offset += 1
  let collection: Collection | null = null
  if (hasCollection) {
    const verified = data.readUInt8(offset) === 1
    offset += 1
    const collectionKey = new PublicKey(data.subarray(offset, offset + 32))
    offset += 32
    collection = { verified, key: collectionKey }
  }

  // Uses (optional)
  const hasUses = data.readUInt8(offset) === 1
  offset += 1
  let uses: Uses | null = null
  if (hasUses) {
    const useMethod = data.readUInt8(offset) as UseMethod
    offset += 1
    const remaining = data.readBigUInt64LE(offset)
    offset += 8
    const total = data.readBigUInt64LE(offset)
    offset += 8
    uses = { useMethod, remaining, total }
  }

  // Collection details (optional)
  const hasCollectionDetails = data.readUInt8(offset) === 1
  offset += 1
  let collectionDetails: CollectionDetails | null = null
  if (hasCollectionDetails) {
    const size = data.readBigUInt64LE(offset)
    offset += 8
    collectionDetails = { size }
  }

  // Programmable config (optional)
  const hasProgrammableConfig = offset < data.length && data.readUInt8(offset) === 1
  offset += 1
  let programmableConfig: ProgrammableConfig | null = null
  if (hasProgrammableConfig && offset < data.length) {
    const hasRuleSet = data.readUInt8(offset) === 1
    offset += 1
    const ruleSet = hasRuleSet ? new PublicKey(data.subarray(offset, offset + 32)) : null
    programmableConfig = { ruleSet }
  }

  return {
    key,
    updateAuthority,
    mint,
    data: metadataData,
    primarySaleHappened,
    isMutable,
    editionNonce,
    tokenStandard,
    collection,
    uses,
    collectionDetails,
    programmableConfig,
  }
}

/**
 * Deserialize a MasterEditionV2 account
 */
export function deserializeMasterEdition(data: Buffer): MasterEditionV2 {
  let offset = 0

  const key = data.readUInt8(offset)
  offset += 1

  if (key !== MASTER_EDITION_V2_KEY) {
    throw new Error(`Invalid master edition key: ${key}`)
  }

  const supply = data.readBigUInt64LE(offset)
  offset += 8

  const hasMaxSupply = data.readUInt8(offset) === 1
  offset += 1
  const maxSupply = hasMaxSupply ? data.readBigUInt64LE(offset) : null

  return { key, supply, maxSupply }
}

/**
 * Deserialize an Edition account
 */
export function deserializeEdition(data: Buffer): Edition {
  let offset = 0

  const key = data.readUInt8(offset)
  offset += 1

  if (key !== EDITION_KEY) {
    throw new Error(`Invalid edition key: ${key}`)
  }

  const parent = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  const edition = data.readBigUInt64LE(offset)

  return { key, parent, edition }
}

/**
 * Collection authority record account data
 */
export interface CollectionAuthorityRecord {
  key: number
  bump: number
  updateAuthority: PublicKey | null
}

/**
 * Deserialize a CollectionAuthorityRecord account
 *
 * This account is created when a collection authority is delegated
 * for verifying NFTs in a collection.
 */
export function parseCollectionAuthorityRecord(data: Buffer): CollectionAuthorityRecord {
  let offset = 0

  const key = data.readUInt8(offset)
  offset += 1

  if (key !== COLLECTION_AUTHORITY_RECORD_KEY) {
    throw new Error(`Invalid collection authority record key: ${key}`)
  }

  const bump = data.readUInt8(offset)
  offset += 1

  // Update authority (optional)
  const hasUpdateAuthority = data.readUInt8(offset) === 1
  offset += 1
  const updateAuthority = hasUpdateAuthority
    ? new PublicKey(data.subarray(offset, offset + 32))
    : null

  return { key, bump, updateAuthority }
}

/**
 * Parse DataV2 struct from buffer
 */
function parseDataV2(data: Buffer, offset: number): { data: DataV2; offset: number } {
  // Name (string with length prefix)
  const nameLen = data.readUInt32LE(offset)
  offset += 4
  const name = data.subarray(offset, offset + nameLen).toString('utf8').replace(/\0/g, '')
  offset += nameLen

  // Symbol (string with length prefix)
  const symbolLen = data.readUInt32LE(offset)
  offset += 4
  const symbol = data.subarray(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '')
  offset += symbolLen

  // URI (string with length prefix)
  const uriLen = data.readUInt32LE(offset)
  offset += 4
  const uri = data.subarray(offset, offset + uriLen).toString('utf8').replace(/\0/g, '')
  offset += uriLen

  // Seller fee basis points
  const sellerFeeBasisPoints = data.readUInt16LE(offset)
  offset += 2

  // Creators (optional vec)
  const hasCreators = data.readUInt8(offset) === 1
  offset += 1
  let creators: Creator[] | null = null
  if (hasCreators) {
    const creatorsLen = data.readUInt32LE(offset)
    offset += 4
    creators = []
    for (let i = 0; i < creatorsLen; i++) {
      const address = new PublicKey(data.subarray(offset, offset + 32))
      offset += 32
      const verified = data.readUInt8(offset) === 1
      offset += 1
      const share = data.readUInt8(offset)
      offset += 1
      creators.push({ address, verified, share })
    }
  }

  // Collection (optional)
  const hasCollection = data.readUInt8(offset) === 1
  offset += 1
  let collection: Collection | null = null
  if (hasCollection) {
    const verified = data.readUInt8(offset) === 1
    offset += 1
    const key = new PublicKey(data.subarray(offset, offset + 32))
    offset += 32
    collection = { verified, key }
  }

  // Uses (optional)
  const hasUses = data.readUInt8(offset) === 1
  offset += 1
  let uses: Uses | null = null
  if (hasUses) {
    const useMethod = data.readUInt8(offset) as UseMethod
    offset += 1
    const remaining = data.readBigUInt64LE(offset)
    offset += 8
    const total = data.readBigUInt64LE(offset)
    offset += 8
    uses = { useMethod, remaining, total }
  }

  return {
    data: { name, symbol, uri, sellerFeeBasisPoints, creators, collection, uses },
    offset,
  }
}
