# Getting Started

Get up and running with ts-tokens in minutes.

## Installation

```bash
# Using bun
bun add ts-tokens

# Using npm
npm install ts-tokens

# Using pnpm
pnpm add ts-tokens
```

## Configuration

Create a `tokens.config.ts` file in your project root:

```typescript
import { defineConfig } from 'ts-tokens'

export default defineConfig({
  network: 'devnet', // 'mainnet-beta' | 'devnet' | 'testnet'
  rpcUrl: 'https://api.devnet.solana.com',
  wallet: {
    path: '~/.config/solana/id.json',
    // Or use environment variable
    // privateKey: process.env.SOLANA_PRIVATE_KEY,
  },
})
```

## Quick Examples

### Create a Fungible Token

```typescript
import { createToken, getConfig } from 'ts-tokens'

const config = await getConfig()

const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000,
}, config)

console.log('Token created:', token.mint)
```

### Create an NFT

```typescript
import { createNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

const nft = await createNFT({
  name: 'My First NFT',
  symbol: 'MNFT',
  uri: 'https://arweave.net/your-metadata.json',
  sellerFeeBasisPoints: 500, // 5% royalty
}, config)

console.log('NFT created:', nft.mint)
```

### Create an NFT Collection

```typescript
import { createCollection, mintNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

// Create the collection
const collection = await createCollection({
  name: 'My Collection',
  symbol: 'MCOL',
  uri: 'https://arweave.net/collection.json',
}, config)

// Mint NFTs to the collection
const nft = await mintNFT({
  name: 'Item #1',
  symbol: 'MCOL',
  uri: 'https://arweave.net/item1.json',
  collection: collection.mint,
}, config)
```

## Using the CLI

```bash
# Initialize configuration
tokens config:init

# Create a token
tokens token:create --name "My Token" --symbol MTK --decimals 9

# Create an NFT
tokens nft:create --name "My NFT" --symbol MNFT --uri https://...

# Check wallet balance
tokens wallet:balance
```

## React Integration

```tsx
import { TokensProvider, useTokenBalance, NFTCard } from 'react-tokens'

function App() {
  return (
    <TokensProvider endpoint="https://api.devnet.solana.com">
      <MyComponent />
    </TokensProvider>
  )
}

function MyComponent() {
  const { balance } = useTokenBalance(mintAddress, ownerAddress)
  return <div>Balance: {balance}</div>
}
```

## Vue Integration

```vue
<script setup>
import { useTokenBalance } from 'vue-tokens'

const { balance } = useTokenBalance(mintAddress, ownerAddress)
</script>

<template>
  <div>Balance: {{ balance }}</div>
</template>
```

## Next Steps

- [Create a Fungible Token](./create-fungible-token.md)
- [Create an NFT Collection](./create-nft-collection.md)
- [Set up a Candy Machine](./candy-machine-drop.md)
- [API Reference](/api/tokens/create.md)
