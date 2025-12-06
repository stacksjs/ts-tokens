# Token Metadata

Add and manage metadata for fungible tokens.

## Why Token Metadata?

Metadata allows tokens to display properly in wallets and explorers:

- Token name and symbol
- Logo/icon
- Description
- Social links

## Create Token with Metadata

```typescript
import { createToken, getConfig } from 'ts-tokens'

const config = await getConfig()

const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000_000_000,
  metadata: {
    uri: 'https://arweave.net/token-metadata.json',
  },
}, config)
```

## Metadata JSON Format

```json
{
  "name": "My Token",
  "symbol": "MTK",
  "description": "A utility token for my project",
  "image": "https://arweave.net/token-logo.png",
  "external_url": "https://myproject.com",
  "extensions": {
    "website": "https://myproject.com",
    "twitter": "https://twitter.com/myproject",
    "discord": "https://discord.gg/myproject"
  }
}
```

## Add Metadata to Existing Token

```typescript
import { addTokenMetadata, getConfig } from 'ts-tokens'

const config = await getConfig()

await addTokenMetadata('TOKEN_MINT_ADDRESS', {
  name: 'My Token',
  symbol: 'MTK',
  uri: 'https://arweave.net/metadata.json',
}, config)
```

## Update Token Metadata

```typescript
import { getConfig, updateTokenMetadata } from 'ts-tokens'

const config = await getConfig()

await updateTokenMetadata('TOKEN_MINT_ADDRESS', {
  name: 'Updated Name',
  uri: 'https://arweave.net/new-metadata.json',
}, config)
```

## Get Token Metadata

```typescript
import { getConfig, getTokenMetadata } from 'ts-tokens'

const config = await getConfig()

const metadata = await getTokenMetadata('TOKEN_MINT_ADDRESS', config)

console.log('Name:', metadata.name)
console.log('Symbol:', metadata.symbol)
console.log('URI:', metadata.uri)
```

## Upload Metadata

```typescript
import { getConfig, uploadMetadata } from 'ts-tokens'

const config = await getConfig()

const uri = await uploadMetadata({
  name: 'My Token',
  symbol: 'MTK',
  description: 'A utility token',
  image: './logo.png', // Will be uploaded
}, config)

console.log('Metadata URI:', uri)
```

## Image Requirements

For best display across wallets:

- **Format**: PNG or SVG
- **Size**: 256x256 or 512x512 pixels
- **Background**: Transparent or solid color
- **File size**: Under 100KB

## CLI Usage

```bash
# Create token with metadata
tokens token:create \
  --name "My Token" \
  --symbol MTK \
  --decimals 9 \
  --metadata-uri https://arweave.net/...

# Add metadata to existing token
tokens token:metadata <mint> \
  --name "My Token" \
  --symbol MTK \
  --uri https://arweave.net/...

# Update metadata
tokens token:metadata <mint> --uri https://arweave.net/new...

# Upload metadata file
tokens storage:upload ./metadata.json --provider arweave
```

## Token Lists

For tokens to appear in DEXs and wallets, submit to token lists:

1. **Jupiter**: Submit to Jupiter's token list
2. **Solana Token List**: Community-maintained list
3. **Wallet-specific**: Some wallets have their own lists

## Verified Tokens

Some platforms show verified badges for tokens that:

- Have complete metadata
- Are on official token lists
- Have verified social accounts

## Related

- [Creating Tokens](./create.md)
- [Authority Management](./authority.md)
- [Metadata Standards](/guides/metadata-standards.md)
