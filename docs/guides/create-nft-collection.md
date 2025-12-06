# Create an NFT Collection

Learn how to create an NFT collection and mint NFTs on Solana.

## Prerequisites

- ts-tokens installed
- Wallet with devnet SOL
- Metadata and images uploaded to Arweave/IPFS

## Step 1: Prepare Your Metadata

Create metadata JSON for your collection:

```json
{
  "name": "My NFT Collection",
  "symbol": "MNFT",
  "description": "An awesome NFT collection",
  "image": "https://arweave.net/collection-image.png",
  "external_url": "https://myproject.com"
}
```

And for each NFT:

```json
{
  "name": "NFT #1",
  "symbol": "MNFT",
  "description": "The first NFT in the collection",
  "image": "https://arweave.net/nft-1.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Rarity", "value": "Common" }
  ]
}
```

## Step 2: Upload Metadata

```typescript
import { getConfig, uploadMetadata } from 'ts-tokens'

const config = await getConfig()

// Upload collection metadata
const collectionUri = await uploadMetadata({
  name: 'My NFT Collection',
  symbol: 'MNFT',
  description: 'An awesome NFT collection',
  image: './collection-image.png',
}, config)

console.log('Collection URI:', collectionUri)
```

## Step 3: Create the Collection

```typescript
import { createCollection, getConfig } from 'ts-tokens'

async function main() {
  const config = await getConfig()

  const collection = await createCollection({
    name: 'My NFT Collection',
    symbol: 'MNFT',
    uri: 'https://arweave.net/collection-metadata.json',
    sellerFeeBasisPoints: 500, // 5% royalty
  }, config)

  console.log('Collection created!')
  console.log('Mint:', collection.mint)
}

main()
```

## Step 4: Mint NFTs to the Collection

```typescript
import { createNFT, getConfig } from 'ts-tokens'

async function mintNFT(index: number, collectionMint: string) {
  const config = await getConfig()

  const nft = await createNFT({
    name: `My NFT #${index}`,
    symbol: 'MNFT',
    uri: `https://arweave.net/nft-${index}.json`,
    sellerFeeBasisPoints: 500,
    collection: collectionMint,
    creators: [
      { address: config.wallet.publicKey, share: 100 }
    ],
  }, config)

  console.log(`NFT #${index} minted:`, nft.mint)
  return nft
}

// Mint 10 NFTs
const collectionMint = 'YOUR_COLLECTION_MINT'
for (let i = 1; i <= 10; i++) {
  await mintNFT(i, collectionMint)
}
```

## Step 5: Verify Collection Items

NFTs are automatically verified when minted with the `collection` option. To verify existing NFTs:

```typescript
import { getConfig, verifyCollection } from 'ts-tokens'

const config = await getConfig()

await verifyCollection(
  'NFT_MINT_ADDRESS',
  'COLLECTION_MINT_ADDRESS',
  config
)
```

## Using the CLI

```bash
# Create collection
tokens collection:create \
  --name "My NFT Collection" \
  --symbol MNFT \
  --uri https://arweave.net/collection.json \
  --royalty 500

# Mint NFT to collection
tokens nft:create \
  --name "NFT #1" \
  --symbol MNFT \
  --uri https://arweave.net/nft-1.json \
  --collection <collection-mint>

# List collection NFTs
tokens collection:info <collection-mint>
```

## Batch Minting

For large collections, use batch minting:

```typescript
import { batchMintNFTs, getConfig } from 'ts-tokens'

const config = await getConfig()

const nfts = await batchMintNFTs({
  collection: collectionMint,
  items: [
    { name: 'NFT #1', uri: 'https://...' },
    { name: 'NFT #2', uri: 'https://...' },
    { name: 'NFT #3', uri: 'https://...' },
  ],
  symbol: 'MNFT',
  sellerFeeBasisPoints: 500,
}, config)

console.log('Minted:', nfts.length, 'NFTs')
```

## Royalties

Royalties are set in basis points (1/100 of a percent):

- 100 = 1%
- 500 = 5%
- 1000 = 10%

```typescript
const nft = await createNFT({
  // ...
  sellerFeeBasisPoints: 500, // 5% royalty
  creators: [
    { address: 'Creator1...', share: 70 },
    { address: 'Creator2...', share: 30 },
  ],
}, config)
```

## Next Steps

- [Set up a Candy Machine Drop](./candy-machine-drop.md)
- [Configure Allowlists](./allowlist-setup.md)
- [NFT API Reference](/api/nft/create.md)
