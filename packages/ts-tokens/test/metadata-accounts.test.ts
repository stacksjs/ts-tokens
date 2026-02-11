import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import {
  deserializeMetadata,
  deserializeMasterEdition,
  deserializeEdition,
} from '../src/programs/token-metadata/accounts'
import {
  buildMetadataBuffer,
  buildMasterEditionBuffer,
  buildEditionBuffer,
} from './helpers'

describe('deserializeMetadata', () => {
  test('deserializes basic metadata buffer', () => {
    const mint = Keypair.generate().publicKey
    const updateAuthority = Keypair.generate().publicKey
    const buf = buildMetadataBuffer({
      name: 'My NFT',
      symbol: 'MNFT',
      uri: 'https://example.com/nft.json',
      sellerFeeBasisPoints: 500,
      updateAuthority,
      mint,
    })

    const metadata = deserializeMetadata(buf)
    expect(metadata.key).toBe(4)
    expect(metadata.data.name).toBe('My NFT')
    expect(metadata.data.symbol).toBe('MNFT')
    expect(metadata.data.uri).toBe('https://example.com/nft.json')
    expect(metadata.data.sellerFeeBasisPoints).toBe(500)
    expect(metadata.mint.equals(mint)).toBe(true)
    expect(metadata.updateAuthority.equals(updateAuthority)).toBe(true)
  })

  test('deserializes metadata with creators', () => {
    const creator = Keypair.generate().publicKey
    const buf = buildMetadataBuffer({
      creators: [{ address: creator, verified: true, share: 100 }],
    })

    const metadata = deserializeMetadata(buf)
    expect(metadata.data.creators).not.toBeNull()
    expect(metadata.data.creators!.length).toBe(1)
    expect(metadata.data.creators![0].address.equals(creator)).toBe(true)
    expect(metadata.data.creators![0].verified).toBe(true)
    expect(metadata.data.creators![0].share).toBe(100)
  })

  test('deserializes metadata without creators', () => {
    const buf = buildMetadataBuffer({})
    const metadata = deserializeMetadata(buf)
    expect(metadata.data.creators).toBeNull()
  })

  test('deserializes primarySaleHappened and isMutable', () => {
    const buf = buildMetadataBuffer({
      primarySaleHappened: true,
      isMutable: false,
    })
    const metadata = deserializeMetadata(buf)
    expect(metadata.primarySaleHappened).toBe(true)
    expect(metadata.isMutable).toBe(false)
  })

  test('deserializes editionNonce', () => {
    const buf = buildMetadataBuffer({ editionNonce: 254 })
    const metadata = deserializeMetadata(buf)
    expect(metadata.editionNonce).toBe(254)
  })

  test('deserializes tokenStandard', () => {
    const buf = buildMetadataBuffer({ tokenStandard: 0 })
    const metadata = deserializeMetadata(buf)
    expect(metadata.tokenStandard).toBe(0)
  })

  test('throws on invalid discriminator', () => {
    const buf = Buffer.alloc(100)
    buf.writeUInt8(99, 0) // wrong key
    expect(() => deserializeMetadata(buf)).toThrow('Invalid metadata key')
  })

  test('deserializes metadata with collection', () => {
    const collKey = Keypair.generate().publicKey
    const buf = buildMetadataBuffer({
      collection: { verified: true, key: collKey },
    })
    const metadata = deserializeMetadata(buf)
    // Collection from DataV2
    expect(metadata.data.collection).not.toBeNull()
    expect(metadata.data.collection!.verified).toBe(true)
    expect(metadata.data.collection!.key.equals(collKey)).toBe(true)
  })
})

describe('deserializeMasterEdition', () => {
  test('deserializes with max supply', () => {
    const buf = buildMasterEditionBuffer({ supply: 10n, maxSupply: 100n })
    const me = deserializeMasterEdition(buf)
    expect(me.key).toBe(6)
    expect(me.supply).toBe(10n)
    expect(me.maxSupply).toBe(100n)
  })

  test('deserializes without max supply', () => {
    const buf = buildMasterEditionBuffer({ supply: 5n, maxSupply: null })
    const me = deserializeMasterEdition(buf)
    expect(me.supply).toBe(5n)
    expect(me.maxSupply).toBeNull()
  })

  test('throws on invalid discriminator', () => {
    const buf = Buffer.alloc(20)
    buf.writeUInt8(0, 0)
    expect(() => deserializeMasterEdition(buf)).toThrow('Invalid master edition key')
  })
})

describe('deserializeEdition', () => {
  test('deserializes edition account', () => {
    const parent = Keypair.generate().publicKey
    const buf = buildEditionBuffer({ parent, edition: 42n })
    const ed = deserializeEdition(buf)
    expect(ed.key).toBe(1)
    expect(ed.parent.equals(parent)).toBe(true)
    expect(ed.edition).toBe(42n)
  })

  test('throws on invalid discriminator', () => {
    const buf = Buffer.alloc(50)
    buf.writeUInt8(99, 0)
    expect(() => deserializeEdition(buf)).toThrow('Invalid edition key')
  })
})
