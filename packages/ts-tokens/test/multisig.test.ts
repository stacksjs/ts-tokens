/**
 * Multi-Sig Module Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import {
  MULTISIG_PROGRAM_ID,
  DISCRIMINATORS,
  getMultisigAddress,
  getTransactionAddress,
  serializeCreateMultisigData,
  serializeAddOwnerData,
  serializeRemoveOwnerData,
  serializeChangeThresholdData,
  serializeCreateTransactionData,
} from '../src/multisig/program'
import {
  createCreateMultisigInstruction,
  createAddOwnerInstruction,
  createRemoveOwnerInstruction,
  createChangeThresholdInstruction,
  createProposeTransactionInstruction,
  createApproveTransactionInstruction,
  createRejectTransactionInstruction,
  createExecuteTransactionInstruction,
  createCancelTransactionInstruction,
} from '../src/multisig/instructions'
import {
  validateMultisigConfig,
} from '../src/multisig/create'
import type {
  MultisigResult,
  OnChainMultisig,
  OnChainTransaction,
  AddOwnerOptions,
  RemoveOwnerOptions,
  ChangeThresholdOptions,
  ProposeTransactionOptions,
  TransactionActionOptions,
  SetTokenAuthorityMultisigOptions,
  MultisigHistoryEntry,
} from '../src/multisig/types'

// ---------------------------------------------------------------------------
// 1. Program constants
// ---------------------------------------------------------------------------

describe('Multisig program constants', () => {
  test('MULTISIG_PROGRAM_ID is a valid PublicKey', () => {
    expect(MULTISIG_PROGRAM_ID).toBeInstanceOf(PublicKey)
    expect(MULTISIG_PROGRAM_ID.toBase58()).toBeTruthy()
  })

  test('discriminators are 8-byte buffers', () => {
    for (const [name, disc] of Object.entries(DISCRIMINATORS)) {
      expect(disc).toBeInstanceOf(Buffer)
      expect(disc.length).toBe(8)
    }
  })

  test('all 9 discriminators exist', () => {
    expect(Object.keys(DISCRIMINATORS).length).toBe(9)
  })

  test('discriminators have unique first byte', () => {
    const firstBytes = Object.values(DISCRIMINATORS).map(d => d[0])
    const unique = new Set(firstBytes)
    expect(unique.size).toBe(9)
  })

  test('discriminator names match expected set', () => {
    const names = Object.keys(DISCRIMINATORS)
    expect(names).toContain('createMultisig')
    expect(names).toContain('addOwner')
    expect(names).toContain('removeOwner')
    expect(names).toContain('changeThreshold')
    expect(names).toContain('createTransaction')
    expect(names).toContain('approveTransaction')
    expect(names).toContain('rejectTransaction')
    expect(names).toContain('executeTransaction')
    expect(names).toContain('cancelTransaction')
  })
})

// ---------------------------------------------------------------------------
// 2. PDA derivation
// ---------------------------------------------------------------------------

describe('Multisig PDA derivation', () => {
  const creator = Keypair.generate().publicKey
  const multisig = Keypair.generate().publicKey

  test('getMultisigAddress returns valid PublicKey', () => {
    const address = getMultisigAddress(creator, 0n)
    expect(address).toBeInstanceOf(PublicKey)
  })

  test('getMultisigAddress is deterministic', () => {
    const addr1 = getMultisigAddress(creator, 0n)
    const addr2 = getMultisigAddress(creator, 0n)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('different nonces produce different PDAs', () => {
    const addr1 = getMultisigAddress(creator, 0n)
    const addr2 = getMultisigAddress(creator, 1n)
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })

  test('different creators produce different PDAs', () => {
    const other = Keypair.generate().publicKey
    const addr1 = getMultisigAddress(creator, 0n)
    const addr2 = getMultisigAddress(other, 0n)
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })

  test('getTransactionAddress returns valid PublicKey', () => {
    const address = getTransactionAddress(multisig, 0n)
    expect(address).toBeInstanceOf(PublicKey)
  })

  test('getTransactionAddress is deterministic', () => {
    const addr1 = getTransactionAddress(multisig, 0n)
    const addr2 = getTransactionAddress(multisig, 0n)
    expect(addr1.toBase58()).toBe(addr2.toBase58())
  })

  test('different tx indices produce different PDAs', () => {
    const addr1 = getTransactionAddress(multisig, 0n)
    const addr2 = getTransactionAddress(multisig, 1n)
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })

  test('different multisigs produce different transaction PDAs', () => {
    const other = Keypair.generate().publicKey
    const addr1 = getTransactionAddress(multisig, 0n)
    const addr2 = getTransactionAddress(other, 0n)
    expect(addr1.toBase58()).not.toBe(addr2.toBase58())
  })
})

// ---------------------------------------------------------------------------
// 3. Instruction builders
// ---------------------------------------------------------------------------

describe('Multisig instruction builders', () => {
  const creator = Keypair.generate().publicKey
  const multisig = Keypair.generate().publicKey
  const owner = Keypair.generate().publicKey
  const newOwner = Keypair.generate().publicKey
  const transaction = Keypair.generate().publicKey

  test('createCreateMultisigInstruction has correct programId', () => {
    const ix = createCreateMultisigInstruction(creator, multisig, [owner, newOwner], 2)
    expect(ix.programId.toBase58()).toBe(MULTISIG_PROGRAM_ID.toBase58())
  })

  test('createCreateMultisigInstruction has 3 accounts', () => {
    const ix = createCreateMultisigInstruction(creator, multisig, [owner, newOwner], 2)
    expect(ix.keys.length).toBe(3)
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.keys[1].isWritable).toBe(true)
    expect(ix.keys[2].pubkey.toBase58()).toBe(SystemProgram.programId.toBase58())
  })

  test('createCreateMultisigInstruction data contains owner pubkeys', () => {
    const owners = [owner, newOwner]
    const ix = createCreateMultisigInstruction(creator, multisig, owners, 2)
    // 8 (disc) + 1 (threshold) + 1 (ownerCount) + 2*32 (owners)
    expect(ix.data.length).toBe(10 + 64)
    expect(ix.data[8]).toBe(2) // threshold
    expect(ix.data[9]).toBe(2) // owner count
  })

  test('createAddOwnerInstruction has correct structure', () => {
    const ix = createAddOwnerInstruction(multisig, owner, newOwner)
    expect(ix.programId.toBase58()).toBe(MULTISIG_PROGRAM_ID.toBase58())
    expect(ix.keys.length).toBe(2)
    expect(ix.keys[0].isWritable).toBe(true)  // multisig
    expect(ix.keys[1].isSigner).toBe(true)    // owner
    expect(ix.data[0]).toBe(DISCRIMINATORS.addOwner[0])
    // 8 (disc) + 32 (pubkey)
    expect(ix.data.length).toBe(40)
  })

  test('createRemoveOwnerInstruction has correct structure', () => {
    const ix = createRemoveOwnerInstruction(multisig, owner, newOwner)
    expect(ix.programId.toBase58()).toBe(MULTISIG_PROGRAM_ID.toBase58())
    expect(ix.keys.length).toBe(2)
    expect(ix.data[0]).toBe(DISCRIMINATORS.removeOwner[0])
    expect(ix.data.length).toBe(40)
  })

  test('createChangeThresholdInstruction has correct structure', () => {
    const ix = createChangeThresholdInstruction(multisig, owner, 3)
    expect(ix.programId.toBase58()).toBe(MULTISIG_PROGRAM_ID.toBase58())
    expect(ix.keys.length).toBe(2)
    expect(ix.data[0]).toBe(DISCRIMINATORS.changeThreshold[0])
    // 8 (disc) + 1 (threshold)
    expect(ix.data.length).toBe(9)
    expect(ix.data[8]).toBe(3) // new threshold value
  })

  test('createProposeTransactionInstruction has 4 accounts', () => {
    const ixData = Buffer.from([1, 2, 3, 4])
    const ix = createProposeTransactionInstruction(creator, multisig, transaction, ixData)
    expect(ix.keys.length).toBe(4)
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.keys[0].isWritable).toBe(true) // proposer
    expect(ix.keys[1].isWritable).toBe(true) // multisig
    expect(ix.keys[2].isWritable).toBe(true) // transaction
    expect(ix.keys[3].pubkey.toBase58()).toBe(SystemProgram.programId.toBase58())
  })

  test('createProposeTransactionInstruction data without expiry', () => {
    const ixData = Buffer.from([1, 2, 3, 4])
    const ix = createProposeTransactionInstruction(creator, multisig, transaction, ixData)
    expect(ix.data[0]).toBe(DISCRIMINATORS.createTransaction[0])
    // 8 (disc) + 4 (len) + 4 (data) + 1 (no expiry) = 17
    expect(ix.data.length).toBe(17)
  })

  test('createProposeTransactionInstruction data with expiry', () => {
    const ixData = Buffer.from([1, 2, 3, 4])
    const expiresAt = 1700000000n
    const ix = createProposeTransactionInstruction(creator, multisig, transaction, ixData, expiresAt)
    // 8 (disc) + 4 (len) + 4 (data) + 1 (has expiry) + 8 (expiry) = 25
    expect(ix.data.length).toBe(25)
  })

  test('createApproveTransactionInstruction has correct structure', () => {
    const ix = createApproveTransactionInstruction(owner, multisig, transaction)
    expect(ix.programId.toBase58()).toBe(MULTISIG_PROGRAM_ID.toBase58())
    expect(ix.keys.length).toBe(3)
    expect(ix.keys[0].isSigner).toBe(true)   // owner
    expect(ix.keys[2].isWritable).toBe(true)  // transaction
    expect(ix.data[0]).toBe(DISCRIMINATORS.approveTransaction[0])
  })

  test('createRejectTransactionInstruction has correct structure', () => {
    const ix = createRejectTransactionInstruction(owner, multisig, transaction)
    expect(ix.keys.length).toBe(3)
    expect(ix.data[0]).toBe(DISCRIMINATORS.rejectTransaction[0])
  })

  test('createExecuteTransactionInstruction has correct structure', () => {
    const ix = createExecuteTransactionInstruction(creator, multisig, transaction)
    expect(ix.keys.length).toBe(3)
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.keys[0].isWritable).toBe(true)  // executor
    expect(ix.keys[1].isWritable).toBe(true)  // multisig
    expect(ix.keys[2].isWritable).toBe(true)  // transaction
    expect(ix.data[0]).toBe(DISCRIMINATORS.executeTransaction[0])
  })

  test('createCancelTransactionInstruction has correct structure', () => {
    const ix = createCancelTransactionInstruction(creator, multisig, transaction)
    expect(ix.keys.length).toBe(3)
    expect(ix.keys[0].isSigner).toBe(true)   // proposer
    expect(ix.keys[2].isWritable).toBe(true)  // transaction
    expect(ix.data[0]).toBe(DISCRIMINATORS.cancelTransaction[0])
  })
})

// ---------------------------------------------------------------------------
// 4. Serializers
// ---------------------------------------------------------------------------

describe('Multisig serializers', () => {
  test('serializeCreateMultisigData produces correct buffer', () => {
    const data = serializeCreateMultisigData(2, 3)
    // 8 (disc) + 1 (threshold) + 1 (ownerCount) = 10
    expect(data.length).toBe(10)
    expect(data[0]).toBe(0) // createMultisig discriminator
    expect(data[8]).toBe(2) // threshold
    expect(data[9]).toBe(3) // ownerCount
  })

  test('serializeAddOwnerData produces correct buffer', () => {
    const owner = Keypair.generate().publicKey
    const data = serializeAddOwnerData(owner)
    // 8 (disc) + 32 (pubkey) = 40
    expect(data.length).toBe(40)
    expect(data[0]).toBe(1) // addOwner discriminator
    const embeddedKey = new PublicKey(data.subarray(8, 40))
    expect(embeddedKey.toBase58()).toBe(owner.toBase58())
  })

  test('serializeRemoveOwnerData produces correct buffer', () => {
    const owner = Keypair.generate().publicKey
    const data = serializeRemoveOwnerData(owner)
    expect(data.length).toBe(40)
    expect(data[0]).toBe(2) // removeOwner discriminator
    const embeddedKey = new PublicKey(data.subarray(8, 40))
    expect(embeddedKey.toBase58()).toBe(owner.toBase58())
  })

  test('serializeChangeThresholdData produces correct buffer', () => {
    const data = serializeChangeThresholdData(5)
    // 8 (disc) + 1 (threshold) = 9
    expect(data.length).toBe(9)
    expect(data[0]).toBe(3) // changeThreshold discriminator
    expect(data[8]).toBe(5)
  })

  test('serializeCreateTransactionData without expiry', () => {
    const ixData = Buffer.from([10, 20, 30])
    const data = serializeCreateTransactionData(ixData)
    // 8 (disc) + 4 (len) + 3 (data) + 1 (no expiry) = 16
    expect(data.length).toBe(16)
    expect(data[0]).toBe(4) // createTransaction discriminator
    expect(data.readUInt32LE(8)).toBe(3) // instruction data length
    expect(data[12]).toBe(10)
    expect(data[13]).toBe(20)
    expect(data[14]).toBe(30)
    expect(data[15]).toBe(0) // no expiry
  })

  test('serializeCreateTransactionData with expiry', () => {
    const ixData = Buffer.from([10, 20])
    const expiresAt = 1700000000n
    const data = serializeCreateTransactionData(ixData, expiresAt)
    // 8 (disc) + 4 (len) + 2 (data) + 1 (has expiry) + 8 (expiry) = 23
    expect(data.length).toBe(23)
    expect(data[14]).toBe(1) // has expiry
    expect(data.readBigInt64LE(15)).toBe(1700000000n)
  })
})

// ---------------------------------------------------------------------------
// 5. validateMultisigConfig
// ---------------------------------------------------------------------------

describe('validateMultisigConfig', () => {
  test('returns no errors for valid config', () => {
    const owner1 = Keypair.generate().publicKey
    const owner2 = Keypair.generate().publicKey
    const errors = validateMultisigConfig({
      signers: [owner1, owner2],
      threshold: 2,
    })
    expect(errors).toEqual([])
  })

  test('errors when too few signers', () => {
    const owner = Keypair.generate().publicKey
    const errors = validateMultisigConfig({
      signers: [owner],
      threshold: 1,
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('2 signers')
  })

  test('errors when too many signers', () => {
    const signers = Array.from({ length: 12 }, () => Keypair.generate().publicKey)
    const errors = validateMultisigConfig({
      signers,
      threshold: 2,
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('11')
  })

  test('errors when threshold > signers count', () => {
    const owner1 = Keypair.generate().publicKey
    const owner2 = Keypair.generate().publicKey
    const errors = validateMultisigConfig({
      signers: [owner1, owner2],
      threshold: 5,
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('exceed')
  })

  test('errors when threshold < 1', () => {
    const owner1 = Keypair.generate().publicKey
    const owner2 = Keypair.generate().publicKey
    const errors = validateMultisigConfig({
      signers: [owner1, owner2],
      threshold: 0,
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('at least 1')
  })

  test('errors on duplicate signers', () => {
    const owner = Keypair.generate().publicKey
    const errors = validateMultisigConfig({
      signers: [owner, owner],
      threshold: 1,
    })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.toLowerCase().includes('duplicate'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. Existing sign.ts flow
// ---------------------------------------------------------------------------

describe('In-memory multisig sign flow', () => {
  // These tests require a connection mock — testing the interface contracts
  test('MultisigTransaction type has expected fields', () => {
    const tx: import('../src/multisig/types').MultisigTransaction = {
      id: 'tx_123',
      multisig: Keypair.generate().publicKey,
      instruction: Buffer.from([1, 2, 3]),
      signers: [Keypair.generate().publicKey],
      signatures: new Map(),
      executed: false,
      createdAt: new Date(),
    }
    expect(tx.id).toBeTruthy()
    expect(tx.executed).toBe(false)
    expect(tx.signatures.size).toBe(0)
  })

  test('MultisigTransaction supports optional expiresAt', () => {
    const tx: import('../src/multisig/types').MultisigTransaction = {
      id: 'tx_456',
      multisig: Keypair.generate().publicKey,
      instruction: Buffer.from([]),
      signers: [],
      signatures: new Map(),
      executed: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
    expect(tx.expiresAt).toBeDefined()
    expect(tx.expiresAt!.getTime()).toBeGreaterThan(Date.now())
  })
})

// ---------------------------------------------------------------------------
// 7. Token authority integration types
// ---------------------------------------------------------------------------

describe('Token authority integration types', () => {
  test('SetTokenAuthorityMultisigOptions accepts mint authority', () => {
    const options: SetTokenAuthorityMultisigOptions = {
      mint: Keypair.generate().publicKey,
      authorityType: 'mint',
      multisig: Keypair.generate().publicKey,
    }
    expect(options.authorityType).toBe('mint')
  })

  test('SetTokenAuthorityMultisigOptions accepts freeze authority', () => {
    const options: SetTokenAuthorityMultisigOptions = {
      mint: Keypair.generate().publicKey,
      authorityType: 'freeze',
      multisig: Keypair.generate().publicKey,
    }
    expect(options.authorityType).toBe('freeze')
  })

  test('MultisigResult has expected shape', () => {
    const result: MultisigResult = {
      signature: 'abc123',
      confirmed: true,
      multisig: 'address123',
    }
    expect(result.signature).toBeTruthy()
    expect(result.confirmed).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('MultisigResult can include error', () => {
    const result: MultisigResult = {
      signature: '',
      confirmed: false,
      error: 'Something went wrong',
    }
    expect(result.error).toBe('Something went wrong')
  })
})

// ---------------------------------------------------------------------------
// 8. Transaction expiry
// ---------------------------------------------------------------------------

describe('Transaction expiry', () => {
  test('serializeCreateTransactionData encodes expiry correctly', () => {
    const ixData = Buffer.from([1])
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 604800) // 7 days
    const data = serializeCreateTransactionData(ixData, expiresAt)
    // Check has-expiry flag
    const expiryFlagOffset = 8 + 4 + 1 // disc + len + data
    expect(data[expiryFlagOffset]).toBe(1)
    // Check expiry value
    const encodedExpiry = data.readBigInt64LE(expiryFlagOffset + 1)
    expect(encodedExpiry).toBe(expiresAt)
  })

  test('serializeCreateTransactionData omits expiry when not provided', () => {
    const ixData = Buffer.from([1])
    const data = serializeCreateTransactionData(ixData)
    const expiryFlagOffset = 8 + 4 + 1
    expect(data[expiryFlagOffset]).toBe(0)
    // No extra bytes for expiry value
    expect(data.length).toBe(expiryFlagOffset + 1)
  })

  test('OnChainTransaction type supports optional expiresAt', () => {
    const tx: OnChainTransaction = {
      address: Keypair.generate().publicKey,
      multisig: Keypair.generate().publicKey,
      proposer: Keypair.generate().publicKey,
      instructionData: Buffer.from([]),
      approvals: [],
      rejections: [],
      executed: false,
      createdAt: BigInt(Math.floor(Date.now() / 1000)),
    }
    expect(tx.expiresAt).toBeUndefined()

    const txWithExpiry: OnChainTransaction = {
      ...tx,
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 604800),
    }
    expect(txWithExpiry.expiresAt).toBeDefined()
  })

  test('MultisigHistoryEntry has expected shape', () => {
    const entry: MultisigHistoryEntry = {
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      action: 'proposed',
      signature: 'sig_abc',
      actor: Keypair.generate().publicKey,
    }
    expect(entry.action).toBe('proposed')
    expect(entry.actor).toBeInstanceOf(PublicKey)
  })
})
