<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-tokens

> A TypeScript library, CLI, and components for managing fungible and non-fungible tokens on Solana.

## Features

- 🪙 **Fungible Tokens**: Create, mint, transfer, and burn SPL tokens
- 🎨 **NFT Collections**: Full NFT lifecycle management with collections
- 🍬 **Candy Machine**: Launch NFT drops with guards and allowlists
- 🗜️ **Compressed NFTs**: Cost-effective cNFTs with Merkle trees
- 📦 **Zero Dependencies**: Only official Solana packages required
- 🚀 **Fast**: Built with performance in mind
- 📜 **TypeScript**: Fully typed with excellent DX
- 🛠️ **Library & CLI**: Use programmatically or from the command line
- ⚛️ **React Components**: Ready-to-use wallet and token components
- 💚 **Vue Components**: Vue 3 components for token UIs
- 🔐 **Security First**: Built-in security checks and best practices

## Install

```sh
# Using bun (recommended)
bun add ts-tokens

# Using npm
npm install ts-tokens

# Using yarn
yarn add ts-tokens

# Using pnpm
pnpm add ts-tokens
```

## Quick Start

### Create a Fungible Token

```ts
import { createToken, mintTokens } from 'ts-tokens'

// Create a new token
const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000_000n, // 1 billion tokens
})

console.log(`Token created: ${token.mint}`)

// Mint more tokens
await mintTokens({
  mint: token.mint,
  amount: 500_000_000n,
  destination: recipientAddress,
})
```

### Create an NFT Collection

```ts
import { createCollection, mintNFT } from 'ts-tokens'

// Create a collection
const collection = await createCollection({
  name: 'My NFT Collection',
  symbol: 'MNFT',
  uri: 'https://arweave.net/collection-metadata.json',
  sellerFeeBasisPoints: 500, // 5% royalty
})

// Mint an NFT to the collection
const nft = await mintNFT({
  name: 'NFT #1',
  symbol: 'MNFT',
  uri: 'https://arweave.net/nft-1-metadata.json',
  collection: collection.mint,
  sellerFeeBasisPoints: 500,
})

console.log(`NFT minted: ${nft.mint}`)
```

### CLI Usage

```bash
# Configure your wallet
tokens config init

# Create a token
tokens create --name "My Token" --symbol "MTK" --decimals 9

# Mint tokens
tokens mint <mint-address> 1000000 --to <recipient>

# Create an NFT collection
tokens collection create --name "My Collection" --symbol "MNFT"

# Mint an NFT
tokens nft create --name "NFT #1" --collection <collection-address>

# Check balances
tokens balance <mint-address>
```

## Configuration

Create a `tokens.config.ts` file in your project root:

```ts
import { defineConfig } from 'ts-tokens'

export default defineConfig({
  // Blockchain settings
  chain: 'solana',
  network: 'devnet', // 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

  // Wallet configuration
  wallet: {
    keypairPath: '~/.config/solana/id.json',
  },

  // Storage provider for metadata
  storageProvider: 'arweave', // 'arweave' | 'ipfs' | 'shadow-drive'

  // Transaction settings
  commitment: 'confirmed',
  autoCreateAccounts: true,

  // Security
  securityChecks: true,
  dryRun: false,
})
```

## Packages

| Package | Description |
|---------|-------------|
| `ts-tokens` | Core library and CLI |
| `@ts-tokens/react` | React components and hooks |
| `@ts-tokens/vue` | Vue 3 components and composables |
| `ts-governance` | DAO governance and voting |

## Documentation

- [Getting Started](https://ts-tokens.dev/guide/getting-started)
- [Fungible Tokens](https://ts-tokens.dev/guide/tokens)
- [NFT Collections](https://ts-tokens.dev/guide/nfts)
- [Candy Machine](https://ts-tokens.dev/guide/candy-machine)
- [CLI Reference](https://ts-tokens.dev/cli)
- [API Reference](https://ts-tokens.dev/api)

## Why ts-tokens

**Zero External Dependencies**: Unlike Metaplex SDKs, ts-tokens only depends on official Solana packages (`@solana/web3.js`, `@solana/spl-token`). We implement all program interactions using raw instructions.

**Better Developer Experience**: Simpler APIs, better error messages, and TypeScript-first design.

**Full Feature Parity**: Everything you can do with Metaplex, you can do with ts-tokens—often with less code.

```ts
// Metaplex: 3+ instructions, multiple accounts
// ts-tokens: 1 instruction, clean API
await createNFT({
  name: 'My NFT',
  royalty: 5, // 5% - not basis points!
})
```

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stacksjs/ts-tokens/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-tokens/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

“Software that is free, but hopes for a postcard.” We love receiving postcards from around the world showing where `tokens` is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ts-tokens?style=flat-square
[npm-version-href]: https://npmjs.com/package/ts-tokens
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-tokens/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-tokens/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-tokens/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-tokens -->
