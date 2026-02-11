# Vue Components

Vue 3 components for building Solana token applications.

> **Try it live:** [Vue NFT Gallery on StackBlitz](https://stackblitz.com/github/stacksjs/ts-tokens/tree/main/examples/vue-nft-gallery)

## Installation

```bash
bun add vue-tokens
# or
npm install vue-tokens
```

## Setup

Install the plugin in your Vue app:

```typescript
import { createApp } from 'vue'
import { TokensPlugin } from 'vue-tokens'
import App from './App.vue'

const app = createApp(App)

app.use(TokensPlugin, {
  endpoint: 'https://api.devnet.solana.com',
})

app.mount('#app')
```

## Components

### Wallet Components

- **[WalletAddress](./wallet.md)** - Display wallet address
- **[WalletBalance](./wallet.md#walletbalance)** - Display SOL balance

### Token Components

- **[TokenBalance](./tokens.md)** - Display token balance
- **[TokenInfo](./tokens.md#tokeninfo)** - Display token information
- **[TokenList](./tokens.md#tokenlist)** - List all tokens

### NFT Components

- **[NFTCard](./nft.md)** - Display NFT card
- **[NFTGrid](./nft.md#nftgrid)** - Grid of NFTs
- **[NFTDetails](./nft.md#nftdetails)** - Full NFT details

### Candy Machine Components

- **[MintButton](./candy-machine.md)** - Mint from Candy Machine
- **[MintCounter](./candy-machine.md#mintcounter)** - Minted/total counter
- **[MintProgress](./candy-machine.md#mintprogress)** - Progress bar

### Utility Components

- **[TransactionToast](./utility.md)** - Transaction notifications
- **[ExplorerLink](./utility.md#explorerlink)** - Solana Explorer links
- **[AddressDisplay](./utility.md#addressdisplay)** - Copyable addresses
- **[SolAmount](./utility.md#solamount)** - Formatted SOL amounts

## Composables

All components are backed by composables you can use directly:

```vue
<script setup>
import { useTokenBalance, useNFT, useTransaction } from 'vue-tokens'

const { balance, loading } = useTokenBalance(mint, owner)
const { nft } = useNFT(mintAddress)
const { send, pending } = useTransaction()
</script>
```

### Available Composables

| Composable | Description |
|------------|-------------|
| `useConnection()` | Get Solana connection |
| `useConfig()` | Get token config |
| `useTokenBalance(mint, owner)` | Token balance |
| `useTokenAccounts(owner)` | All token accounts |
| `useNFT(mint)` | Single NFT data |
| `useNFTs(owner)` | All NFTs for owner |
| `useCandyMachine(address)` | Candy Machine state |
| `useTransaction()` | Send transactions |

## Example Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { TokenBalance, NFTGrid, useTokens } from 'vue-tokens'

const ownerAddress = ref('ABC123...')
const { connection } = useTokens()
</script>

<template>
  <div>
    <h2>Token Balance</h2>
    <TokenBalance
      mint="TokenMint..."
      :owner="ownerAddress"
      show-symbol
    />

    <h2>NFT Collection</h2>
    <NFTGrid :owner="ownerAddress" :columns="3" />
  </div>
</template>
```

## TypeScript

Full TypeScript support included:

```typescript
import type { TokenDisplayInfo, NFTDisplayInfo } from 'vue-tokens'
```
