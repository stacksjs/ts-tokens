# Indexer & DAS API

Query NFT and token data using DAS API.

## Overview

ts-tokens provides integrations with:

- **Helius** - DAS API, webhooks, enhanced transactions
- **Generic DAS** - Works with any DAS-compatible RPC

## Helius Client

### Setup

```typescript
import { createHeliusClient } from 'ts-tokens'

const helius = createHeliusClient('your-api-key', 'mainnet-beta')
```

### Get Asset by ID

```typescript
const asset = await helius.getAsset(mintAddress)

console.log('Name:', asset.content.metadata.name)
console.log('Owner:', asset.ownership.owner)
console.log('Compressed:', asset.compression?.compressed)
```

### Get Assets by Owner

```typescript
const result = await helius.getAssetsByOwner(walletAddress, {
  page: 1,
  limit: 100,
})

console.log('Total NFTs:', result.total)
for (const asset of result.items) {
  console.log(asset.content.metadata.name)
}
```

### Get Assets by Collection

```typescript
const result = await helius.getAssetsByGroup(
  'collection',
  collectionAddress,
  { limit: 100 }
)
```

### Search Assets

```typescript
const result = await helius.searchAssets({
  ownerAddress: walletAddress,
  compressed: true,
  burnt: false,
  limit: 50,
})
```

### Get Asset Proof (Compressed NFTs)

```typescript
const proof = await helius.getAssetProof(compressedNftMint)

console.log('Root:', proof.root)
console.log('Proof length:', proof.proof.length)
console.log('Tree:', proof.tree_id)
```

### Transaction History

```typescript
const history = await helius.getTransactionHistory(walletAddress, {
  limit: 20,
  type: 'NFT_SALE',
})

for (const tx of history) {
  console.log(`${tx.type}: ${tx.signature}`)
}
```

### Parse Transaction

```typescript
const parsed = await helius.parseTransaction(signature)

console.log('Type:', parsed.type)
console.log('Fee:', parsed.fee)
if (parsed.events?.nft) {
  console.log('NFT Sale:', parsed.events.nft.amount)
}
```

## Webhooks

### Create Webhook

```typescript
const { webhookID } = await helius.createWebhook({
  webhookURL: 'https://your-server.com/webhook',
  transactionTypes: ['NFT_SALE', 'NFT_LISTING'],
  accountAddresses: [collectionAddress],
  webhookType: 'enhanced',
})
```

### List Webhooks

```typescript
const webhooks = await helius.getWebhooks()

for (const webhook of webhooks) {
  console.log(`${webhook.webhookID}: ${webhook.webhookURL}`)
}
```

### Delete Webhook

```typescript
await helius.deleteWebhook(webhookId)
```

## Generic DAS Client

Works with any DAS-compatible RPC (Helius, Triton, etc.):

```typescript
import { createDASClient } from 'ts-tokens'

const das = createDASClient('https://your-das-rpc.com')

// Same API as Helius client
const asset = await das.getAsset(mintAddress)
const assets = await das.getAssetsByOwner(walletAddress)
```

## Utility Functions

### Get All NFTs by Owner

```typescript
import { createDASClient, getAllNFTsByOwner } from 'ts-tokens'

const das = createDASClient(rpcUrl)
const allNFTs = await getAllNFTsByOwner(das, walletAddress)

// Only compressed
const compressed = await getAllNFTsByOwner(das, walletAddress, {
  onlyCompressed: true,
})
```

### Get All NFTs in Collection

```typescript
import { createDASClient, getAllNFTsInCollection } from 'ts-tokens'

const das = createDASClient(rpcUrl)
const collectionNFTs = await getAllNFTsInCollection(das, collectionAddress)
```

### Check if Compressed

```typescript
import { isCompressedNFT } from 'ts-tokens'

if (isCompressedNFT(asset)) {
  console.log('This is a compressed NFT')
}
```

### Get Collection from Asset

```typescript
import { getAssetCollection } from 'ts-tokens'

const collection = getAssetCollection(asset)
if (collection) {
  console.log('Collection:', collection)
}
```

## CLI Usage

```bash
# Get asset info
tokens das:asset <mint>

# Get assets by owner
tokens das:owner <wallet> --limit 100

# Get assets by collection
tokens das:collection <collection> --limit 100

# Get asset proof
tokens das:proof <compressed-nft-mint>

# Transaction history
tokens history <wallet> --type NFT_SALE
```

## Using with Connection

```typescript
import { Connection } from '@solana/web3.js'
import { createHeliusClient } from 'ts-tokens'

const helius = createHeliusClient('your-api-key')
const connection = new Connection(helius.getRpcUrl())

// Use enhanced RPC features
```

## Related

- [Compressed NFTs](/api/nft/compressed.md)
- [NFT Operations](/api/nft/index.md)
