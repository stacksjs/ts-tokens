# Marketplace Integrations

Integrate with NFT marketplaces.

## Overview

ts-tokens provides helpers for:

- **Magic Eden** - Listings, stats, activity
- **Tensor** - Trading, analytics
- **Collection data** - Floor prices, volume

## Magic Eden

### Get Collection Listings

```typescript
import { magiceden, getConfig } from 'ts-tokens'

const listings = await magiceden.getCollectionListings('degods', {
  offset: 0,
  limit: 20,
})

for (const listing of listings) {
  console.log(`${listing.mint}: ${magiceden.formatPrice(listing.price)}`)
}
```

### Get Collection Stats

```typescript
import { magiceden } from 'ts-tokens'

const stats = await magiceden.getCollectionStats('degods')

console.log('Floor:', magiceden.formatPrice(stats.floorPrice))
console.log('24h Volume:', magiceden.formatPrice(stats.volume24h))
console.log('Listed:', stats.listedCount)
console.log('Owners:', stats.owners)
```

### Get NFT Activity

```typescript
import { magiceden } from 'ts-tokens'

const activity = await magiceden.getNFTActivity(nftMint, {
  limit: 10,
})

for (const event of activity) {
  console.log(`${event.type}: ${event.price ? magiceden.formatPrice(event.price) : 'N/A'}`)
}
```

### Get NFT Offers

```typescript
import { magiceden } from 'ts-tokens'

const offers = await magiceden.getNFTOffers(nftMint)

for (const offer of offers) {
  console.log(`Offer: ${magiceden.formatPrice(offer.price)} from ${offer.buyer}`)
}
```

## Tensor

### Get Collection Listings

```typescript
import { tensor } from 'ts-tokens'

const listings = await tensor.getCollectionListings('degods', {
  limit: 20,
  sortBy: 'PriceAsc',
})
```

### Get Collection Stats

```typescript
import { tensor } from 'ts-tokens'

const stats = await tensor.getCollectionStats('degods')

console.log('Floor:', tensor.formatPrice(stats.floorPrice))
console.log('24h Volume:', tensor.formatPrice(stats.volume24h))
```

### Get NFT Info

```typescript
import { tensor } from 'ts-tokens'

const info = await tensor.getNFTInfo(nftMint)

if (info?.listing) {
  console.log('Listed for:', tensor.formatPrice(info.listing.price))
}

if (info?.lastSale) {
  console.log('Last sale:', tensor.formatPrice(info.lastSale.price))
}

console.log('Offers:', info?.offers.length)
```

### Get Trending Collections

```typescript
import { tensor } from 'ts-tokens'

const trending = await tensor.getTrendingCollections({
  period: '24h',
  limit: 10,
})

for (const collection of trending) {
  console.log(`${collection.name}: ${tensor.formatPrice(collection.floorPrice)}`)
}
```

## Get Listing URLs

```typescript
import { magiceden, tensor } from 'ts-tokens'

// Magic Eden
const meUrl = magiceden.getListingUrl(nftMint)
const meCollectionUrl = magiceden.getCollectionUrl('degods')

// Tensor
const tensorUrl = tensor.getListingUrl(nftMint)
const tensorCollectionUrl = tensor.getCollectionUrl('degods')
```

## CLI Usage

```bash
# Get collection stats
tokens nft:stats degods

# Get collection listings
tokens nft:listings degods --limit 10

# Get NFT activity
tokens nft:activity <mint>

# Get trending collections
tokens nft:trending --period 24h
```

## Cross-Marketplace

```typescript
import { magiceden, tensor } from 'ts-tokens'

// Get floor from both marketplaces
const [meStats, tensorStats] = await Promise.all([
  magiceden.getCollectionStats('degods'),
  tensor.getCollectionStats('degods'),
])

const lowestFloor = meStats.floorPrice < tensorStats.floorPrice
  ? { marketplace: 'Magic Eden', price: meStats.floorPrice }
  : { marketplace: 'Tensor', price: tensorStats.floorPrice }

console.log(`Best floor on ${lowestFloor.marketplace}`)
```

## Related

- [NFT Operations](/api/nft/index.md)
- [DAS API](/api/indexer/das.md)
