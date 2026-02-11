/**
 * Candy Machine Account Deserializers
 */

import { PublicKey } from '@solana/web3.js'
import type {
  CandyMachine,
  CandyMachineData,
  Creator,
  ConfigLineSettings,
  HiddenSettings,
} from './types'

/**
 * Candy Guard account data
 */
export interface CandyGuard {
  /** Base address used for PDA derivation */
  base: PublicKey
  /** Bump seed for the PDA */
  bump: number
  /** Guard authority */
  authority: PublicKey
  /** Raw guard data (features bitmap + serialized guards) */
  guardData: Buffer
}

/**
 * Deserialize a Candy Guard account
 *
 * Parses the Candy Guard account header. The guard set data is returned
 * as a raw buffer since its variable-length encoding depends on which
 * guards are enabled (use the features bitmap to decode).
 */
export function parseCandyGuard(data: Buffer): CandyGuard {
  let offset = 8 // Skip Anchor discriminator

  const base = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  const bump = data.readUInt8(offset)
  offset += 1

  const authority = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  // Remaining data is the serialized guard configuration
  const guardData = data.subarray(offset)

  return {
    base,
    bump,
    authority,
    guardData: Buffer.from(guardData),
  }
}

/**
 * Deserialize a Candy Machine account
 */
export function deserializeCandyMachine(data: Buffer): CandyMachine {
  let offset = 8 // Skip discriminator

  const version = data.readUInt8(offset)
  offset += 1

  const tokenStandard = data.readUInt8(offset)
  offset += 1

  const features = data.readBigUInt64LE(offset)
  offset += 8

  const authority = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  const mintAuthority = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  const collectionMint = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32

  const itemsRedeemed = data.readBigUInt64LE(offset)
  offset += 8

  const { data: cmData, offset: newOffset } = parseCandyMachineData(data, offset)

  return {
    version,
    tokenStandard,
    features,
    authority,
    mintAuthority,
    collectionMint,
    itemsRedeemed,
    data: cmData,
  }
}

/**
 * Parse CandyMachineData from buffer
 */
function parseCandyMachineData(
  data: Buffer,
  offset: number
): { data: CandyMachineData; offset: number } {
  const itemsAvailable = data.readBigUInt64LE(offset)
  offset += 8

  // Symbol (string with length prefix)
  const symbolLen = data.readUInt32LE(offset)
  offset += 4
  const symbol = data.subarray(offset, offset + symbolLen).toString('utf8')
  offset += symbolLen

  const sellerFeeBasisPoints = data.readUInt16LE(offset)
  offset += 2

  const maxSupply = data.readBigUInt64LE(offset)
  offset += 8

  const isMutable = data.readUInt8(offset) === 1
  offset += 1

  // Creators
  const creatorsLen = data.readUInt32LE(offset)
  offset += 4
  const creators: Creator[] = []
  for (let i = 0; i < creatorsLen; i++) {
    const address = new PublicKey(data.subarray(offset, offset + 32))
    offset += 32
    const verified = data.readUInt8(offset) === 1
    offset += 1
    const percentageShare = data.readUInt8(offset)
    offset += 1
    creators.push({ address, verified, percentageShare })
  }

  // Config line settings (optional)
  const hasConfigLineSettings = data.readUInt8(offset) === 1
  offset += 1
  let configLineSettings: ConfigLineSettings | null = null
  if (hasConfigLineSettings) {
    const prefixNameLen = data.readUInt32LE(offset)
    offset += 4
    const prefixName = data.subarray(offset, offset + prefixNameLen).toString('utf8')
    offset += prefixNameLen

    const nameLength = data.readUInt32LE(offset)
    offset += 4

    const prefixUriLen = data.readUInt32LE(offset)
    offset += 4
    const prefixUri = data.subarray(offset, offset + prefixUriLen).toString('utf8')
    offset += prefixUriLen

    const uriLength = data.readUInt32LE(offset)
    offset += 4

    const isSequential = data.readUInt8(offset) === 1
    offset += 1

    configLineSettings = { prefixName, nameLength, prefixUri, uriLength, isSequential }
  }

  // Hidden settings (optional)
  const hasHiddenSettings = data.readUInt8(offset) === 1
  offset += 1
  let hiddenSettings: HiddenSettings | null = null
  if (hasHiddenSettings) {
    const nameLen = data.readUInt32LE(offset)
    offset += 4
    const name = data.subarray(offset, offset + nameLen).toString('utf8')
    offset += nameLen

    const uriLen = data.readUInt32LE(offset)
    offset += 4
    const uri = data.subarray(offset, offset + uriLen).toString('utf8')
    offset += uriLen

    const hash = new Uint8Array(data.subarray(offset, offset + 32))
    offset += 32

    hiddenSettings = { name, uri, hash }
  }

  return {
    data: {
      itemsAvailable,
      symbol,
      sellerFeeBasisPoints,
      maxSupply,
      isMutable,
      creators,
      configLineSettings,
      hiddenSettings,
    },
    offset,
  }
}
