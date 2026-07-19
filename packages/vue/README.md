# vue-tokens

> Vue 3 components and composables for Solana tokens and NFTs.

Ready-to-use wallet, token, NFT, candy-machine, and governance UI for Vue 3 apps, built on top of [`ts-tokens`](https://github.com/stacksjs/ts-tokens).

## Install

```sh
# Using bun (recommended)
bun add vue-tokens ts-tokens

# Using npm
npm install vue-tokens ts-tokens
```

Peer dependencies you'll also want in your app:

```sh
bun add vue @solana/web3.js @solana/spl-token
```

## Plugin Setup

Install the `TokensPlugin` on your app. It creates a Solana `Connection` and a token config and provides them to every component and composable:

```ts
import { createApp } from 'vue'
import { TokensPlugin } from 'vue-tokens'
import App from './App.vue'

const app = createApp(App)

app.use(TokensPlugin, {
  endpoint: 'https://api.devnet.solana.com',
  // config: { … } — optional Partial<TokenConfig> overrides
})

app.mount('#app')
```

## Example: Token Balance Component + Composable

```vue
<script setup lang="ts">
import { TokenBalance, useTokens, useTokenBalance } from 'vue-tokens'
import { ref } from 'vue'

// Access the provided connection/config anywhere in the app
const { connection, config } = useTokens()

// Composables expose reactive refs for custom UIs
const owner = ref('7v91N7iZ9mNicL8NBf7HhkZpVb7J9f4YkW3h4VnV3xYz')
const { uiBalance, loading, error, refetch } = useTokenBalance(
  'So11111111111111111111111111111111111111112',
  owner,
)
</script>

<template>
  <!-- Components come with their own fetching and rendering -->
  <TokenBalance
    mint="So11111111111111111111111111111111111111112"
    :owner="owner"
  />

  <button :disabled="loading" @click="refetch">
    {{ loading ? 'Loading…' : `Balance: ${uiBalance}` }}
  </template>
</template>
```

## What's Inside

- **Wallet components** — `WalletAddress`, `WalletBalance`, `WalletConnectButton`, `WalletDisconnectButton`, `WalletMultiButton`
- **Token components** — `TokenBalance`, `TokenInfo`, `TokenList`, `TokenTransferForm`, `TokenMintForm`
- **NFT components** — `NFTCard`, `NFTGrid`, `NFTGallery`, `NFTDetails`, `NFTTransferButton`, `NFTBurnButton`
- **Candy Machine components** — `MintButton`, `MintCounter`, `MintProgress`, `MintPrice`, `CandyMachineProvider`, `AllowlistChecker`, `CountdownTimer`
- **Governance components** — `DAOProvider`, `ProposalList`, `ProposalCard`, `ProposalDetails`, `VoteButton`, `VotingPower`, `DelegateForm`, `TreasuryBalance`
- **Composables** — `useConnection`, `useConfig`, `useTokenBalance`, `useTokenAccounts`, `useNFT`, `useNFTs`, `useTransaction`, `useCandyMachine`, `useWallet`, `useDAO`, `useProposals`, `useVotingPower`, `useTreasury`
- **Plugin** — `TokensPlugin`, `createTokens`, `useTokens`, `TokensKey`

Subpath imports are available if you prefer narrower entry points:

```ts
import { TokenBalance } from 'vue-tokens/components'
import { useTokenBalance } from 'vue-tokens/composables'
```

## Documentation

- [ts-tokens documentation](https://ts-tokens.dev)
- [Core library](https://github.com/stacksjs/ts-tokens/tree/main/packages/ts-tokens)

## Changelog

Please see the [releases](https://github.com/stacksjs/ts-tokens/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](https://github.com/stacksjs/ts-tokens/blob/main/.github/CONTRIBUTING.md) for details.

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/ts-tokens/blob/main/LICENSE.md) for more information.
