# Compressed NFTs (cNFTs)

Create and manage compressed NFTs using state compression.

## Overview

Compressed NFTs use Merkle trees to store NFT data off-chain while maintaining on-chain verification. This reduces costs by 1000x+ compared to regular NFTs.

## Cost Comparison

| Collection Size | Regular NFTs | Compressed NFTs |
|-----------------|--------------|-----------------|
| 1,000 | ~$2,000 | ~$5 |
| 10,000 | ~$20,000 | ~$50 |
| 1,000,000 | ~$2,000,000 | ~$500 |

## Create Merkle Tree

First, create a Merkle tree to store your cNFTs:

```typescript
import { createMerkleTree, getConfig } from 'ts-tokens'

const config = await getConfig()

const tree = await createMerkleTree({
  maxDepth: 14,        // Max 16,384 NFTs
  maxBufferSize: 64,   // Concurrent updates
  canopyDepth: 10,     // Proof size reduction
}, config)

console.log('Tree address:', tree.address)
```

### Tree Size Guide

| Max Depth | Max NFTs | Recommended For |
|-----------|----------|-----------------|
| 14 | 16,384 | Small collections |
| 20 | 1,048,576 | Medium collections |
| 30 | 1,073,741,824 | Large collections |

## Mint Compressed NFT

```typescript
import { mintCompressedNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

const nft = await mintCompressedNFT({
  tree: 'TREE_ADDRESS',
  collection: 'COLLECTION_MINT',
  name: 'My cNFT #1',
  symbol: 'CNFT',
  uri: 'https://arweave.net/metadata.json',
  sellerFeeBasisPoints: 500,
  creators: [
    { address: config.wallet.publicKey, share: 100 }
  ],
}, config)

console.log('Asset ID:', nft.assetId)
```

## Batch Mint

Mint many cNFTs efficiently:

```typescript
import { batchMintCompressedNFTs, getConfig } from 'ts-tokens'

const config = await getConfig()

const items = Array.from({ length: 100 }, (_, i) => ({
  name: `My cNFT #${i + 1}`,
  symbol: 'CNFT',
  uri: `https://arweave.net/nft-${i + 1}.json`,
}))

const results = await batchMintCompressedNFTs({
  tree: 'TREE_ADDRESS',
  collection: 'COLLECTION_MINT',
  items,
  sellerFeeBasisPoints: 500,
}, config)

console.log('Minted:', results.length, 'cNFTs')
```

## Transfer Compressed NFT

```typescript
import { transferCompressedNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

await transferCompressedNFT({
  assetId: 'ASSET_ID',
  recipient: 'RECIPIENT_ADDRESS',
}, config)
```

## Get cNFT Data

Use the Digital Asset Standard (DAS) API:

```typescript
import { getCompressedNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

const nft = await getCompressedNFT('ASSET_ID', config)

console.log('Name:', nft.name)
console.log('Owner:', nft.owner)
console.log('Collection:', nft.collection)
```

## Get cNFTs by Owner

```typescript
import { getCompressedNFTsByOwner, getConfig } from 'ts-tokens'

const config = await getConfig()

const nfts = await getCompressedNFTsByOwner('OWNER_ADDRESS', config)

console.log('Found:', nfts.length, 'cNFTs')
```

## Burn Compressed NFT

```typescript
import { burnCompressedNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

await burnCompressedNFT('ASSET_ID', config)
```

## Decompress to Regular NFT

Convert a cNFT to a regular NFT:

```typescript
import { decompressNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

const nft = await decompressNFT('ASSET_ID', config)

console.log('New mint:', nft.mint)
```

**Note**: Decompression costs ~0.01 SOL per NFT.

## CLI Usage

```bash
# Create tree
tokens cnft:tree --depth 14 --buffer 64

# Mint cNFT
tokens cnft:mint <tree> \
  --collection <collection> \
  --name "My cNFT" \
  --uri https://...

# Batch mint
tokens cnft:batch <tree> --assets ./assets/

# Transfer
tokens cnft:transfer <asset-id> --to <recipient>

# Get info
tokens cnft:info <asset-id>

# Decompress
tokens cnft:decompress <asset-id>
```

## RPC Requirements

Compressed NFTs require RPC providers that support the DAS API:

- **Helius** - Full DAS support
- **Triton** - Full DAS support
- **QuickNode** - With DAS add-on

```typescript
export default defineConfig({
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY',
})
```

## Limitations

- Cannot be listed on all marketplaces (support growing)
- Requires DAS-compatible RPC
- Proof fetching adds latency
- Tree creation has upfront cost

## Related

- [Creating NFTs](./create.md)
- [Collections](./collection.md)
- [Storage Options](/guides/storage-options.md)
