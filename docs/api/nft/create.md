# NFT Creation

Create non-fungible tokens on Solana.

## Quick Start

```typescript
import { createNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await createNFT({
  name: 'My NFT',
  symbol: 'MNFT',
  uri: 'https://arweave.net/metadata.json',
  sellerFeeBasisPoints: 500, // 5% royalty
}, config)

console.log('NFT created:', result.mint)
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | NFT name |
| `symbol` | string | Yes | NFT symbol |
| `uri` | string | Yes | Metadata URI |
| `sellerFeeBasisPoints` | number | No | Royalty (100 = 1%) |
| `creators` | Creator[] | No | Creator list |
| `collection` | string | No | Collection mint |
| `isMutable` | boolean | No | Allow metadata updates |

## Examples

### Create Simple NFT

```typescript
const result = await createNFT({
  name: 'Cool Art #1',
  symbol: 'CART',
  uri: 'https://arweave.net/abc123',
}, config)
```

### Create NFT with Royalties

```typescript
const result = await createNFT({
  name: 'Premium Art',
  symbol: 'PART',
  uri: 'https://arweave.net/xyz789',
  sellerFeeBasisPoints: 1000, // 10% royalty
  creators: [
    { address: creatorAddress, share: 100, verified: false }
  ],
}, config)
```

### Create NFT in Collection

```typescript
const result = await createNFT({
  name: 'Collection Item #42',
  symbol: 'COLL',
  uri: 'https://arweave.net/item42',
  collection: collectionMintAddress,
}, config)
```

## CLI Usage

```bash
# Create NFT
tokens nft:create --name "My NFT" --symbol MNFT --uri https://...

# Create with royalties
tokens nft:create --name "My NFT" --symbol MNFT --uri https://... --royalty 500
```

## Related

- [Collections](./collection.md)
- [NFT Metadata](./metadata.md)
- [Compressed NFTs](./compressed.md)
