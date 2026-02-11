/**
 * OpenSea Integration
 *
 * NFT marketplace integration via OpenSea API.
 */

import { PublicKey } from '@solana/web3.js'

const OPENSEA_API = 'https://api.opensea.io/api/v2'

export interface OpenSeaConfig {
  apiKey: string
}

export interface OpenSeaListing {
  orderHash: string
  mint: PublicKey
  seller: string
  price: bigint
  currency: string
  expirationTime: number
  createdAt: number
}

export interface OpenSeaCollection {
  slug: string
  name: string
  description: string
  imageUrl: string
  floorPrice: number
  totalVolume: number
  totalSupply: number
  owners: number
}

/**
 * Get collection info from OpenSea
 */
export async function getOpenSeaCollection(
  slug: string,
  config: OpenSeaConfig,
): Promise<OpenSeaCollection> {
  const response = await fetch(`${OPENSEA_API}/collections/${slug}`, {
    headers: { 'X-API-KEY': config.apiKey, Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`OpenSea API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    slug: data.collection ?? slug,
    name: data.name ?? '',
    description: data.description ?? '',
    imageUrl: data.image_url ?? '',
    floorPrice: data.floor_price ?? 0,
    totalVolume: data.total_volume ?? 0,
    totalSupply: data.total_supply ?? 0,
    owners: data.num_owners ?? 0,
  }
}

/**
 * Get listings for a collection on OpenSea (Solana)
 */
export async function getOpenSeaListings(
  collectionSlug: string,
  config: OpenSeaConfig,
  options?: { limit?: number; next?: string },
): Promise<{ listings: OpenSeaListing[]; next: string | null }> {
  const params = new URLSearchParams({
    limit: String(options?.limit ?? 20),
  })
  if (options?.next) params.set('next', options.next)

  const response = await fetch(
    `${OPENSEA_API}/listings/collection/${collectionSlug}/all?${params}`,
    { headers: { 'X-API-KEY': config.apiKey, Accept: 'application/json' } },
  )

  if (!response.ok) {
    throw new Error(`OpenSea API error: ${response.statusText}`)
  }

  const data = await response.json()

  const listings: OpenSeaListing[] = (data.listings ?? []).map((l: any) => ({
    orderHash: l.order_hash ?? '',
    mint: new PublicKey(l.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria ?? PublicKey.default),
    seller: l.maker?.address ?? '',
    price: BigInt(l.price?.current?.value ?? 0),
    currency: l.price?.current?.currency ?? 'SOL',
    expirationTime: l.expiration_time ?? 0,
    createdAt: l.created_date ? new Date(l.created_date).getTime() : 0,
  }))

  return { listings, next: data.next ?? null }
}

/**
 * Get NFT details from OpenSea
 */
export async function getOpenSeaNFT(
  chain: string,
  address: string,
  config: OpenSeaConfig,
): Promise<any> {
  const response = await fetch(
    `${OPENSEA_API}/chain/${chain}/contract/${address}/nfts`,
    { headers: { 'X-API-KEY': config.apiKey, Accept: 'application/json' } },
  )

  if (!response.ok) {
    throw new Error(`OpenSea API error: ${response.statusText}`)
  }

  return response.json()
}
