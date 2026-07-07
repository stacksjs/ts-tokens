/**
 * Byte-level tests for compressed-NFT instruction builders and tree sizing.
 *
 * These guard the Anchor discriminators, the createTree data layout, the
 * concurrent Merkle tree size formula, and the (maxDepth, maxBufferSize)
 * validation table.
 */

import { describe, test, expect } from 'bun:test'
import { createHash } from 'node:crypto'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import {
  createTree,
  transfer,
  burn,
} from '../src/programs/bubblegum/instructions'
import {
  initMerkleTree,
  appendLeaf,
  replaceLeaf,
  verifyLeaf,
} from '../src/programs/account-compression/instructions'
import {
  getMerkleTreeAccountSize,
  isValidTreeConfig,
  assertValidTreeConfig,
  VALID_TREE_CONFIGS,
} from '../src/programs/account-compression/types'
import { calculateTreeSpace } from '../src/nft/compressed/tree'
import { verifyConcurrentMerkleProof } from '../src/programs/bubblegum/utils'

const ACCOUNT_COMPRESSION_PROGRAM_ID = 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'

function anchorDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

describe('Bubblegum discriminators (Anchor)', () => {
  test('transfer instruction uses sha256("global:transfer")[0..8]', () => {
    const ix = transfer({
      merkleTree: Keypair.generate().publicKey,
      treeAuthority: Keypair.generate().publicKey,
      leafOwner: Keypair.generate().publicKey,
      leafDelegate: Keypair.generate().publicKey,
      newLeafOwner: Keypair.generate().publicKey,
      root: new Uint8Array(32),
      dataHash: new Uint8Array(32),
      creatorHash: new Uint8Array(32),
      nonce: 0n,
      index: 0,
      proof: [],
    })
    expect(ix.data.subarray(0, 8).equals(anchorDiscriminator('transfer'))).toBe(true)
    expect(Array.from(ix.data.subarray(0, 8))).toEqual([163, 52, 200, 231, 140, 3, 69, 186])
  })

  test('burn instruction uses sha256("global:burn")[0..8]', () => {
    const ix = burn({
      merkleTree: Keypair.generate().publicKey,
      treeAuthority: Keypair.generate().publicKey,
      leafOwner: Keypair.generate().publicKey,
      leafDelegate: Keypair.generate().publicKey,
      root: new Uint8Array(32),
      dataHash: new Uint8Array(32),
      creatorHash: new Uint8Array(32),
      nonce: 0n,
      index: 0,
      proof: [],
    })
    expect(ix.data.subarray(0, 8).equals(anchorDiscriminator('burn'))).toBe(true)
    expect(Array.from(ix.data.subarray(0, 8))).toEqual([116, 110, 29, 56, 107, 219, 42, 93])
  })

  test('transfer/burn key lists include system_program before proof accounts', () => {
    const proofKey = Keypair.generate().publicKey
    const ix = transfer({
      merkleTree: Keypair.generate().publicKey,
      treeAuthority: Keypair.generate().publicKey,
      leafOwner: Keypair.generate().publicKey,
      leafDelegate: Keypair.generate().publicKey,
      newLeafOwner: Keypair.generate().publicKey,
      root: new Uint8Array(32),
      dataHash: new Uint8Array(32),
      creatorHash: new Uint8Array(32),
      nonce: 0n,
      index: 0,
      proof: [proofKey],
    })
    // Last fixed account before the single proof account must be System Program.
    const systemIdx = ix.keys.length - 2
    expect(ix.keys[systemIdx].pubkey.equals(SystemProgram.programId)).toBe(true)
    expect(ix.keys[ix.keys.length - 1].pubkey.equals(proofKey)).toBe(true)
  })
})

describe('Bubblegum createTree', () => {
  test('uses create_tree discriminator', () => {
    const ix = createTree({
      merkleTree: Keypair.generate().publicKey,
      treeAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      treeCreator: Keypair.generate().publicKey,
      maxDepth: 14,
      maxBufferSize: 64,
    })
    expect(Array.from(ix.data.subarray(0, 8))).toEqual([165, 83, 136, 142, 89, 202, 47, 220])
  })

  test('tree_authority comes before merkle_tree in the key list', () => {
    const treeAuthority = Keypair.generate().publicKey
    const merkleTree = Keypair.generate().publicKey
    const ix = createTree({
      merkleTree,
      treeAuthority,
      payer: Keypair.generate().publicKey,
      treeCreator: Keypair.generate().publicKey,
      maxDepth: 14,
      maxBufferSize: 64,
    })
    expect(ix.keys[0].pubkey.equals(treeAuthority)).toBe(true)
    expect(ix.keys[1].pubkey.equals(merkleTree)).toBe(true)
  })

  test('encodes maxDepth/maxBufferSize as u32 and public as Option<bool>=None', () => {
    const ix = createTree({
      merkleTree: Keypair.generate().publicKey,
      treeAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      treeCreator: Keypair.generate().publicKey,
      maxDepth: 20,
      maxBufferSize: 256,
    })
    // 8 discriminator + 4 maxDepth + 4 maxBufferSize + 1 (None) = 17
    expect(ix.data.length).toBe(17)
    expect(ix.data.readUInt32LE(8)).toBe(20)
    expect(ix.data.readUInt32LE(12)).toBe(256)
    expect(ix.data[16]).toBe(0) // Option::None
  })

  test('encodes public=true as Option<bool>=Some(true)', () => {
    const ix = createTree({
      merkleTree: Keypair.generate().publicKey,
      treeAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      treeCreator: Keypair.generate().publicKey,
      maxDepth: 14,
      maxBufferSize: 64,
      public: true,
    })
    // 8 + 4 + 4 + 2 (Some + bool) = 18
    expect(ix.data.length).toBe(18)
    expect(ix.data[16]).toBe(1) // Option::Some
    expect(ix.data[17]).toBe(1) // true
  })

  test('encodes public=false as Option<bool>=Some(false)', () => {
    const ix = createTree({
      merkleTree: Keypair.generate().publicKey,
      treeAuthority: Keypair.generate().publicKey,
      payer: Keypair.generate().publicKey,
      treeCreator: Keypair.generate().publicKey,
      maxDepth: 14,
      maxBufferSize: 64,
      public: false,
    })
    expect(ix.data.length).toBe(18)
    expect(ix.data[16]).toBe(1) // Option::Some
    expect(ix.data[17]).toBe(0) // false
  })
})

describe('Account compression discriminators (Anchor)', () => {
  const dummy = Keypair.generate().publicKey

  test('init_empty_merkle_tree', () => {
    const ix = initMerkleTree({
      merkleTree: dummy,
      authority: dummy,
      payer: dummy,
      maxDepth: 14,
      maxBufferSize: 64,
    })
    expect(Array.from(ix.data.subarray(0, 8))).toEqual([191, 11, 119, 7, 180, 107, 220, 110])
    // discriminator(8) + maxDepth(u32) + maxBufferSize(u32)
    expect(ix.data.readUInt32LE(8)).toBe(14)
    expect(ix.data.readUInt32LE(12)).toBe(64)
  })

  test('append', () => {
    const ix = appendLeaf({ merkleTree: dummy, authority: dummy, leaf: new Uint8Array(32) })
    expect(Array.from(ix.data.subarray(0, 8))).toEqual([149, 120, 18, 222, 236, 225, 88, 203])
  })

  test('replace_leaf', () => {
    const ix = replaceLeaf({
      merkleTree: dummy,
      authority: dummy,
      root: new Uint8Array(32),
      previousLeaf: new Uint8Array(32),
      newLeaf: new Uint8Array(32),
      index: 0,
      proof: [],
    })
    expect(Array.from(ix.data.subarray(0, 8))).toEqual([204, 165, 76, 100, 73, 147, 0, 128])
  })

  test('verify_leaf', () => {
    const ix = verifyLeaf({
      merkleTree: dummy,
      root: new Uint8Array(32),
      leaf: new Uint8Array(32),
      index: 0,
      proof: [],
    })
    expect(Array.from(ix.data.subarray(0, 8))).toEqual([124, 220, 22, 223, 104, 10, 250, 224])
  })

  test('replaceLeaf does not inject the compression program as a phantom proof account', () => {
    const proofKey = Keypair.generate().publicKey
    const ix = replaceLeaf({
      merkleTree: dummy,
      authority: dummy,
      root: new Uint8Array(32),
      previousLeaf: new Uint8Array(32),
      newLeaf: new Uint8Array(32),
      index: 0,
      proof: [proofKey],
    })
    // merkleTree, authority, noop, then proof — 4 keys total, no phantom.
    expect(ix.keys.length).toBe(4)
    expect(
      ix.keys.some(k => k.pubkey.toBase58() === ACCOUNT_COMPRESSION_PROGRAM_ID)
    ).toBe(false)
    expect(ix.keys[3].pubkey.equals(proofKey)).toBe(true)
  })
})

describe('Concurrent Merkle tree size', () => {
  const formula = (d: number, b: number, c: number) =>
    56 + 24 + b * (32 * (d + 1) + 8) + (32 * d + 40) + (c > 0 ? ((1 << (c + 1)) - 2) * 32 : 0)

  test('getMerkleTreeAccountSize matches the reference formula', () => {
    for (const [d, b] of VALID_TREE_CONFIGS) {
      expect(getMerkleTreeAccountSize(d, b, 0)).toBe(formula(d, b, 0))
    }
    expect(getMerkleTreeAccountSize(20, 256, 10)).toBe(formula(20, 256, 10))
  })

  test('calculateTreeSpace matches getMerkleTreeAccountSize', () => {
    expect(calculateTreeSpace(14, 64, 0)).toBe(getMerkleTreeAccountSize(14, 64, 0))
    expect(calculateTreeSpace(20, 256, 10)).toBe(getMerkleTreeAccountSize(20, 256, 10))
    expect(calculateTreeSpace(30, 2048, 14)).toBe(getMerkleTreeAccountSize(30, 2048, 14))
  })

  test('every valid config stays under the Solana 10MB account cap', () => {
    for (const [d, b] of VALID_TREE_CONFIGS) {
      expect(getMerkleTreeAccountSize(d, b, 0)).toBeLessThan(10 * 1024 * 1024)
    }
  })

  test('depth-20 tree is far below the old bogus 2^depth*32 size', () => {
    // The previous formula added (1<<maxDepth)*32 ≈ 33MB at depth 20.
    expect(calculateTreeSpace(20, 64, 0)).toBeLessThan(1 << 20)
  })
})

describe('Tree config validation', () => {
  test('isValidTreeConfig accepts known-good pairs', () => {
    expect(isValidTreeConfig(3, 8)).toBe(true)
    expect(isValidTreeConfig(14, 64)).toBe(true)
    expect(isValidTreeConfig(20, 256)).toBe(true)
    expect(isValidTreeConfig(30, 2048)).toBe(true)
  })

  test('isValidTreeConfig rejects unsupported pairs', () => {
    expect(isValidTreeConfig(14, 128)).toBe(false)
    expect(isValidTreeConfig(21, 256)).toBe(false)
    expect(isValidTreeConfig(30, 64)).toBe(false)
  })

  test('assertValidTreeConfig throws for unsupported pairs', () => {
    expect(() => assertValidTreeConfig(14, 128)).toThrow()
    expect(() => assertValidTreeConfig(14, 64)).not.toThrow()
  })
})

describe('verifyConcurrentMerkleProof', () => {
  test('throws NotImplemented rather than silently returning a wrong result', () => {
    expect(() =>
      verifyConcurrentMerkleProof(new Uint8Array(32), new Uint8Array(32), [], 0)
    ).toThrow(/not implemented/i)
  })
})
