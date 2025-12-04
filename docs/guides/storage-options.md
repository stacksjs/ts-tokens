# Choosing a Storage Provider

Compare storage options for NFT metadata and assets.

## Overview

| Provider | Permanence | Cost | Speed | Best For |
|----------|------------|------|-------|----------|
| Arweave | Permanent | One-time | Medium | Production NFTs |
| IPFS | Requires pinning | Ongoing | Fast | Development |
| Shadow Drive | Permanent | One-time | Fast | Solana-native |
| Local | Temporary | Free | Instant | Testing |

## Arweave

**Best for**: Production NFT collections

### Pros

- Permanent storage (200+ years)
- One-time payment
- Decentralized
- Industry standard

### Cons

- Higher upfront cost
- Slower uploads
- Requires AR or SOL for payment

### Usage

```typescript
import { uploadToArweave, getConfig } from 'ts-tokens'

const config = await getConfig()

const uri = await uploadToArweave({
  file: './image.png',
  metadata: {
    name: 'My NFT',
    // ...
  },
}, config)
```

### Configuration

```typescript
export default defineConfig({
  storage: {
    provider: 'arweave',
    arweaveGateway: 'https://arweave.net',
    // Optional: Use Irys (formerly Bundlr) for SOL payments
    irysEndpoint: 'https://node1.irys.xyz',
  },
})
```

### Pricing

- ~$0.0001 per KB
- 1MB image ≈ $0.10
- 10,000 NFT collection ≈ $100-500

## IPFS

**Best for**: Development and testing

### Pros

- Fast uploads
- Many providers
- Lower initial cost
- Familiar technology

### Cons

- Requires ongoing pinning
- Content can disappear
- Not truly permanent

### Providers

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| NFT.Storage | 31GB | N/A |
| Pinata | 1GB | From $20/mo |
| Web3.Storage | 5GB | From $10/mo |
| Infura | 5GB | From $50/mo |

### Usage

```typescript
import { uploadToIPFS, getConfig } from 'ts-tokens'

const config = await getConfig()

const uri = await uploadToIPFS({
  file: './image.png',
  metadata: {
    name: 'My NFT',
    // ...
  },
}, config)
```

### Configuration

```typescript
export default defineConfig({
  storage: {
    provider: 'ipfs',
    ipfsGateway: 'https://ipfs.io/ipfs/',
    // Provider-specific settings
    pinata: {
      apiKey: process.env.PINATA_API_KEY,
      secretKey: process.env.PINATA_SECRET_KEY,
    },
    // Or NFT.Storage
    nftStorage: {
      apiKey: process.env.NFT_STORAGE_KEY,
    },
  },
})
```

## Shadow Drive

**Best for**: Solana-native projects

### Pros

- Solana-native
- Pay with SOL or SHDW
- Fast and reliable
- Mutable storage option

### Cons

- Smaller ecosystem
- Less tooling
- Requires SHDW token for some features

### Usage

```typescript
import { uploadToShadowDrive, getConfig } from 'ts-tokens'

const config = await getConfig()

// Create storage account first
const account = await createShadowDriveAccount({
  size: '10MB',
  name: 'my-nft-storage',
}, config)

// Upload files
const uri = await uploadToShadowDrive({
  account: account.address,
  file: './image.png',
}, config)
```

### Configuration

```typescript
export default defineConfig({
  storage: {
    provider: 'shadow-drive',
    shadowDrive: {
      endpoint: 'https://shadow-storage.genesysgo.net',
    },
  },
})
```

## Comparison by Use Case

### Small Collection (< 100 NFTs)

**Recommended**: Arweave

- Permanent storage worth the cost
- Simple one-time upload

### Large Collection (1000+ NFTs)

**Recommended**: Arweave via Irys

- Batch uploads
- SOL payment option
- Cost-effective at scale

### Development/Testing

**Recommended**: IPFS (NFT.Storage)

- Free tier sufficient
- Fast iteration
- Easy to replace later

### Gaming/Dynamic NFTs

**Recommended**: Shadow Drive

- Mutable storage
- Fast updates
- Solana-native

## Migration

### IPFS to Arweave

```typescript
import { migrateStorage, getConfig } from 'ts-tokens'

const config = await getConfig()

await migrateStorage({
  from: 'ipfs',
  to: 'arweave',
  collection: 'COLLECTION_MINT',
}, config)
```

### Update Metadata URIs

```typescript
import { updateMetadataUri, getConfig } from 'ts-tokens'

const config = await getConfig()

await updateMetadataUri(
  'NFT_MINT',
  'https://arweave.net/new-uri',
  config
)
```

## CLI Commands

```bash
# Upload to Arweave
tokens storage:upload ./image.png --provider arweave

# Upload to IPFS
tokens storage:upload ./image.png --provider ipfs

# Upload directory
tokens storage:upload ./assets/ --provider arweave

# Check storage status
tokens storage:info <uri>
```

## Cost Calculator

```typescript
import { estimateStorageCost } from 'ts-tokens'

const cost = await estimateStorageCost({
  files: ['./image1.png', './image2.png'],
  provider: 'arweave',
})

console.log('Estimated cost:', cost.sol, 'SOL')
```

## Next Steps

- [Testing on Devnet](./testing-devnet.md)
- [Storage API Reference](/api/storage/upload.md)
