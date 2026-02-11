import { describe, test, expect } from 'bun:test'
import { toMetaplexNft, fromMetaplexUpdateInput } from '../src/compat/types'
import type { NFTMetadata } from '../src/types'
import type { UpdateNftInput } from '../src/compat/types'

describe('toMetaplexNft', () => {
  const mockMetadata: NFTMetadata = {
    mint: 'MintAddress123',
    name: 'Cool NFT',
    symbol: 'COOL',
    uri: 'https://arweave.net/abc123',
    sellerFeeBasisPoints: 500,
    creators: [
      { address: 'Creator1', verified: true, share: 100 },
    ],
    primarySaleHappened: false,
    isMutable: true,
    updateAuthority: 'AuthorityAddress',
  }

  test('should convert NFTMetadata to MetaplexNft format', () => {
    const result = toMetaplexNft(mockMetadata)

    expect(result.address).toBe('MintAddress123')
    expect(result.name).toBe('Cool NFT')
    expect(result.symbol).toBe('COOL')
    expect(result.uri).toBe('https://arweave.net/abc123')
    expect(result.sellerFeeBasisPoints).toBe(500)
    expect(result.primarySaleHappened).toBe(false)
    expect(result.isMutable).toBe(true)
    expect(result.updateAuthorityAddress).toBe('AuthorityAddress')
    expect(result.json).toBeNull()
  })

  test('should map creators correctly', () => {
    const result = toMetaplexNft(mockMetadata)

    expect(result.creators).toEqual([
      { address: 'Creator1', verified: true, share: 100 },
    ])
  })

  test('should handle empty creators', () => {
    const metadata = { ...mockMetadata, creators: undefined } as any
    const result = toMetaplexNft(metadata)

    expect(result.creators).toEqual([])
  })

  test('should handle multiple creators', () => {
    const metadata = {
      ...mockMetadata,
      creators: [
        { address: 'C1', verified: true, share: 60 },
        { address: 'C2', verified: false, share: 40 },
      ],
    }
    const result = toMetaplexNft(metadata)

    expect(result.creators.length).toBe(2)
    expect(result.creators[0].share).toBe(60)
    expect(result.creators[1].verified).toBe(false)
  })

  test('should set json to null', () => {
    const result = toMetaplexNft(mockMetadata)
    expect(result.json).toBeNull()
  })

  test('should map mint to address', () => {
    const result = toMetaplexNft(mockMetadata)
    expect(result.address).toBe(mockMetadata.mint)
  })

  test('should map updateAuthority to updateAuthorityAddress', () => {
    const result = toMetaplexNft(mockMetadata)
    expect(result.updateAuthorityAddress).toBe(mockMetadata.updateAuthority)
  })
})

describe('fromMetaplexUpdateInput', () => {
  test('should extract mint from nftOrSft.address', () => {
    const input: UpdateNftInput = {
      nftOrSft: { address: 'NftMint123' },
      name: 'New Name',
    }
    const result = fromMetaplexUpdateInput(input)

    expect(result.mint).toBe('NftMint123')
  })

  test('should pass through all update fields', () => {
    const input: UpdateNftInput = {
      nftOrSft: { address: 'NftMint123' },
      name: 'Updated Name',
      symbol: 'UPD',
      uri: 'https://new-uri.com',
      sellerFeeBasisPoints: 750,
      creators: [{ address: 'C1', share: 100 }],
      primarySaleHappened: true,
      isMutable: false,
    }
    const result = fromMetaplexUpdateInput(input)

    expect(result.updates.name).toBe('Updated Name')
    expect(result.updates.symbol).toBe('UPD')
    expect(result.updates.uri).toBe('https://new-uri.com')
    expect(result.updates.sellerFeeBasisPoints).toBe(750)
    expect(result.updates.creators).toEqual([{ address: 'C1', share: 100 }])
    expect(result.updates.primarySaleHappened).toBe(true)
    expect(result.updates.isMutable).toBe(false)
  })

  test('should leave undefined fields as undefined', () => {
    const input: UpdateNftInput = {
      nftOrSft: { address: 'NftMint123' },
      name: 'Only Name',
    }
    const result = fromMetaplexUpdateInput(input)

    expect(result.updates.name).toBe('Only Name')
    expect(result.updates.symbol).toBeUndefined()
    expect(result.updates.uri).toBeUndefined()
    expect(result.updates.sellerFeeBasisPoints).toBeUndefined()
    expect(result.updates.creators).toBeUndefined()
  })

  test('should handle Nft object as nftOrSft', () => {
    const input: UpdateNftInput = {
      nftOrSft: {
        address: 'FullNft456',
        name: 'Full NFT',
        symbol: 'FN',
        uri: 'https://example.com',
        sellerFeeBasisPoints: 500,
        creators: [],
        primarySaleHappened: false,
        isMutable: true,
        updateAuthorityAddress: 'Auth',
        json: null,
      },
      name: 'Changed',
    }
    const result = fromMetaplexUpdateInput(input)

    expect(result.mint).toBe('FullNft456')
    expect(result.updates.name).toBe('Changed')
  })
})
