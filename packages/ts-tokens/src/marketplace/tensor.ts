/**
 * Tensor Integration
 */

import { PublicKey } from '@solana/web3.js'
import type {
  NFTListing,
  CollectionStats,
  NFTActivity,
  NFTOffer,
} from './types'

const TENSOR_API = 'https://api.tensor.so/graphql'

/**
 * Execute Tensor GraphQL query
 */
async function tensorQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(TENSOR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Tensor API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.errors) {
    throw new Error(`Tensor GraphQL error: ${data.errors[0].message}`)
  }

  return data.data
}

/**
 * Get collection listings from Tensor
 */
export async function getCollectionListings(
  collectionId: string,
  options: { limit?: number; sortBy?: 'PriceAsc' | 'PriceDesc' | 'ListedDesc' } = {}
): Promise<NFTListing[]> {
  const { limit = 20, sortBy = 'PriceAsc' } = options

  const query = `
    query CollectionListings($slug: String!, $limit: Int!, $sortBy: ActiveListingsSortBy!) {
      activeListings(slug: $slug, limit: $limit, sortBy: $sortBy) {
        txs {
          mint {
            onchainId
          }
          tx {
            sellerId
            grossAmount
            source
          }
        }
      }
    }
  `

  const data = await tensorQuery<{
    activeListings: {
      txs: Array<{
        mint: { onchainId: string }
        tx: { sellerId: string; grossAmount: string; source: string }
      }>
    }
  }>(query, { slug: collectionId, limit, sortBy })

  return data.activeListings.txs.map(item => ({
    mint: new PublicKey(item.mint.onchainId),
    seller: new PublicKey(item.tx.sellerId),
    price: BigInt(item.tx.grossAmount),
    marketplace: 'tensor' as const,
    listingId: item.mint.onchainId,
  }))
}

/**
 * Get collection stats from Tensor
 */
export async function getCollectionStats(collectionId: string): Promise<CollectionStats | null> {
  const query = `
    query CollectionStats($slug: String!) {
      instrumentTV2(slug: $slug) {
        statsV2 {
          currency
          buyNowPrice
          sellNowPrice
          numListed
          numMints
          volume1h
          volume24h
          volume7d
          volumeAll
        }
      }
    }
  `

  // tensorQuery throws on non-ok responses and GraphQL errors — let those
  // propagate so an outage is never masked as "no stats". Only a genuinely
  // unknown collection (null instrument) returns null.
  const data = await tensorQuery<{
    instrumentTV2: {
      statsV2: {
        buyNowPrice: string
        numListed: number
        numMints: number
        volume24h: string
        volumeAll: string
      }
    } | null
  }>(query, { slug: collectionId })

  if (!data.instrumentTV2) {
    return null
  }

  const stats = data.instrumentTV2.statsV2

  return {
    collection: PublicKey.default, // Would need to resolve
    floorPrice: BigInt(stats.buyNowPrice ?? 0),
    volume24h: BigInt(stats.volume24h ?? 0),
    volumeTotal: BigInt(stats.volumeAll ?? 0),
    listedCount: stats.numListed ?? 0,
    totalSupply: stats.numMints ?? 0,
    owners: 0, // Not available in this query
    avgPrice24h: 0n,
  }
}

/**
 * Get NFT info from Tensor
 */
// eslint-disable-next-line no-unused-vars
export async function getNFTInfo(mint: PublicKey): Promise<{
  listing?: NFTListing
  offers: NFTOffer[]
  lastSale?: { price: bigint; timestamp: number }
} | null> {
  const query = `
    query MintInfo($mint: String!) {
      mint(mint: $mint) {
        onchainId
        activeListings {
          tx {
            sellerId
            grossAmount
          }
        }
        activeBids {
          bidder
          price
          expiry
        }
        lastSale {
          price
          txAt
        }
      }
    }
  `

  // tensorQuery throws on non-ok responses and GraphQL errors — let those
  // propagate so an outage is never masked as "NFT not found". Only a
  // genuinely unknown mint (null payload) returns null.
  const data = await tensorQuery<{
    mint: {
      onchainId: string
      activeListings: Array<{ tx: { sellerId: string; grossAmount: string } }>
      activeBids: Array<{ bidder: string; price: string; expiry: number }>
      lastSale?: { price: string; txAt: number }
    } | null
  }>(query, { mint: mint.toBase58() })

  if (!data.mint) {
    return null
  }

  const mintData = data.mint

  return {
    listing: mintData.activeListings[0] ? {
      mint,
      seller: new PublicKey(mintData.activeListings[0].tx.sellerId),
      price: BigInt(mintData.activeListings[0].tx.grossAmount),
      marketplace: 'tensor' as const,
      listingId: mintData.onchainId,
    } : undefined,
    offers: mintData.activeBids.map(bid => ({
      mint,
      buyer: new PublicKey(bid.bidder),
      price: BigInt(bid.price),
      marketplace: 'tensor' as const,
      offerId: `${mint.toBase58()}_${bid.bidder}`,
      expiry: bid.expiry,
    })),
    lastSale: mintData.lastSale ? {
      price: BigInt(mintData.lastSale.price),
      timestamp: mintData.lastSale.txAt,
    } : undefined,
  }
}

/**
 * Get trending collections
 */
// eslint-disable-next-line no-unused-vars
export async function getTrendingCollections(
  options: { period?: '1h' | '24h' | '7d'; limit?: number } = {}
): Promise<Array<{
  slug: string
  name: string
  imageUri: string
  floorPrice: bigint
  volume: bigint
}>> {
  const { period = '24h', limit = 20 } = options

  const query = `
    query TrendingCollections($period: String!, $limit: Int!) {
      trendingCollections(period: $period, limit: $limit) {
        slug
        name
        imageUri
        statsV2 {
          buyNowPrice
          volume24h
        }
      }
    }
  `

  // tensorQuery throws on non-ok responses and GraphQL errors — let those
  // propagate so an outage is never masked as "no trending collections".
  const data = await tensorQuery<{
    trendingCollections: Array<{
      slug: string
      name: string
      imageUri: string
      statsV2: { buyNowPrice: string; volume24h: string }
    }> | null
  }>(query, { period, limit })

  return (data.trendingCollections ?? []).map(c => ({
    slug: c.slug,
    name: c.name,
    imageUri: c.imageUri,
    floorPrice: BigInt(c.statsV2.buyNowPrice ?? 0),
    volume: BigInt(c.statsV2.volume24h ?? 0),
  }))
}

/**
 * Get listing URL for an NFT on Tensor
 */
export function getListingUrl(mint: PublicKey): string {
  return `https://www.tensor.trade/item/${mint.toBase58()}`
}

/**
 * Get collection URL on Tensor
 */
export function getCollectionUrl(slug: string): string {
  return `https://www.tensor.trade/trade/${slug}`
}

/**
 * Format lamports to SOL string
 */
export function formatPrice(lamports: bigint): string {
  return `${(Number(lamports) / 1e9).toFixed(4)} SOL`
}

// ============================================
// On-chain Marketplace Instructions (Phase 8)
// ============================================

const _TSWAP_PROGRAM_ID = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
const _TCOMP_PROGRAM_ID = 'TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp'

/**
 * Extract the serialized transaction from a Tensor tx API response, throwing if
 * the API returned none (never return '' as a transaction).
 */
function requireTensorTransaction(
  data: { txs?: Array<{ tx?: string }>; tx?: string },
  op: string,
): string {
  const transaction = data.txs?.[0]?.tx ?? data.tx
  if (!transaction) {
    throw new Error(`Tensor ${op} API returned no transaction`)
  }
  return transaction
}

/**
 * Options for buying an NFT on Tensor
 */
export interface TensorBuyOptions {
  mint: string
  maxPrice: bigint
  /** The current owner (seller) of the listing. */
  owner: string
  /** The buyer's wallet (receives the NFT and signs the transaction). */
  buyer: string
}

/**
 * Options for listing an NFT on Tensor
 */
export interface TensorListOptions {
  mint: string
  price: bigint
  /** The NFT owner listing the NFT (signs the transaction). */
  owner: string
  expiry?: number
}

/**
 * Build a buy instruction for Tensor TComp
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function buyOnTensor(options: TensorBuyOptions): Promise<{
  transaction: string
}> {
  if (!options.owner || !options.buyer) {
    throw new Error('buyOnTensor requires both owner (seller) and buyer addresses')
  }

  // Use Tensor's transaction API to get a pre-built transaction
  const response = await fetch('https://api.tensor.so/api/v1/tx/buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mint: options.mint,
      owner: options.owner,
      maxPrice: options.maxPrice.toString(),
      buyer: options.buyer,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tensor buy API error: ${response.statusText}`)
  }

  const data = await response.json()
  return { transaction: requireTensorTransaction(data, 'buy') }
}

/**
 * Build a list instruction for Tensor
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function listOnTensor(options: TensorListOptions): Promise<{
  transaction: string
}> {
  if (!options.owner) {
    throw new Error('listOnTensor requires the owner (seller) address')
  }

  const response = await fetch('https://api.tensor.so/api/v1/tx/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mint: options.mint,
      price: options.price.toString(),
      owner: options.owner,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tensor list API error: ${response.statusText}`)
  }

  const data = await response.json()
  return { transaction: requireTensorTransaction(data, 'list') }
}

/**
 * Build a delist instruction for Tensor
 */
// eslint-disable-next-line pickier/no-unused-vars
export async function delistFromTensor(options: {
  mint: string
  owner: string
}): Promise<{
  transaction: string
}> {
  if (!options.owner) {
    throw new Error('delistFromTensor requires the owner (seller) address')
  }

  const response = await fetch('https://api.tensor.so/api/v1/tx/delist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mint: options.mint,
      owner: options.owner,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tensor delist API error: ${response.statusText}`)
  }

  const data = await response.json()
  return { transaction: requireTensorTransaction(data, 'delist') }
}

/**
 * Build a bid instruction for Tensor
 */
export async function bidOnTensor(options: {
  mint?: string
  collection?: string
  price: bigint
  /** The bidder's wallet (signs and funds the bid). */
  owner: string
}): Promise<{ transaction: string }> {
  if (!options.owner) {
    throw new Error('bidOnTensor requires the owner (bidder) address')
  }

  const response = await fetch('https://api.tensor.so/api/v1/tx/bid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mint: options.mint,
      collection: options.collection,
      price: options.price.toString(),
      owner: options.owner,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tensor bid API error: ${response.statusText}`)
  }

  const data = await response.json()
  return { transaction: requireTensorTransaction(data, 'bid') }
}
