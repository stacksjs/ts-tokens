# ts-tokens

> A TypeScript library and CLI for managing fungible and non-fungible tokens on Solana.

## Features

- 🪙 **Fungible Tokens**: Create, mint, transfer, and burn SPL tokens
- 🎨 **NFT Collections**: Full NFT lifecycle management with collections
- 🍬 **Candy Machine**: Launch NFT drops with guards and allowlists
- 🗜️ **Compressed NFTs**: Cost-effective cNFTs with Merkle trees
- 🏛️ **Governance**: DAO proposals, voting, and treasuries via `ts-governance`
- 🚀 **Fast**: Built with performance in mind
- 📜 **TypeScript**: Fully typed with excellent DX
- 🛠️ **Library & CLI**: Use programmatically or from the command line

## Install

```sh
# Using bun (recommended)
bun add ts-tokens

# Using npm
npm install ts-tokens

# Using yarn / pnpm
yarn add ts-tokens
pnpm add ts-tokens
```

The CLI requires the [Bun](https://bun.sh) runtime (`tokens` is a Bun-targeted binary). Installing the package also exposes the `tokens` command through your package manager's bin linking.

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

## Subpath Exports

The library is split into focused modules you can import directly:

```ts
import { createToken } from 'ts-tokens/token'
import { mintNFT } from 'ts-tokens/nft'
import { getProgramAddresses } from 'ts-tokens/programs'
import { defineConfig } from 'ts-tokens/config'
```

See the package `exports` map for the full list (`staking`, `multisig`, `governance`, `defi`, `marketplace`, `wallets`, and more).

## Related Packages

| Package | Description |
|---------|-------------|
| `react-tokens` | React components and hooks for token UIs |
| `vue-tokens` | Vue 3 components and composables for token UIs |
| `ts-governance` | DAO governance, proposals, voting, and treasuries |

## Documentation

- [Getting Started](https://ts-tokens.dev/guide/getting-started)
- [Fungible Tokens](https://ts-tokens.dev/guide/tokens)
- [NFT Collections](https://ts-tokens.dev/guide/nfts)
- [CLI Reference](https://ts-tokens.dev/cli)
- [API Reference](https://ts-tokens.dev/api)

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stacksjs/ts-tokens/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](https://github.com/stacksjs/ts-tokens/blob/main/.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-tokens/discussions)

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/ts-tokens/blob/main/LICENSE.md) for more information.
