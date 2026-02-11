/**
 * Token-2022 Extension Utilities
 */

import { PublicKey } from '@solana/web3.js'
import { ExtensionType } from './types'
import type {
  TransferFeeConfig,
  TransferFee,
  InterestBearingConfig,
  PermanentDelegate,
  TransferHook,
  MetadataPointer,
  TokenExtension,
  AccountState,
  ConfidentialTransferMint,
  CpiGuardConfig,
  GroupPointer,
  GroupMemberPointer,
} from './types'

/**
 * Get the size of an extension
 */
export function getExtensionSize(type: ExtensionType): number {
  switch (type) {
    case ExtensionType.TransferFeeConfig:
      return 108
    case ExtensionType.TransferFeeAmount:
      return 8
    case ExtensionType.MintCloseAuthority:
      return 32
    case ExtensionType.DefaultAccountState:
      return 1
    case ExtensionType.ImmutableOwner:
      return 0
    case ExtensionType.MemoTransfer:
      return 1
    case ExtensionType.NonTransferable:
      return 0
    case ExtensionType.InterestBearingConfig:
      return 52
    case ExtensionType.CpiGuard:
      return 1
    case ExtensionType.PermanentDelegate:
      return 32
    case ExtensionType.TransferHook:
      return 64
    case ExtensionType.MetadataPointer:
      return 64
    case ExtensionType.ConfidentialTransferMint:
      return 97
    case ExtensionType.ConfidentialTransferAccount:
      return 295
    case ExtensionType.TransferHookAccount:
      return 1
    case ExtensionType.NonTransferableAccount:
      return 0
    case ExtensionType.GroupPointer:
      return 64
    case ExtensionType.GroupMemberPointer:
      return 64
    case ExtensionType.TokenGroup:
      return 136
    case ExtensionType.TokenGroupMember:
      return 72
    default:
      return 0
  }
}

/**
 * Calculate total mint size with extensions
 */
export function getMintSize(extensions: ExtensionType[]): number {
  const BASE_MINT_SIZE = 82
  const ACCOUNT_TYPE_SIZE = 1
  const TYPE_SIZE = 2
  const LENGTH_SIZE = 2

  let size = BASE_MINT_SIZE + ACCOUNT_TYPE_SIZE

  for (const ext of extensions) {
    size += TYPE_SIZE + LENGTH_SIZE + getExtensionSize(ext)
  }

  return size
}

/**
 * Parse transfer fee config from buffer
 */
export function parseTransferFeeConfig(data: Buffer, offset: number): TransferFeeConfig {
  const transferFeeConfigAuthority = data.subarray(offset, offset + 32)
  const hasAuthority = !transferFeeConfigAuthority.every(b => b === 0)

  const withdrawWithheldAuthority = data.subarray(offset + 32, offset + 64)
  const hasWithdrawAuthority = !withdrawWithheldAuthority.every(b => b === 0)

  const withheldAmount = data.readBigUInt64LE(offset + 64)

  const olderTransferFee = parseTransferFee(data, offset + 72)
  const newerTransferFee = parseTransferFee(data, offset + 90)

  return {
    transferFeeConfigAuthority: hasAuthority ? new PublicKey(transferFeeConfigAuthority) : null,
    withdrawWithheldAuthority: hasWithdrawAuthority ? new PublicKey(withdrawWithheldAuthority) : null,
    withheldAmount,
    olderTransferFee,
    newerTransferFee,
  }
}

function parseTransferFee(data: Buffer, offset: number): TransferFee {
  return {
    epoch: data.readBigUInt64LE(offset),
    maximumFee: data.readBigUInt64LE(offset + 8),
    transferFeeBasisPoints: data.readUInt16LE(offset + 16),
  }
}

/**
 * Parse interest-bearing config from buffer
 */
export function parseInterestBearingConfig(data: Buffer, offset: number): InterestBearingConfig {
  const rateAuthority = data.subarray(offset, offset + 32)
  const hasAuthority = !rateAuthority.every(b => b === 0)

  return {
    rateAuthority: hasAuthority ? new PublicKey(rateAuthority) : null,
    initializationTimestamp: data.readBigInt64LE(offset + 32),
    preUpdateAverageRate: data.readInt16LE(offset + 40),
    lastUpdateTimestamp: data.readBigInt64LE(offset + 42),
    currentRate: data.readInt16LE(offset + 50),
  }
}

/**
 * Parse permanent delegate from buffer
 */
export function parsePermanentDelegate(data: Buffer, offset: number): PermanentDelegate {
  return {
    delegate: new PublicKey(data.subarray(offset, offset + 32)),
  }
}

/**
 * Parse transfer hook from buffer
 */
export function parseTransferHook(data: Buffer, offset: number): TransferHook {
  const authority = data.subarray(offset, offset + 32)
  const hasAuthority = !authority.every(b => b === 0)

  return {
    authority: hasAuthority ? new PublicKey(authority) : null,
    programId: new PublicKey(data.subarray(offset + 32, offset + 64)),
  }
}

/**
 * Parse metadata pointer from buffer
 */
export function parseMetadataPointer(data: Buffer, offset: number): MetadataPointer {
  const authority = data.subarray(offset, offset + 32)
  const hasAuthority = !authority.every(b => b === 0)

  return {
    authority: hasAuthority ? new PublicKey(authority) : null,
    metadataAddress: new PublicKey(data.subarray(offset + 32, offset + 64)),
  }
}

/**
 * Parse confidential transfer mint from buffer
 */
export function parseConfidentialTransferMint(data: Buffer, offset: number): ConfidentialTransferMint {
  const authority = data.subarray(offset, offset + 32)
  const hasAuthority = !authority.every(b => b === 0)

  return {
    authority: hasAuthority ? new PublicKey(authority) : null,
    autoApproveNewAccounts: data[offset + 32] === 1,
    auditorElGamalPubkey: new Uint8Array(data.subarray(offset + 33, offset + 97)),
  }
}

/**
 * Parse CPI guard from buffer
 */
export function parseCpiGuard(data: Buffer, offset: number): CpiGuardConfig {
  return {
    lockCpi: data[offset] === 1,
  }
}

/**
 * Parse group pointer from buffer
 */
export function parseGroupPointer(data: Buffer, offset: number): GroupPointer {
  const authority = data.subarray(offset, offset + 32)
  const hasAuthority = !authority.every(b => b === 0)

  return {
    authority: hasAuthority ? new PublicKey(authority) : null,
    groupAddress: new PublicKey(data.subarray(offset + 32, offset + 64)),
  }
}

/**
 * Parse group member pointer from buffer
 */
export function parseGroupMemberPointer(data: Buffer, offset: number): GroupMemberPointer {
  const authority = data.subarray(offset, offset + 32)
  const hasAuthority = !authority.every(b => b === 0)

  return {
    authority: hasAuthority ? new PublicKey(authority) : null,
    memberAddress: new PublicKey(data.subarray(offset + 32, offset + 64)),
  }
}

/**
 * Parse extensions from mint account data
 */
export function parseExtensions(data: Buffer): TokenExtension[] {
  const extensions: TokenExtension[] = []
  const BASE_MINT_SIZE = 82

  if (data.length <= BASE_MINT_SIZE + 1) {
    return extensions
  }

  let offset = BASE_MINT_SIZE + 1 // Skip base mint + account type

  while (offset < data.length - 4) {
    const type = data.readUInt16LE(offset) as ExtensionType
    const length = data.readUInt16LE(offset + 2)
    offset += 4

    if (length === 0 || offset + length > data.length) {
      break
    }

    let extensionData: unknown

    switch (type) {
      case ExtensionType.TransferFeeConfig:
        extensionData = parseTransferFeeConfig(data, offset)
        break
      case ExtensionType.InterestBearingConfig:
        extensionData = parseInterestBearingConfig(data, offset)
        break
      case ExtensionType.PermanentDelegate:
        extensionData = parsePermanentDelegate(data, offset)
        break
      case ExtensionType.TransferHook:
        extensionData = parseTransferHook(data, offset)
        break
      case ExtensionType.MetadataPointer:
        extensionData = parseMetadataPointer(data, offset)
        break
      case ExtensionType.MintCloseAuthority:
        extensionData = { closeAuthority: new PublicKey(data.subarray(offset, offset + 32)) }
        break
      case ExtensionType.DefaultAccountState:
        extensionData = { state: data[offset] as AccountState }
        break
      case ExtensionType.ConfidentialTransferMint:
        extensionData = parseConfidentialTransferMint(data, offset)
        break
      case ExtensionType.CpiGuard:
        extensionData = parseCpiGuard(data, offset)
        break
      case ExtensionType.GroupPointer:
        extensionData = parseGroupPointer(data, offset)
        break
      case ExtensionType.GroupMemberPointer:
        extensionData = parseGroupMemberPointer(data, offset)
        break
      default:
        extensionData = data.subarray(offset, offset + length)
    }

    extensions.push({ type, data: extensionData })
    offset += length
  }

  return extensions
}

/**
 * Check if mint has a specific extension
 */
export function hasExtension(extensions: TokenExtension[], type: ExtensionType): boolean {
  return extensions.some(ext => ext.type === type)
}

/**
 * Get extension data by type
 */
export function getExtension<T>(extensions: TokenExtension[], type: ExtensionType): T | null {
  const ext = extensions.find(e => e.type === type)
  return ext ? (ext.data as T) : null
}
