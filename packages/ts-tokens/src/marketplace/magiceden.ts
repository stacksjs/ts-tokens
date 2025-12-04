/**
 * Magic Eden Integration
 */

import { PublicKey } from '@solana/web3.js'
import type {
  NFTListing,
  ListNFTOptions,
  CollectionStats,
  NFTActivity,
  NFTOffer,
} from './types'

const ME_API = 'https://api-mainnet.magiceden.dev/v2'

/**
 * Get NFT listings for a collection
 */
export async function getCollectionListings(
  collectionSymbol: string,
  options: { offset?: number; limit?: number } = {}
): Promise<NFTListing[]> {
  const { offset = 0, limit = 20 } = options

  const response = await fetch(
    `${ME_API}/collections/${collectionSymbol}/listings?offset=${offset}&limit=${limit}`
  )

  if (!response.ok) {
    throw new Error(`Magic Eden API error: ${response.statusText}`)
  }

  const data = await response.json()

  return data.map((item: {
    tokenMint: string
    seller: string
    price: number
    tokenAddress: string
  }) => ({
    mint: new PublicKey(item.tokenMint),
    seller: new PublicKey(item.seller),
    price: BigInt(Math.floor(item.price * 1e9)), // Convert SOL to lamports
    marketplace: 'magiceden' as const,
    listingId: item.tokenMint,
    tokenAccount: new PublicKey(item.tokenAddress),
  }))
}

/**
 * Get collection stats
 */
export async function getCollectionStats(
  collectionSymbol: string
): Promise<CollectionStats | null> {
  const response = await fetch(`${ME_API}/collections/${collectionSymbol}/stats`)

  if (!response.ok) {
    return null
  }

  const data = await response.json()

  return {
    collection: new PublicKey(data.collectionId ?? PublicKey.default),
    floorPrice: BigInt(Math.floor((data.floorPrice ?? 0) * 1e9)),
    volume24h: BigInt(Math.floor((data.volume24hr ?? 0) * 1e9)),
    volumeTotal: BigInt(Math.floor((data.volumeAll ?? 0) * 1e9)),
    listedCount: data.listedCount ?? 0,
    totalSupply: data.totalSupply ?? 0,
    owners: data.uniqueHolders ?? 0,
    avgPrice24h: BigInt(Math.floor((data.avgPrice24hr ?? 0) * 1e9)),
  }
}

/**
 * Get NFT activity
 */
export async function getNFTActivity(
  mint: PublicKey,
  options: { offset?: number; limit?: number } = {}
): Promise<NFTActivity[]> {
  const { offset = 0, limit = 20 } = options

  const response = await fetch(
    `${ME_API}/tokens/${mint.toBase58()}/activities?offset=${offset}&limit=${limit}`
  )

  if (!response.ok) {
    return []
  }

  const data = await response.json()

  return data.map((item: {
    tokenMint: string
    type: string
    price: number
    seller: string
    buyer: string
    blockTime: number
    signature: string
  }) => ({
    mint: new PublicKey(item.tokenMint),
    type: mapActivityType(item.type),
    price: item.price ? BigInt(Math.floor(item.price * 1e9)) : undefined,
    from: new PublicKey(item.seller),
    to: item.buyer ? new PublicKey(item.buyer) : undefined,
    timestamp: item.blockTime,
    signature: item.signature,
    marketplace: 'magiceden' as const,
  }))
}

/**
 * Get offers for an NFT
 */
export async function getNFTOffers(mint: PublicKey): Promise<NFTOffer[]> {
  const response = await fetch(`${ME_API}/tokens/${mint.toBase58()}/offers`)

  if (!response.ok) {
    return []
  }

  const data = await response.json()

  return data.map((item: {
    tokenMint: string
    buyer: string
    price: number
    expiry: number
  }) => ({
    mint: new PublicKey(item.tokenMint),
    buyer: new PublicKey(item.buyer),
    price: BigInt(Math.floor(item.price * 1e9)),
    marketplace: 'magiceden' as const,
    offerId: `${item.tokenMint}_${item.buyer}`,
    expiry: item.expiry,
  }))
}

/**
 * Get popular collections
 */
export async function getPopularCollections(
  options: { window?: '1d' | '7d' | '30d'; limit?: number } = {}
): Promise<Array<{ symbol: string; name: string; image: string; floorPrice: number; volume: number }>> {
  const { window = '1d', limit = 20 } = options

  const response = await fetch(
    `${ME_API}/marketplace/popular_collections?window=${window}&limit=${limit}`
  )

  if (!response.ok) {
    return []
  }

  return response.json()
}

/**
 * Search collections
 */
export async function searchCollections(
  query: string
): Promise<Array<{ symbol: string; name: string; image: string }>> {
  const response = await fetch(`${ME_API}/collections?q=${encodeURIComponent(query)}`)

  if (!response.ok) {
    return []
  }

  return response.json()
}

/**
 * Get listing URL for an NFT
 */
export function getListingUrl(mint: PublicKey): string {
  return `https://magiceden.io/item-details/${mint.toBase58()}`
}

/**
 * Get collection URL
 */
export function getCollectionUrl(symbol: string): string {
  return `https://magiceden.io/marketplace/${symbol}`
}

/**
 * Map ME activity type to our type
 */
function mapActivityType(type: string): NFTActivity['type'] {
  switch (type.toLowerCase()) {
    case 'list':
    case 'listing':
      return 'listing'
    case 'buyNow':
    case 'buy':
    case 'sale':
      return 'sale'
    case 'bid':
    case 'offer':
      return 'offer'
    case 'transfer':
      return 'transfer'
    case 'burn':
      return 'burn'
    default:
      return 'transfer'
  }
}

/**
 * Format price in SOL
 */
export function formatPrice(lamports: bigint): string {
  return `${(Number(lamports) / 1e9).toFixed(4)} SOL`
}
