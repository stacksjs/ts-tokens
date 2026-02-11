import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import {
  approveCollectionAuthority,
  revokeCollectionAuthority,
  setCollectionSize,
} from '../src/programs/token-metadata/instructions'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

describe('approveCollectionAuthority', () => {
  test('should create instruction with correct program ID', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      newCollectionAuthority: Keypair.generate().publicKey,
      updateAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = approveCollectionAuthority(params)
    expect(ix.programId.toBase58()).toBe(TOKEN_METADATA_PROGRAM_ID.toBase58())
  })

  test('should have 8 account keys', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      newCollectionAuthority: Keypair.generate().publicKey,
      updateAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = approveCollectionAuthority(params)
    expect(ix.keys.length).toBe(8)
  })

  test('should set correct signer/writable flags', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      newCollectionAuthority: Keypair.generate().publicKey,
      updateAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = approveCollectionAuthority(params)

    // collectionAuthorityRecord: writable, not signer
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.keys[0].isSigner).toBe(false)

    // newCollectionAuthority: not writable, not signer
    expect(ix.keys[1].isWritable).toBe(false)
    expect(ix.keys[1].isSigner).toBe(false)

    // updateAuthority: signer, writable
    expect(ix.keys[2].isSigner).toBe(true)
    expect(ix.keys[2].isWritable).toBe(true)

    // payer: signer, writable
    expect(ix.keys[3].isSigner).toBe(true)
    expect(ix.keys[3].isWritable).toBe(true)

    // metadata: not writable
    expect(ix.keys[4].isWritable).toBe(false)

    // mint: not writable
    expect(ix.keys[5].isWritable).toBe(false)

    // system program
    expect(ix.keys[6].pubkey.toBase58()).toBe(SystemProgram.programId.toBase58())

    // rent sysvar
    expect(ix.keys[7].pubkey.toBase58()).toBe(SYSVAR_RENT_PUBKEY.toBase58())
  })

  test('should encode discriminator 23 in data', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      newCollectionAuthority: Keypair.generate().publicKey,
      updateAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = approveCollectionAuthority(params)
    expect(ix.data.length).toBe(1)
    expect(ix.data[0]).toBe(23)
  })

  test('should use provided public keys in correct positions', () => {
    const keys = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      newCollectionAuthority: Keypair.generate().publicKey,
      updateAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = approveCollectionAuthority(keys)
    expect(ix.keys[0].pubkey.toBase58()).toBe(keys.collectionAuthorityRecord.toBase58())
    expect(ix.keys[1].pubkey.toBase58()).toBe(keys.newCollectionAuthority.toBase58())
    expect(ix.keys[2].pubkey.toBase58()).toBe(keys.updateAuthority.toBase58())
    expect(ix.keys[3].pubkey.toBase58()).toBe(keys.payer.toBase58())
    expect(ix.keys[4].pubkey.toBase58()).toBe(keys.metadata.toBase58())
    expect(ix.keys[5].pubkey.toBase58()).toBe(keys.mint.toBase58())
  })
})

describe('revokeCollectionAuthority', () => {
  test('should create instruction with correct program ID', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      delegateAuthority: Keypair.generate().publicKey,
      revokeAuthority: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = revokeCollectionAuthority(params)
    expect(ix.programId.toBase58()).toBe(TOKEN_METADATA_PROGRAM_ID.toBase58())
  })

  test('should have 5 account keys', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      delegateAuthority: Keypair.generate().publicKey,
      revokeAuthority: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = revokeCollectionAuthority(params)
    expect(ix.keys.length).toBe(5)
  })

  test('should encode discriminator 24 in data', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      delegateAuthority: Keypair.generate().publicKey,
      revokeAuthority: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = revokeCollectionAuthority(params)
    expect(ix.data.length).toBe(1)
    expect(ix.data[0]).toBe(24)
  })

  test('should set correct signer/writable flags', () => {
    const params = {
      collectionAuthorityRecord: Keypair.generate().publicKey,
      delegateAuthority: Keypair.generate().publicKey,
      revokeAuthority: Keypair.generate().publicKey,
      metadata: Keypair.generate().publicKey,
      mint: Keypair.generate().publicKey,
    }

    const ix = revokeCollectionAuthority(params)

    // collectionAuthorityRecord: writable
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.keys[0].isSigner).toBe(false)

    // delegateAuthority: writable (receives rent back)
    expect(ix.keys[1].isWritable).toBe(true)

    // revokeAuthority: signer
    expect(ix.keys[2].isSigner).toBe(true)

    // metadata: not writable
    expect(ix.keys[3].isWritable).toBe(false)

    // mint: not writable
    expect(ix.keys[4].isWritable).toBe(false)
  })
})

describe('setCollectionSize', () => {
  test('should create instruction with correct program ID', () => {
    const params = {
      collectionMetadata: Keypair.generate().publicKey,
      collectionAuthority: Keypair.generate().publicKey,
      collectionMint: Keypair.generate().publicKey,
      size: 100n,
    }

    const ix = setCollectionSize(params)
    expect(ix.programId.toBase58()).toBe(TOKEN_METADATA_PROGRAM_ID.toBase58())
  })

  test('should have 3 account keys without authority record', () => {
    const params = {
      collectionMetadata: Keypair.generate().publicKey,
      collectionAuthority: Keypair.generate().publicKey,
      collectionMint: Keypair.generate().publicKey,
      size: 100n,
    }

    const ix = setCollectionSize(params)
    expect(ix.keys.length).toBe(3)
  })

  test('should have 4 account keys with authority record', () => {
    const params = {
      collectionMetadata: Keypair.generate().publicKey,
      collectionAuthority: Keypair.generate().publicKey,
      collectionMint: Keypair.generate().publicKey,
      collectionAuthorityRecord: Keypair.generate().publicKey,
      size: 100n,
    }

    const ix = setCollectionSize(params)
    expect(ix.keys.length).toBe(4)
  })

  test('should encode discriminator 34 followed by size as u64LE', () => {
    const params = {
      collectionMetadata: Keypair.generate().publicKey,
      collectionAuthority: Keypair.generate().publicKey,
      collectionMint: Keypair.generate().publicKey,
      size: 1000n,
    }

    const ix = setCollectionSize(params)
    expect(ix.data.length).toBe(9) // 1 byte discriminator + 8 bytes u64
    expect(ix.data[0]).toBe(34)

    // Read size as u64LE
    const sizeBuffer = Buffer.from(ix.data.slice(1))
    const readSize = sizeBuffer.readBigUInt64LE(0)
    expect(readSize).toBe(1000n)
  })

  test('should encode zero size correctly', () => {
    const params = {
      collectionMetadata: Keypair.generate().publicKey,
      collectionAuthority: Keypair.generate().publicKey,
      collectionMint: Keypair.generate().publicKey,
      size: 0n,
    }

    const ix = setCollectionSize(params)
    const sizeBuffer = Buffer.from(ix.data.slice(1))
    expect(sizeBuffer.readBigUInt64LE(0)).toBe(0n)
  })

  test('should encode large size correctly', () => {
    const params = {
      collectionMetadata: Keypair.generate().publicKey,
      collectionAuthority: Keypair.generate().publicKey,
      collectionMint: Keypair.generate().publicKey,
      size: 999999n,
    }

    const ix = setCollectionSize(params)
    const sizeBuffer = Buffer.from(ix.data.slice(1))
    expect(sizeBuffer.readBigUInt64LE(0)).toBe(999999n)
  })

  test('should set correct signer/writable flags', () => {
    const params = {
      collectionMetadata: Keypair.generate().publicKey,
      collectionAuthority: Keypair.generate().publicKey,
      collectionMint: Keypair.generate().publicKey,
      size: 100n,
    }

    const ix = setCollectionSize(params)

    // collectionMetadata: writable
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.keys[0].isSigner).toBe(false)

    // collectionAuthority: signer, writable
    expect(ix.keys[1].isSigner).toBe(true)
    expect(ix.keys[1].isWritable).toBe(true)

    // collectionMint: not writable
    expect(ix.keys[2].isWritable).toBe(false)
  })
})
