/**
 * MPL Core Tests
 *
 * Tests for the MPL Core NFT standard types, serialization, and plugin helpers.
 */

import { describe, test, expect } from 'bun:test'
import { PublicKey, Keypair } from '@solana/web3.js'
import {
  MPL_CORE_PROGRAM_ID,
  MplCoreInstruction,
  PluginTypeDiscriminator,
  getPluginTypeDiscriminator,
  serializeString,
  serializeU8,
  serializeU16,
  serializeU32,
  serializeOption,
} from '../src/programs/mpl-core/types'
import {
  createV2,
  createCollectionV2,
  transferV1,
  burnV1,
  updateV1,
  addPluginV1,
  removePluginV1,
} from '../src/programs/mpl-core/instructions'
import {
  createRoyaltiesPlugin,
  createFreezePlugin,
  createAttributesPlugin,
  createImmutableMetadataPlugin,
  createPermanentFreezePlugin,
} from '../src/core/plugins'
import type { CorePlugin, CoreAsset, CoreCollection } from '../src/types/core'

// ---------------------------------------------------------------------------
// Program ID
// ---------------------------------------------------------------------------

describe('MPL Core Program ID', () => {
  test('program ID is valid base58', () => {
    expect(() => new PublicKey(MPL_CORE_PROGRAM_ID)).not.toThrow()
  })

  test('program ID matches known address', () => {
    expect(MPL_CORE_PROGRAM_ID).toBe('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d')
  })
})

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

describe('serializeString', () => {
  test('serializes empty string', () => {
    const buf = serializeString('')
    expect(buf.length).toBe(4)
    expect(buf.readUInt32LE(0)).toBe(0)
  })

  test('serializes a simple string', () => {
    const buf = serializeString('hello')
    expect(buf.length).toBe(4 + 5)
    expect(buf.readUInt32LE(0)).toBe(5)
    expect(buf.subarray(4).toString('utf-8')).toBe('hello')
  })

  test('handles unicode', () => {
    const buf = serializeString('test')
    expect(buf.readUInt32LE(0)).toBe(4)
  })
})

describe('serializeU8', () => {
  test('serializes 0', () => {
    const buf = serializeU8(0)
    expect(buf.length).toBe(1)
    expect(buf[0]).toBe(0)
  })

  test('serializes 255', () => {
    const buf = serializeU8(255)
    expect(buf[0]).toBe(255)
  })
})

describe('serializeU16', () => {
  test('serializes little-endian', () => {
    const buf = serializeU16(500)
    expect(buf.readUInt16LE(0)).toBe(500)
  })
})

describe('serializeU32', () => {
  test('serializes little-endian', () => {
    const buf = serializeU32(100000)
    expect(buf.readUInt32LE(0)).toBe(100000)
  })
})

describe('serializeOption', () => {
  test('serializes None', () => {
    const buf = serializeOption(undefined, serializeU8)
    expect(buf.length).toBe(1)
    expect(buf[0]).toBe(0)
  })

  test('serializes Some', () => {
    const buf = serializeOption(42, serializeU8)
    expect(buf.length).toBe(2)
    expect(buf[0]).toBe(1)
    expect(buf[1]).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// Plugin type discriminators
// ---------------------------------------------------------------------------

describe('getPluginTypeDiscriminator', () => {
  test('returns correct discriminator for Royalties', () => {
    expect(getPluginTypeDiscriminator('Royalties')).toBe(PluginTypeDiscriminator.Royalties)
  })

  test('returns correct discriminator for FreezeDelegate', () => {
    expect(getPluginTypeDiscriminator('FreezeDelegate')).toBe(PluginTypeDiscriminator.FreezeDelegate)
  })

  test('returns correct discriminator for Attributes', () => {
    expect(getPluginTypeDiscriminator('Attributes')).toBe(PluginTypeDiscriminator.Attributes)
  })

  test('returns -1 for unknown plugin type', () => {
    expect(getPluginTypeDiscriminator('Unknown')).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

describe('createV2 instruction', () => {
  test('builds valid instruction', () => {
    const asset = Keypair.generate()
    const payer = Keypair.generate()

    const ix = createV2({
      asset: asset.publicKey,
      payer: payer.publicKey,
      name: 'Test Asset',
      uri: 'https://example.com/metadata.json',
    })

    expect(ix.programId.toBase58()).toBe(MPL_CORE_PROGRAM_ID)
    expect(ix.keys.length).toBeGreaterThanOrEqual(5)
    expect(ix.data[0]).toBe(MplCoreInstruction.CreateV2)
  })

  test('includes collection account when provided', () => {
    const asset = Keypair.generate()
    const payer = Keypair.generate()
    const collection = Keypair.generate()

    const ix = createV2({
      asset: asset.publicKey,
      collection: collection.publicKey,
      payer: payer.publicKey,
      name: 'Test',
      uri: 'https://example.com',
    })

    // Collection should be writable
    const collectionKey = ix.keys.find(k => k.pubkey.equals(collection.publicKey))
    expect(collectionKey).toBeTruthy()
    expect(collectionKey!.isWritable).toBe(true)
  })
})

describe('createCollectionV2 instruction', () => {
  test('builds valid instruction', () => {
    const collection = Keypair.generate()
    const payer = Keypair.generate()

    const ix = createCollectionV2({
      collection: collection.publicKey,
      payer: payer.publicKey,
      name: 'Test Collection',
      uri: 'https://example.com/collection.json',
    })

    expect(ix.programId.toBase58()).toBe(MPL_CORE_PROGRAM_ID)
    expect(ix.data[0]).toBe(MplCoreInstruction.CreateCollectionV2)
  })
})

describe('transferV1 instruction', () => {
  test('builds valid instruction', () => {
    const asset = Keypair.generate()
    const payer = Keypair.generate()
    const newOwner = Keypair.generate()

    const ix = transferV1({
      asset: asset.publicKey,
      payer: payer.publicKey,
      newOwner: newOwner.publicKey,
    })

    expect(ix.programId.toBase58()).toBe(MPL_CORE_PROGRAM_ID)
    expect(ix.data[0]).toBe(MplCoreInstruction.TransferV1)
    expect(ix.keys[0].pubkey.equals(asset.publicKey)).toBe(true)
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.keys[1].pubkey.equals(newOwner.publicKey)).toBe(true)
  })
})

describe('burnV1 instruction', () => {
  test('builds valid instruction', () => {
    const asset = Keypair.generate()
    const payer = Keypair.generate()

    const ix = burnV1({
      asset: asset.publicKey,
      payer: payer.publicKey,
    })

    expect(ix.programId.toBase58()).toBe(MPL_CORE_PROGRAM_ID)
    expect(ix.data[0]).toBe(MplCoreInstruction.BurnV1)
  })
})

describe('updateV1 instruction', () => {
  test('builds with optional name update', () => {
    const asset = Keypair.generate()
    const payer = Keypair.generate()

    const ix = updateV1({
      asset: asset.publicKey,
      payer: payer.publicKey,
      newName: 'Updated Name',
    })

    expect(ix.programId.toBase58()).toBe(MPL_CORE_PROGRAM_ID)
    expect(ix.data[0]).toBe(MplCoreInstruction.UpdateV1)
    // data should contain the new name
    expect(ix.data.length).toBeGreaterThan(1)
  })
})

describe('addPluginV1 instruction', () => {
  test('builds with freeze delegate plugin', () => {
    const asset = Keypair.generate()
    const payer = Keypair.generate()

    const ix = addPluginV1({
      asset: asset.publicKey,
      payer: payer.publicKey,
      plugin: { type: 'FreezeDelegate', frozen: false },
    })

    expect(ix.programId.toBase58()).toBe(MPL_CORE_PROGRAM_ID)
    expect(ix.data[0]).toBe(MplCoreInstruction.AddPluginV1)
  })
})

describe('removePluginV1 instruction', () => {
  test('builds with plugin type discriminator', () => {
    const asset = Keypair.generate()
    const payer = Keypair.generate()

    const ix = removePluginV1({
      asset: asset.publicKey,
      payer: payer.publicKey,
      pluginType: 'FreezeDelegate',
    })

    expect(ix.programId.toBase58()).toBe(MPL_CORE_PROGRAM_ID)
    expect(ix.data[0]).toBe(MplCoreInstruction.RemovePluginV1)
    expect(ix.data[1]).toBe(PluginTypeDiscriminator.FreezeDelegate)
  })
})

// ---------------------------------------------------------------------------
// Plugin helper factories
// ---------------------------------------------------------------------------

describe('Plugin helpers', () => {
  test('createRoyaltiesPlugin', () => {
    const plugin = createRoyaltiesPlugin(500, [
      { address: Keypair.generate().publicKey.toBase58(), percentage: 100 },
    ])
    expect(plugin.type).toBe('Royalties')
    expect((plugin as any).basisPoints).toBe(500)
    expect((plugin as any).creators.length).toBe(1)
  })

  test('createFreezePlugin', () => {
    const plugin = createFreezePlugin(true)
    expect(plugin.type).toBe('FreezeDelegate')
    expect((plugin as any).frozen).toBe(true)
  })

  test('createFreezePlugin defaults to false', () => {
    const plugin = createFreezePlugin()
    expect((plugin as any).frozen).toBe(false)
  })

  test('createAttributesPlugin', () => {
    const plugin = createAttributesPlugin([
      { key: 'color', value: 'blue' },
      { key: 'size', value: 'large' },
    ])
    expect(plugin.type).toBe('Attributes')
    expect((plugin as any).attributeList.length).toBe(2)
  })

  test('createImmutableMetadataPlugin', () => {
    const plugin = createImmutableMetadataPlugin()
    expect(plugin.type).toBe('ImmutableMetadata')
  })

  test('createPermanentFreezePlugin', () => {
    const plugin = createPermanentFreezePlugin()
    expect(plugin.type).toBe('PermanentFreezeDelegate')
    expect((plugin as any).frozen).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Core type shapes
// ---------------------------------------------------------------------------

describe('Core type shapes', () => {
  test('CoreAsset has required fields', () => {
    const asset: CoreAsset = {
      address: 'test',
      owner: 'owner',
      updateAuthority: 'authority',
      name: 'Test',
      uri: 'https://example.com',
      plugins: [],
    }
    expect(asset.address).toBe('test')
    expect(asset.plugins).toHaveLength(0)
  })

  test('CoreAsset supports collection update authority', () => {
    const asset: CoreAsset = {
      address: 'test',
      owner: 'owner',
      updateAuthority: { type: 'Collection', address: 'collection-addr' },
      name: 'Test',
      uri: 'https://example.com',
      plugins: [],
    }
    expect(typeof asset.updateAuthority).toBe('object')
    expect((asset.updateAuthority as any).type).toBe('Collection')
  })

  test('CoreCollection has required fields', () => {
    const collection: CoreCollection = {
      address: 'test',
      updateAuthority: 'authority',
      name: 'Collection',
      uri: 'https://example.com',
      numMinted: 0,
      currentSize: 0,
      plugins: [],
    }
    expect(collection.numMinted).toBe(0)
    expect(collection.currentSize).toBe(0)
  })
})
