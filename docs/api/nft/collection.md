# NFT Collections

Create and manage NFT collections.

## Quick Start

```typescript
import { createCollection, getConfig, mintNFT } from 'ts-tokens'

const config = await getConfig()

// Create collection
const collection = await createCollection({
  name: 'My Collection',
  symbol: 'MCOL',
  uri: 'https://arweave.net/collection-metadata.json',
}, config)

// Mint NFT to collection
const nft = await mintNFT({
  name: 'Item #1',
  symbol: 'MCOL',
  uri: 'https://arweave.net/item1.json',
  collection: collection.mint,
}, config)
```

## Creating Collections

```typescript
const result = await createCollection({
  name: 'Awesome Collection',
  symbol: 'AWSM',
  uri: 'https://arweave.net/metadata.json',
  sellerFeeBasisPoints: 500,
}, config)

console.log('Collection:', result.mint)
```

## Minting to Collections

```typescript
const nft = await mintNFT({
  name: 'Collection Item',
  symbol: 'AWSM',
  uri: 'https://arweave.net/item.json',
  collection: collectionMint,
}, config)
```

## Verifying Collection

```typescript
import { setAndVerifyCollection } from 'ts-tokens'

await setAndVerifyCollection(
  nftMint,
  collectionMint,
  config
)
```

## Querying Collections

```typescript
import { getCollectionInfo, getNFTsByCollection } from 'ts-tokens'

// Get collection info
const info = await getCollectionInfo(collectionMint, config)

// Get all NFTs in collection
const nfts = await getNFTsByCollection(collectionMint, config)
```

## CLI Usage

```bash
# Create collection
tokens collection:create --name "My Collection" --symbol MCOL --uri https://...

# Mint to collection
tokens nft:create --name "Item #1" --collection <collection-mint> --uri https://...
```

## Related

- [NFT Creation](./create.md)
- [NFT Metadata](./metadata.md)
- [Candy Machine](../candy-machine/create.md)
