# NFT Metadata

Manage and update NFT metadata.

## Get Metadata

```typescript
import { getNFTMetadata, getConfig } from 'ts-tokens'

const config = await getConfig()

const metadata = await getNFTMetadata('NFT_MINT_ADDRESS', config)

console.log('Name:', metadata.name)
console.log('Symbol:', metadata.symbol)
console.log('URI:', metadata.uri)
console.log('Royalty:', metadata.sellerFeeBasisPoints / 100, '%')
```

## Metadata Structure

```typescript
interface NFTMetadata {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators: Creator[]
  collection: Collection | null
  uses: Uses | null
  isMutable: boolean
  primarySaleHappened: boolean
  updateAuthority: string
}

interface Creator {
  address: string
  verified: boolean
  share: number
}

interface Collection {
  verified: boolean
  key: string
}
```

## Update Metadata

```typescript
import { updateNFTMetadata, getConfig } from 'ts-tokens'

const config = await getConfig()

await updateNFTMetadata('NFT_MINT_ADDRESS', {
  name: 'New Name',
  symbol: 'NEWSYM',
  uri: 'https://arweave.net/new-metadata.json',
}, config)
```

### Updatable Fields

| Field | Description |
|-------|-------------|
| `name` | NFT name (max 32 chars) |
| `symbol` | NFT symbol (max 10 chars) |
| `uri` | Metadata URI |
| `sellerFeeBasisPoints` | Royalty percentage |
| `creators` | Creator list |
| `isMutable` | Allow future updates |
| `primarySaleHappened` | Mark as sold |

## Update URI Only

```typescript
await updateNFTUri('NFT_MINT_ADDRESS', 'https://new-uri.com', config)
```

## Verify Creator

Creators must verify their address to receive royalties:

```typescript
import { verifyCreator, getConfig } from 'ts-tokens'

const config = await getConfig()

await verifyCreator('NFT_MINT_ADDRESS', config)
```

## Unverify Creator

```typescript
await unverifyCreator('NFT_MINT_ADDRESS', creatorAddress, config)
```

## Update Authority

Transfer update authority to another wallet:

```typescript
import { setUpdateAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

await setUpdateAuthority(
  'NFT_MINT_ADDRESS',
  'NEW_AUTHORITY_ADDRESS',
  config
)
```

## Make Immutable

Permanently disable metadata updates:

```typescript
await updateNFTMetadata('NFT_MINT_ADDRESS', {
  isMutable: false,
}, config)
```

**Warning**: This is irreversible.

## Off-Chain Metadata

The `uri` field points to a JSON file with additional metadata:

```json
{
  "name": "My NFT #1",
  "symbol": "MNFT",
  "description": "A unique digital collectible",
  "image": "https://arweave.net/image.png",
  "animation_url": "https://arweave.net/video.mp4",
  "external_url": "https://myproject.com",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Rarity", "value": "Legendary" }
  ],
  "properties": {
    "files": [
      { "uri": "https://arweave.net/image.png", "type": "image/png" }
    ],
    "category": "image"
  }
}
```

## Fetch Off-Chain Metadata

```typescript
import { fetchOffChainMetadata, getConfig } from 'ts-tokens'

const config = await getConfig()

const metadata = await getNFTMetadata(mint, config)
const offChain = await fetchOffChainMetadata(metadata.uri)

console.log('Description:', offChain.description)
console.log('Image:', offChain.image)
console.log('Attributes:', offChain.attributes)
```

## CLI Usage

```bash
# Get metadata
tokens nft:info <mint>

# Update metadata
tokens nft:update <mint> --name "New Name" --uri "https://..."

# Verify creator
tokens nft:verify-creator <mint>

# Make immutable
tokens nft:update <mint> --immutable
```

## Related

- [Creating NFTs](./create.md)
- [Metadata Standards](/guides/metadata-standards.md)
- [Collections](./collection.md)
