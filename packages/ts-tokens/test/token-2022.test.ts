/**
 * Token-2022 (SPL Token Extensions) Tests
 *
 * Tests for extension sizes, parsers, instruction builders,
 * confidential transfer stubs, and type coverage.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import {
  getExtensionSize,
  getMintSize,
  parseTransferFeeConfig,
  parseInterestBearingConfig,
  parsePermanentDelegate,
  parseTransferHook,
  parseMetadataPointer,
  parseConfidentialTransferMint,
  parseCpiGuard,
  parseGroupPointer,
  parseGroupMemberPointer,
  parseExtensions,
} from '../src/programs/token-2022/extensions'
import { ExtensionType, AccountState } from '../src/programs/token-2022/types'
import type { ExtensionConfig } from '../src/programs/token-2022/types'
import {
  initializeMint2,
  initializeTransferFeeConfig,
  initializeInterestBearingMint,
  initializePermanentDelegate,
  initializeTransferHook,
  initializeMetadataPointer,
  initializeMintCloseAuthority,
  initializeDefaultAccountState,
  initializeNonTransferableMint,
  setTransferFee,
  withdrawWithheldTokensFromAccounts,
  updateRateInterestBearingMint,
  harvestWithheldTokensToMint,
  amountToUiAmount,
  uiAmountToAmount,
  updateTransferHook,
  updateMetadataPointer,
  updateDefaultAccountState,
  initializeConfidentialTransferMint,
  configureConfidentialTransferAccount,
  confidentialTransfer,
  enableCpiGuard,
  disableCpiGuard,
  initializeGroupPointer,
  initializeGroupMemberPointer,
} from '../src/programs/token-2022/instructions'

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')

// ============================================
// 1. Extension Size Calculations
// ============================================

describe('Extension Size Calculations', () => {
  test('getExtensionSize returns correct sizes for all extension types', () => {
    expect(getExtensionSize(ExtensionType.TransferFeeConfig)).toBe(108)
    expect(getExtensionSize(ExtensionType.TransferFeeAmount)).toBe(8)
    expect(getExtensionSize(ExtensionType.MintCloseAuthority)).toBe(32)
    expect(getExtensionSize(ExtensionType.ConfidentialTransferMint)).toBe(97)
    expect(getExtensionSize(ExtensionType.ConfidentialTransferAccount)).toBe(295)
    expect(getExtensionSize(ExtensionType.DefaultAccountState)).toBe(1)
    expect(getExtensionSize(ExtensionType.ImmutableOwner)).toBe(0)
    expect(getExtensionSize(ExtensionType.MemoTransfer)).toBe(1)
    expect(getExtensionSize(ExtensionType.NonTransferable)).toBe(0)
    expect(getExtensionSize(ExtensionType.InterestBearingConfig)).toBe(52)
    expect(getExtensionSize(ExtensionType.CpiGuard)).toBe(1)
    expect(getExtensionSize(ExtensionType.PermanentDelegate)).toBe(32)
    expect(getExtensionSize(ExtensionType.NonTransferableAccount)).toBe(0)
    expect(getExtensionSize(ExtensionType.TransferHook)).toBe(64)
    expect(getExtensionSize(ExtensionType.TransferHookAccount)).toBe(1)
    expect(getExtensionSize(ExtensionType.MetadataPointer)).toBe(64)
    expect(getExtensionSize(ExtensionType.GroupPointer)).toBe(64)
    expect(getExtensionSize(ExtensionType.GroupMemberPointer)).toBe(64)
    expect(getExtensionSize(ExtensionType.TokenGroup)).toBe(136)
    expect(getExtensionSize(ExtensionType.TokenGroupMember)).toBe(72)
  })

  test('getExtensionSize returns 0 for Uninitialized', () => {
    expect(getExtensionSize(ExtensionType.Uninitialized)).toBe(0)
  })

  test('getMintSize computes base size correctly', () => {
    const BASE_SIZE = 82 + 1 // base mint + account type
    expect(getMintSize([])).toBe(BASE_SIZE)
  })

  test('getMintSize includes type + length headers for each extension', () => {
    const BASE_SIZE = 82 + 1
    const TYPE_SIZE = 2
    const LENGTH_SIZE = 2

    // Single extension: TransferFeeConfig (108 bytes)
    const size = getMintSize([ExtensionType.TransferFeeConfig])
    expect(size).toBe(BASE_SIZE + TYPE_SIZE + LENGTH_SIZE + 108)
  })

  test('getMintSize handles multiple extensions', () => {
    const BASE_SIZE = 82 + 1
    const HEADER = 2 + 2 // type + length

    const extensions = [
      ExtensionType.TransferFeeConfig,  // 108
      ExtensionType.MintCloseAuthority, // 32
      ExtensionType.GroupPointer,       // 64
    ]

    const expected = BASE_SIZE + (HEADER + 108) + (HEADER + 32) + (HEADER + 64)
    expect(getMintSize(extensions)).toBe(expected)
  })
})

// ============================================
// 2. Extension Parsing
// ============================================

describe('Extension Parsing', () => {
  test('parseTransferFeeConfig extracts correct values', () => {
    const buf = Buffer.alloc(108)
    const authority = Keypair.generate().publicKey
    const withdrawAuth = Keypair.generate().publicKey

    authority.toBuffer().copy(buf, 0)
    withdrawAuth.toBuffer().copy(buf, 32)
    buf.writeBigUInt64LE(1000n, 64)
    // older transfer fee
    buf.writeBigUInt64LE(100n, 72)   // epoch
    buf.writeBigUInt64LE(5000n, 80)  // maximumFee
    buf.writeUInt16LE(250, 88)       // basisPoints
    // newer transfer fee
    buf.writeBigUInt64LE(200n, 90)   // epoch
    buf.writeBigUInt64LE(10000n, 98) // maximumFee
    buf.writeUInt16LE(500, 106)      // basisPoints

    const result = parseTransferFeeConfig(buf, 0)

    expect(result.transferFeeConfigAuthority!.toBase58()).toBe(authority.toBase58())
    expect(result.withdrawWithheldAuthority!.toBase58()).toBe(withdrawAuth.toBase58())
    expect(result.withheldAmount).toBe(1000n)
    expect(result.olderTransferFee.epoch).toBe(100n)
    expect(result.olderTransferFee.maximumFee).toBe(5000n)
    expect(result.olderTransferFee.transferFeeBasisPoints).toBe(250)
    expect(result.newerTransferFee.epoch).toBe(200n)
    expect(result.newerTransferFee.maximumFee).toBe(10000n)
    expect(result.newerTransferFee.transferFeeBasisPoints).toBe(500)
  })

  test('parseTransferFeeConfig handles null authorities', () => {
    const buf = Buffer.alloc(108) // zeroed
    buf.writeBigUInt64LE(0n, 72)
    buf.writeBigUInt64LE(0n, 80)
    buf.writeBigUInt64LE(0n, 90)
    buf.writeBigUInt64LE(0n, 98)

    const result = parseTransferFeeConfig(buf, 0)

    expect(result.transferFeeConfigAuthority).toBeNull()
    expect(result.withdrawWithheldAuthority).toBeNull()
  })

  test('parseInterestBearingConfig extracts correct values', () => {
    const buf = Buffer.alloc(52)
    const rateAuth = Keypair.generate().publicKey
    rateAuth.toBuffer().copy(buf, 0)
    buf.writeBigInt64LE(1234567890n, 32)
    buf.writeInt16LE(100, 40)
    buf.writeBigInt64LE(1234567900n, 42)
    buf.writeInt16LE(200, 50)

    const result = parseInterestBearingConfig(buf, 0)

    expect(result.rateAuthority!.toBase58()).toBe(rateAuth.toBase58())
    expect(result.initializationTimestamp).toBe(1234567890n)
    expect(result.preUpdateAverageRate).toBe(100)
    expect(result.lastUpdateTimestamp).toBe(1234567900n)
    expect(result.currentRate).toBe(200)
  })

  test('parsePermanentDelegate extracts delegate key', () => {
    const buf = Buffer.alloc(32)
    const delegate = Keypair.generate().publicKey
    delegate.toBuffer().copy(buf, 0)

    const result = parsePermanentDelegate(buf, 0)
    expect(result.delegate.toBase58()).toBe(delegate.toBase58())
  })

  test('parseTransferHook extracts authority and programId', () => {
    const buf = Buffer.alloc(64)
    const authority = Keypair.generate().publicKey
    const programId = Keypair.generate().publicKey
    authority.toBuffer().copy(buf, 0)
    programId.toBuffer().copy(buf, 32)

    const result = parseTransferHook(buf, 0)
    expect(result.authority!.toBase58()).toBe(authority.toBase58())
    expect(result.programId.toBase58()).toBe(programId.toBase58())
  })

  test('parseMetadataPointer extracts authority and address', () => {
    const buf = Buffer.alloc(64)
    const authority = Keypair.generate().publicKey
    const metadataAddr = Keypair.generate().publicKey
    authority.toBuffer().copy(buf, 0)
    metadataAddr.toBuffer().copy(buf, 32)

    const result = parseMetadataPointer(buf, 0)
    expect(result.authority!.toBase58()).toBe(authority.toBase58())
    expect(result.metadataAddress.toBase58()).toBe(metadataAddr.toBase58())
  })

  test('parseConfidentialTransferMint extracts all fields', () => {
    const buf = Buffer.alloc(97)
    const authority = Keypair.generate().publicKey
    authority.toBuffer().copy(buf, 0)
    buf[32] = 1 // autoApproveNewAccounts = true
    // Fill auditor pubkey bytes
    for (let i = 0; i < 64; i++) {
      buf[33 + i] = i + 1
    }

    const result = parseConfidentialTransferMint(buf, 0)
    expect(result.authority!.toBase58()).toBe(authority.toBase58())
    expect(result.autoApproveNewAccounts).toBe(true)
    expect(result.auditorElGamalPubkey[0]).toBe(1)
    expect(result.auditorElGamalPubkey[63]).toBe(64)
  })

  test('parseConfidentialTransferMint handles null authority', () => {
    const buf = Buffer.alloc(97) // zeroed
    buf[32] = 0

    const result = parseConfidentialTransferMint(buf, 0)
    expect(result.authority).toBeNull()
    expect(result.autoApproveNewAccounts).toBe(false)
  })

  test('parseCpiGuard extracts lock state', () => {
    const buf = Buffer.alloc(1)
    buf[0] = 1 // locked

    const result = parseCpiGuard(buf, 0)
    expect(result.lockCpi).toBe(true)

    buf[0] = 0
    const result2 = parseCpiGuard(buf, 0)
    expect(result2.lockCpi).toBe(false)
  })

  test('parseGroupPointer extracts authority and groupAddress', () => {
    const buf = Buffer.alloc(64)
    const authority = Keypair.generate().publicKey
    const groupAddr = Keypair.generate().publicKey
    authority.toBuffer().copy(buf, 0)
    groupAddr.toBuffer().copy(buf, 32)

    const result = parseGroupPointer(buf, 0)
    expect(result.authority!.toBase58()).toBe(authority.toBase58())
    expect(result.groupAddress.toBase58()).toBe(groupAddr.toBase58())
  })

  test('parseGroupMemberPointer extracts authority and memberAddress', () => {
    const buf = Buffer.alloc(64)
    const authority = Keypair.generate().publicKey
    const memberAddr = Keypair.generate().publicKey
    authority.toBuffer().copy(buf, 0)
    memberAddr.toBuffer().copy(buf, 32)

    const result = parseGroupMemberPointer(buf, 0)
    expect(result.authority!.toBase58()).toBe(authority.toBase58())
    expect(result.memberAddress.toBase58()).toBe(memberAddr.toBase58())
  })

  test('parseExtensions parses from full mint buffer', () => {
    const BASE_MINT_SIZE = 82
    // Build a buffer: base mint (82) + account type (1) + extension header (4) + data
    const extSize = getExtensionSize(ExtensionType.DefaultAccountState) // 1 byte
    const totalSize = BASE_MINT_SIZE + 1 + 4 + extSize
    const buf = Buffer.alloc(totalSize)

    // Account type byte
    buf[BASE_MINT_SIZE] = 1

    // Extension type at offset 83
    buf.writeUInt16LE(ExtensionType.DefaultAccountState, BASE_MINT_SIZE + 1)
    // Extension length
    buf.writeUInt16LE(extSize, BASE_MINT_SIZE + 3)
    // Extension data: Frozen state
    buf[BASE_MINT_SIZE + 5] = AccountState.Frozen

    const extensions = parseExtensions(buf)
    expect(extensions).toHaveLength(1)
    expect(extensions[0].type).toBe(ExtensionType.DefaultAccountState)
    expect((extensions[0].data as any).state).toBe(AccountState.Frozen)
  })

  test('parseExtensions handles multiple extensions', () => {
    const BASE_MINT_SIZE = 82
    // DefaultAccountState (1 byte) + CpiGuard (1 byte)
    const totalSize = BASE_MINT_SIZE + 1 + (4 + 1) + (4 + 1)
    const buf = Buffer.alloc(totalSize)
    buf[BASE_MINT_SIZE] = 1

    let offset = BASE_MINT_SIZE + 1
    // DefaultAccountState
    buf.writeUInt16LE(ExtensionType.DefaultAccountState, offset)
    buf.writeUInt16LE(1, offset + 2)
    buf[offset + 4] = AccountState.Initialized
    offset += 4 + 1

    // CpiGuard
    buf.writeUInt16LE(ExtensionType.CpiGuard, offset)
    buf.writeUInt16LE(1, offset + 2)
    buf[offset + 4] = 1 // locked
    offset += 4 + 1

    const extensions = parseExtensions(buf)
    expect(extensions).toHaveLength(2)
    expect(extensions[0].type).toBe(ExtensionType.DefaultAccountState)
    expect(extensions[1].type).toBe(ExtensionType.CpiGuard)
    expect((extensions[1].data as any).lockCpi).toBe(true)
  })

  test('parseExtensions returns empty for small buffers', () => {
    const buf = Buffer.alloc(82)
    const extensions = parseExtensions(buf)
    expect(extensions).toHaveLength(0)
  })
})

// ============================================
// 3. Instruction Builders
// ============================================

describe('Instruction Builders', () => {
  const mint = Keypair.generate().publicKey
  const authority = Keypair.generate().publicKey
  const account = Keypair.generate().publicKey

  test('harvestWithheldTokensToMint creates correct instruction', () => {
    const sources = [Keypair.generate().publicKey, Keypair.generate().publicKey]
    const ix = harvestWithheldTokensToMint({ mint, sources })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(3) // mint + 2 sources
    expect(ix.keys[0].pubkey.toBase58()).toBe(mint.toBase58())
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.data[0]).toBe(26) // opcode
    expect(ix.data[1]).toBe(4)  // sub-instruction
  })

  test('amountToUiAmount creates correct instruction', () => {
    const ix = amountToUiAmount({ mint, amount: 1000000n })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(1)
    expect(ix.keys[0].pubkey.toBase58()).toBe(mint.toBase58())
    expect(ix.data[0]).toBe(23)
    expect(ix.data.readBigUInt64LE(1)).toBe(1000000n)
  })

  test('uiAmountToAmount creates correct instruction', () => {
    const ix = uiAmountToAmount({ mint, uiAmount: '1.5' })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(1)
    expect(ix.data[0]).toBe(24)
    // Verify the string is encoded
    const encoded = ix.data.subarray(1, 1 + 3)
    expect(Buffer.from(encoded).toString('utf-8')).toBe('1.5')
  })

  test('updateTransferHook creates correct instruction', () => {
    const newProgramId = Keypair.generate().publicKey
    const ix = updateTransferHook({ mint, authority, newProgramId })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(2)
    expect(ix.keys[0].pubkey.toBase58()).toBe(mint.toBase58())
    expect(ix.keys[1].pubkey.toBase58()).toBe(authority.toBase58())
    expect(ix.keys[1].isSigner).toBe(true)
    expect(ix.data[0]).toBe(36) // opcode
    expect(ix.data[1]).toBe(1)  // sub-instruction
    // Verify new program ID encoded at offset 2
    const encodedProgramId = new PublicKey(ix.data.subarray(2, 34))
    expect(encodedProgramId.toBase58()).toBe(newProgramId.toBase58())
  })

  test('updateMetadataPointer creates correct instruction', () => {
    const newMetadataAddress = Keypair.generate().publicKey
    const ix = updateMetadataPointer({ mint, authority, newMetadataAddress })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(2)
    expect(ix.data[0]).toBe(39)
    expect(ix.data[1]).toBe(1)
    const encodedAddr = new PublicKey(ix.data.subarray(2, 34))
    expect(encodedAddr.toBase58()).toBe(newMetadataAddress.toBase58())
  })

  test('updateDefaultAccountState creates correct instruction', () => {
    const ix = updateDefaultAccountState({ mint, authority, state: AccountState.Frozen })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(2)
    expect(ix.data[0]).toBe(28)
    expect(ix.data[1]).toBe(1)
    expect(ix.data[2]).toBe(AccountState.Frozen)
  })

  test('initializeConfidentialTransferMint creates correct instruction', () => {
    const ix = initializeConfidentialTransferMint({
      mint,
      authority,
      autoApproveNewAccounts: true,
    })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(1)
    expect(ix.keys[0].pubkey.toBase58()).toBe(mint.toBase58())
    expect(ix.data[0]).toBe(27) // opcode
    expect(ix.data[1]).toBe(0)  // sub-instruction
    expect(ix.data[2]).toBe(1)  // authority present
    // Authority encoded at offset 3
    const encodedAuth = new PublicKey(ix.data.subarray(3, 35))
    expect(encodedAuth.toBase58()).toBe(authority.toBase58())
    expect(ix.data[35]).toBe(1) // autoApproveNewAccounts
  })

  test('initializeConfidentialTransferMint handles no authority', () => {
    const ix = initializeConfidentialTransferMint({
      mint,
      autoApproveNewAccounts: false,
    })

    expect(ix.data[0]).toBe(27)
    expect(ix.data[1]).toBe(0)
    expect(ix.data[2]).toBe(0) // no authority
    expect(ix.data[35]).toBe(0) // autoApproveNewAccounts = false
  })

  test('enableCpiGuard creates correct instruction', () => {
    const ix = enableCpiGuard({ account, owner: authority })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(2)
    expect(ix.keys[0].pubkey.toBase58()).toBe(account.toBase58())
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.keys[1].pubkey.toBase58()).toBe(authority.toBase58())
    expect(ix.keys[1].isSigner).toBe(true)
    expect(ix.data[0]).toBe(34)
    expect(ix.data[1]).toBe(0) // enable
  })

  test('disableCpiGuard creates correct instruction', () => {
    const ix = disableCpiGuard({ account, owner: authority })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(2)
    expect(ix.data[0]).toBe(34)
    expect(ix.data[1]).toBe(1) // disable
  })

  test('initializeGroupPointer creates correct instruction', () => {
    const groupAddress = Keypair.generate().publicKey
    const ix = initializeGroupPointer({ mint, authority, groupAddress })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(1)
    expect(ix.keys[0].pubkey.toBase58()).toBe(mint.toBase58())
    expect(ix.data[0]).toBe(40) // opcode
    expect(ix.data[1]).toBe(0)  // sub-instruction

    const encodedAuth = new PublicKey(ix.data.subarray(2, 34))
    expect(encodedAuth.toBase58()).toBe(authority.toBase58())

    const encodedGroup = new PublicKey(ix.data.subarray(34, 66))
    expect(encodedGroup.toBase58()).toBe(groupAddress.toBase58())
  })

  test('initializeGroupMemberPointer creates correct instruction', () => {
    const memberAddress = Keypair.generate().publicKey
    const ix = initializeGroupMemberPointer({ mint, authority, memberAddress })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(1)
    expect(ix.keys[0].pubkey.toBase58()).toBe(mint.toBase58())
    expect(ix.data[0]).toBe(41) // opcode
    expect(ix.data[1]).toBe(0)  // sub-instruction

    const encodedAuth = new PublicKey(ix.data.subarray(2, 34))
    expect(encodedAuth.toBase58()).toBe(authority.toBase58())

    const encodedMember = new PublicKey(ix.data.subarray(34, 66))
    expect(encodedMember.toBase58()).toBe(memberAddress.toBase58())
  })

  test('initializeGroupPointer handles null authority and address', () => {
    const ix = initializeGroupPointer({ mint })

    expect(ix.data[0]).toBe(40)
    expect(ix.data[1]).toBe(0)
    // Authority should be zeroed
    const authBytes = ix.data.subarray(2, 34)
    expect(authBytes.every((b: number) => b === 0)).toBe(true)
  })

  // Existing instruction builders - verify they still work
  test('initializeMint2 creates correct instruction', () => {
    const freezeAuth = Keypair.generate().publicKey
    const ix = initializeMint2({
      mint,
      decimals: 9,
      mintAuthority: authority,
      freezeAuthority: freezeAuth,
    })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.data[0]).toBe(20) // InitializeMint2
    expect(ix.data[1]).toBe(9)  // decimals
    expect(ix.data[34]).toBe(1) // has freeze authority
  })

  test('initializeTransferFeeConfig creates correct instruction', () => {
    const ix = initializeTransferFeeConfig({
      mint,
      transferFeeConfigAuthority: authority,
      withdrawWithheldAuthority: authority,
      transferFeeBasisPoints: 500,
      maximumFee: 1000000n,
    })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.data[0]).toBe(26) // opcode
    expect(ix.data.readUInt16LE(67)).toBe(500)
    expect(ix.data.readBigUInt64LE(69)).toBe(1000000n)
  })

  test('setTransferFee creates correct instruction', () => {
    const ix = setTransferFee({
      mint,
      authority,
      transferFeeBasisPoints: 300,
      maximumFee: 500000n,
    })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.data[0]).toBe(27)
    expect(ix.data.readUInt16LE(1)).toBe(300)
    expect(ix.data.readBigUInt64LE(3)).toBe(500000n)
  })

  test('withdrawWithheldTokensFromAccounts creates correct instruction', () => {
    const destination = Keypair.generate().publicKey
    const sources = [Keypair.generate().publicKey]
    const ix = withdrawWithheldTokensFromAccounts({
      mint,
      destination,
      authority,
      sources,
    })

    expect(ix.programId.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
    expect(ix.keys).toHaveLength(4) // mint + destination + authority + 1 source
    expect(ix.data[0]).toBe(29)
    expect(ix.data[1]).toBe(1) // sources count
  })
})

// ============================================
// 4. Confidential Transfer Stubs
// ============================================

describe('Confidential Transfer Stubs', () => {
  test('configureConfidentialTransferAccount throws descriptive error', () => {
    const account = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey

    expect(() => {
      configureConfidentialTransferAccount({ account, mint, authority })
    }).toThrow('ElGamal encryption')
  })

  test('confidentialTransfer throws descriptive error', () => {
    const source = Keypair.generate().publicKey
    const destination = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey

    expect(() => {
      confidentialTransfer({
        source,
        destination,
        mint,
        authority,
        amount: 1000n,
      })
    }).toThrow('zero-knowledge proofs')
  })

  test('configureConfidentialTransferAccount error includes documentation link', () => {
    try {
      configureConfidentialTransferAccount({
        account: Keypair.generate().publicKey,
        mint: Keypair.generate().publicKey,
        authority: Keypair.generate().publicKey,
      })
    } catch (e) {
      expect((e as Error).message).toContain('spl.solana.com/confidential-token')
    }
  })

  test('confidentialTransfer error includes documentation link', () => {
    try {
      confidentialTransfer({
        source: Keypair.generate().publicKey,
        destination: Keypair.generate().publicKey,
        mint: Keypair.generate().publicKey,
        authority: Keypair.generate().publicKey,
        amount: 1000n,
      })
    } catch (e) {
      expect((e as Error).message).toContain('spl.solana.com/confidential-token')
    }
  })
})

// ============================================
// 5. ExtensionConfig Type Coverage
// ============================================

describe('ExtensionConfig Type Coverage', () => {
  test('all extension config variants can be constructed', () => {
    const pubkey = Keypair.generate().publicKey

    const configs: ExtensionConfig[] = [
      { type: 'transferFee', feeBasisPoints: 500, maxFee: 1000000n, feeAuthority: pubkey, withdrawAuthority: pubkey },
      { type: 'interestBearing', rate: 100, rateAuthority: pubkey },
      { type: 'permanentDelegate', delegate: pubkey },
      { type: 'transferHook', programId: pubkey, authority: pubkey },
      { type: 'metadataPointer', metadataAddress: pubkey, authority: pubkey },
      { type: 'mintCloseAuthority', closeAuthority: pubkey },
      { type: 'defaultAccountState', state: AccountState.Frozen },
      { type: 'nonTransferable' },
      { type: 'immutableOwner' },
      { type: 'memoTransfer' },
      { type: 'cpiGuard' },
      { type: 'confidentialTransfer', authority: pubkey, autoApproveNewAccounts: true },
      { type: 'groupPointer', authority: pubkey, groupAddress: pubkey },
      { type: 'groupMemberPointer', authority: pubkey, memberAddress: pubkey },
    ]

    expect(configs).toHaveLength(14)

    // Verify all have a type property
    for (const config of configs) {
      expect(config.type).toBeDefined()
      expect(typeof config.type).toBe('string')
    }
  })

  test('confidentialTransfer config with optional fields', () => {
    const config: ExtensionConfig = { type: 'confidentialTransfer' }
    expect(config.type).toBe('confidentialTransfer')
  })

  test('groupPointer config with optional fields', () => {
    const config: ExtensionConfig = { type: 'groupPointer' }
    expect(config.type).toBe('groupPointer')
  })

  test('groupMemberPointer config with optional fields', () => {
    const config: ExtensionConfig = { type: 'groupMemberPointer' }
    expect(config.type).toBe('groupMemberPointer')
  })
})
