/**
 * pNFT Program Constants & PDA Helpers
 *
 * Program ID, PDA derivation, instruction discriminators, and data serializers.
 */

import { PublicKey } from '@solana/web3.js'
import type { TransferRule, TransferRuleType } from './types'

/**
 * pNFT program ID (placeholder — program deployment deferred)
 */
export const PNFT_PROGRAM_ID = new PublicKey('PNftProgram11111111111111111111111111111111')

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

export function getPNFTAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('pnft'), mint.toBuffer()],
    PNFT_PROGRAM_ID
  )
  return address
}

export function getRuleSetAddress(authority: PublicKey, collection: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('rule_set'), authority.toBuffer(), collection.toBuffer()],
    PNFT_PROGRAM_ID
  )
  return address
}

// ---------------------------------------------------------------------------
// Rule type index mapping
// ---------------------------------------------------------------------------

export const RULE_TYPE_INDEX: Record<TransferRuleType, number> = {
  royalty_enforcement: 0,
  allow_list: 1,
  deny_list: 2,
  program_gate: 3,
  holder_gate: 4,
  creator_approval: 5,
  cooldown_period: 6,
  max_transfers: 7,
  soulbound: 8,
  custom: 9,
}

// ---------------------------------------------------------------------------
// Instruction discriminators (8-byte constants)
// ---------------------------------------------------------------------------

export const DISCRIMINATORS = {
  createPNFT:            Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
  createRuleSet:         Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
  createSoulbound:       Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]),
  addRule:               Buffer.from([3, 0, 0, 0, 0, 0, 0, 0]),
  removeRule:            Buffer.from([4, 0, 0, 0, 0, 0, 0, 0]),
  updateRule:            Buffer.from([5, 0, 0, 0, 0, 0, 0, 0]),
  freezeRules:           Buffer.from([6, 0, 0, 0, 0, 0, 0, 0]),
  transferPNFT:          Buffer.from([7, 0, 0, 0, 0, 0, 0, 0]),
  delegateTransfer:      Buffer.from([8, 0, 0, 0, 0, 0, 0, 0]),
  revokeDelegate:        Buffer.from([9, 0, 0, 0, 0, 0, 0, 0]),
  lockPNFT:              Buffer.from([10, 0, 0, 0, 0, 0, 0, 0]),
  unlockPNFT:            Buffer.from([11, 0, 0, 0, 0, 0, 0, 0]),
  recoverSoulbound:      Buffer.from([12, 0, 0, 0, 0, 0, 0, 0]),
} as const

// ---------------------------------------------------------------------------
// Data serializers
// ---------------------------------------------------------------------------

/**
 * Write a length-prefixed string to a buffer at offset.
 * Format: 4-byte LE length + UTF-8 bytes.
 */
function writeString(buffer: Buffer, str: string, offset: number): number {
  const bytes = Buffer.from(str, 'utf8')
  buffer.writeUInt32LE(bytes.length, offset); offset += 4
  bytes.copy(buffer, offset); offset += bytes.length
  return offset
}

/**
 * Serialize a single rule to a buffer.
 * Format: 1-byte rule type index + type-specific fields.
 */
export function serializeRuleData(rule: TransferRule): Buffer {
  const ruleTypeIndex = RULE_TYPE_INDEX[rule.type]
  const parts: Buffer[] = [Buffer.from([ruleTypeIndex])]

  switch (rule.type) {
    case 'royalty_enforcement': {
      const buf = Buffer.alloc(2 + 4 + rule.recipients.length * 36)
      let off = 0
      buf.writeUInt16LE(rule.royaltyBps, off); off += 2
      buf.writeUInt32LE(rule.recipients.length, off); off += 4
      for (const r of rule.recipients) {
        r.address.toBuffer().copy(buf, off); off += 32
        buf.writeUInt32LE(r.share, off); off += 4
      }
      parts.push(buf.subarray(0, off))
      break
    }
    case 'allow_list':
    case 'deny_list': {
      const buf = Buffer.alloc(4 + rule.addresses.length * 32)
      let off = 0
      buf.writeUInt32LE(rule.addresses.length, off); off += 4
      for (const addr of rule.addresses) {
        addr.toBuffer().copy(buf, off); off += 32
      }
      parts.push(buf.subarray(0, off))
      break
    }
    case 'program_gate': {
      const buf = Buffer.alloc(4 + rule.programs.length * 32)
      let off = 0
      buf.writeUInt32LE(rule.programs.length, off); off += 4
      for (const prog of rule.programs) {
        prog.toBuffer().copy(buf, off); off += 32
      }
      parts.push(buf.subarray(0, off))
      break
    }
    case 'holder_gate': {
      const buf = Buffer.alloc(32 + 8)
      rule.requiredToken.toBuffer().copy(buf, 0)
      buf.writeBigUInt64LE(rule.minAmount, 32)
      parts.push(buf)
      break
    }
    case 'creator_approval': {
      parts.push(Buffer.from(rule.creator.toBuffer()))
      break
    }
    case 'cooldown_period': {
      const buf = Buffer.alloc(4)
      buf.writeUInt32LE(rule.periodSeconds, 0)
      parts.push(buf)
      break
    }
    case 'max_transfers': {
      const buf = Buffer.alloc(4)
      buf.writeUInt32LE(rule.maxTransfers, 0)
      parts.push(buf)
      break
    }
    case 'soulbound': {
      if (rule.recoveryAuthority) {
        const buf = Buffer.alloc(1 + 32)
        buf.writeUInt8(1, 0)
        rule.recoveryAuthority.toBuffer().copy(buf, 1)
        parts.push(buf)
      } else {
        parts.push(Buffer.from([0]))
      }
      break
    }
    case 'custom': {
      const buf = Buffer.alloc(32 + 4 + rule.data.length)
      let off = 0
      rule.program.toBuffer().copy(buf, off); off += 32
      buf.writeUInt32LE(rule.data.length, off); off += 4
      Buffer.from(rule.data).copy(buf, off)
      parts.push(buf)
      break
    }
  }

  return Buffer.concat(parts)
}

export function serializeCreatePNFTData(
  name: string,
  symbol: string,
  uri: string,
  rulesData: Buffer
): Buffer {
  const nameBytes = Buffer.from(name, 'utf8')
  const symbolBytes = Buffer.from(symbol, 'utf8')
  const uriBytes = Buffer.from(uri, 'utf8')
  const size = 8 + (4 + nameBytes.length) + (4 + symbolBytes.length) + (4 + uriBytes.length) + 4 + rulesData.length
  const buffer = Buffer.alloc(size)
  let offset = 0
  DISCRIMINATORS.createPNFT.copy(buffer, offset); offset += 8
  offset = writeString(buffer, name, offset)
  offset = writeString(buffer, symbol, offset)
  offset = writeString(buffer, uri, offset)
  buffer.writeUInt32LE(rulesData.length, offset); offset += 4
  rulesData.copy(buffer, offset)
  return buffer
}

export function serializeCreateRuleSetData(
  isMutable: boolean,
  rulesData: Buffer
): Buffer {
  const buffer = Buffer.alloc(8 + 1 + 4 + rulesData.length)
  let offset = 0
  DISCRIMINATORS.createRuleSet.copy(buffer, offset); offset += 8
  buffer.writeUInt8(isMutable ? 1 : 0, offset); offset += 1
  buffer.writeUInt32LE(rulesData.length, offset); offset += 4
  rulesData.copy(buffer, offset)
  return buffer
}

export function serializeCreateSoulboundData(
  name: string,
  symbol: string,
  uri: string,
  recoveryAuthority?: PublicKey
): Buffer {
  const nameBytes = Buffer.from(name, 'utf8')
  const symbolBytes = Buffer.from(symbol, 'utf8')
  const uriBytes = Buffer.from(uri, 'utf8')
  const size = 8 + (4 + nameBytes.length) + (4 + symbolBytes.length) + (4 + uriBytes.length) + 1 + (recoveryAuthority ? 32 : 0)
  const buffer = Buffer.alloc(size)
  let offset = 0
  DISCRIMINATORS.createSoulbound.copy(buffer, offset); offset += 8
  offset = writeString(buffer, name, offset)
  offset = writeString(buffer, symbol, offset)
  offset = writeString(buffer, uri, offset)
  if (recoveryAuthority) {
    buffer.writeUInt8(1, offset); offset += 1
    recoveryAuthority.toBuffer().copy(buffer, offset)
  } else {
    buffer.writeUInt8(0, offset)
  }
  return buffer
}

export function serializeAddRuleData(ruleData: Buffer): Buffer {
  const buffer = Buffer.alloc(8 + ruleData.length)
  DISCRIMINATORS.addRule.copy(buffer, 0)
  ruleData.copy(buffer, 8)
  return buffer
}

export function serializeRemoveRuleData(ruleTypeIndex: number): Buffer {
  const buffer = Buffer.alloc(8 + 1)
  DISCRIMINATORS.removeRule.copy(buffer, 0)
  buffer.writeUInt8(ruleTypeIndex, 8)
  return buffer
}

export function serializeUpdateRuleData(ruleData: Buffer): Buffer {
  const buffer = Buffer.alloc(8 + ruleData.length)
  DISCRIMINATORS.updateRule.copy(buffer, 0)
  ruleData.copy(buffer, 8)
  return buffer
}

export function serializeTransferPNFTData(payRoyalty: boolean): Buffer {
  const buffer = Buffer.alloc(8 + 1)
  DISCRIMINATORS.transferPNFT.copy(buffer, 0)
  buffer.writeUInt8(payRoyalty ? 1 : 0, 8)
  return buffer
}

export function serializeLockPNFTData(state: 'listed' | 'staked'): Buffer {
  const buffer = Buffer.alloc(8 + 1)
  DISCRIMINATORS.lockPNFT.copy(buffer, 0)
  buffer.writeUInt8(state === 'listed' ? 0 : 1, 8)
  return buffer
}
