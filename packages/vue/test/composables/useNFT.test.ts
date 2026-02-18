import { describe, test, expect, mock, beforeEach } from 'bun:test'

const mockGetNFTMetadata = mock(() =>
  Promise.resolve({
    name: 'Cool NFT #1',
    symbol: 'COOL',
    uri: 'https://arweave.net/metadata.json',
    mint: 'nft-mint-123',
  }),
)

const mockFetchOffChainMetadata = mock(() =>
  Promise.resolve({
    image: 'https://arweave.net/image.png',
    description: 'A very cool NFT',
    attributes: [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Rarity', value: 'Legendary' },
    ],
  }),
)

// Mock ts-tokens (dynamically imported inside useNFT)
mock.module('ts-tokens', () => ({
  getNFTMetadata: mockGetNFTMetadata,
  fetchOffChainMetadata: mockFetchOffChainMetadata,
}))

// Mock useConnection and useConfig
mock.module('../../src/composables/useConnection', () => ({
  useConnection: () => ({
    sendRawTransaction: mock(),
    confirmTransaction: mock(),
  }),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { useNFT } from '../../src/composables/useNFT'

const TEST_MINT = 'nft-mint-123'

describe('useNFT', () => {
  beforeEach(() => {
    mockGetNFTMetadata.mockClear()
    mockFetchOffChainMetadata.mockClear()

    // Reset to default implementations
    mockGetNFTMetadata.mockImplementation(() =>
      Promise.resolve({
        name: 'Cool NFT #1',
        symbol: 'COOL',
        uri: 'https://arweave.net/metadata.json',
        mint: TEST_MINT,
      }),
    )
    mockFetchOffChainMetadata.mockImplementation(() =>
      Promise.resolve({
        image: 'https://arweave.net/image.png',
        description: 'A very cool NFT',
        attributes: [
          { trait_type: 'Background', value: 'Blue' },
          { trait_type: 'Rarity', value: 'Legendary' },
        ],
      }),
    )
  })

  test('initial state', () => {
    const { nft, loading, error } = useNFT(TEST_MINT)
    expect(nft.value).toBeNull()
    expect(loading.value).toBe(true)
    expect(error.value).toBeNull()
  })

  test('returns all expected properties', () => {
    const result = useNFT(TEST_MINT)
    expect(result).toHaveProperty('nft')
    expect(result).toHaveProperty('loading')
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('refetch')
    expect(typeof result.refetch).toBe('function')
  })

  test('refetch populates NFT data on success', async () => {
    const { nft, loading, error, refetch } = useNFT(TEST_MINT)

    await refetch()

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(nft.value).not.toBeNull()
    expect(nft.value!.mint).toBe(TEST_MINT)
    expect(nft.value!.name).toBe('Cool NFT #1')
    expect(nft.value!.symbol).toBe('COOL')
    expect(nft.value!.uri).toBe('https://arweave.net/metadata.json')
    expect(nft.value!.image).toBe('https://arweave.net/image.png')
    expect(nft.value!.description).toBe('A very cool NFT')
    expect(nft.value!.attributes).toHaveLength(2)
  })

  test('refetch calls getNFTMetadata with correct args', async () => {
    const { refetch } = useNFT(TEST_MINT)

    await refetch()

    expect(mockGetNFTMetadata).toHaveBeenCalledTimes(1)
    expect(mockGetNFTMetadata).toHaveBeenCalledWith(
      TEST_MINT,
      { network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' },
    )
  })

  test('refetch calls fetchOffChainMetadata with URI from metadata', async () => {
    const { refetch } = useNFT(TEST_MINT)

    await refetch()

    expect(mockFetchOffChainMetadata).toHaveBeenCalledTimes(1)
    expect(mockFetchOffChainMetadata).toHaveBeenCalledWith(
      'https://arweave.net/metadata.json',
    )
  })

  test('refetch sets error when getNFTMetadata returns null', async () => {
    mockGetNFTMetadata.mockImplementationOnce(() => Promise.resolve(null as any))

    const { nft, error, loading, refetch } = useNFT(TEST_MINT)

    await refetch()

    expect(loading.value).toBe(false)
    expect(error.value).toBeInstanceOf(Error)
    expect(error.value!.message).toBe('NFT not found')
    expect(nft.value).toBeNull()
  })

  test('refetch sets error when getNFTMetadata throws', async () => {
    mockGetNFTMetadata.mockImplementationOnce(() =>
      Promise.reject(new Error('RPC error')),
    )

    const { nft, error, loading, refetch } = useNFT(TEST_MINT)

    await refetch()

    expect(loading.value).toBe(false)
    expect(error.value).toBeInstanceOf(Error)
    expect(error.value!.message).toBe('RPC error')
    expect(nft.value).toBeNull()
  })

  test('refetch handles missing off-chain fields gracefully', async () => {
    mockFetchOffChainMetadata.mockImplementationOnce(() =>
      Promise.resolve({} as any),
    )

    const { nft, refetch } = useNFT(TEST_MINT)

    await refetch()

    expect(nft.value).not.toBeNull()
    expect(nft.value!.image).toBeUndefined()
    expect(nft.value!.description).toBeUndefined()
    expect(nft.value!.attributes).toBeUndefined()
  })
})
