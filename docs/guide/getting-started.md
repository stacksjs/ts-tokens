# Getting Started

ts-tokens is a TypeScript library for creating and managing tokens on Solana.

## Installation

::: code-group

```sh [npm]
npm install ts-tokens
```

```sh [pnpm]
pnpm add ts-tokens
```

```sh [bun]
bun add ts-tokens
```

:::

## Configuration

### Configuration File

Create a `tokens.config.ts` file:

```typescript
import type { TokenConfig } from 'ts-tokens'

export default {
  // Network configuration
  network: 'devnet', // 'mainnet-beta' | 'devnet' | 'testnet'
  rpcUrl: 'https://api.devnet.solana.com',

  // Wallet configuration
  wallet: {
    path: '~/.config/solana/id.json',
    // Or use environment variable
    // secretKey: process.env.SOLANA_SECRET_KEY,
  },

  // Storage configuration
  storage: {
    provider: 'arweave', // 'arweave' | 'ipfs' | 'shadow-drive'
    arweave: {
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    },
  },

  // Default token settings
  defaults: {
    sellerFeeBasisPoints: 500, // 5% royalties
  },
} satisfies TokenConfig
```

### Programmatic Configuration

```typescript
import { setConfig } from 'ts-tokens'

const config = setConfig({
  network: 'mainnet-beta',
  rpcUrl: 'https://your-rpc-endpoint.com',
})
```

`setConfig` applies the configuration in-memory for the current process and
returns the merged `TokenConfig`.

## Connection

### Create Connection

```typescript
import { getConfig } from 'ts-tokens'
import { createSolanaConnection } from 'ts-tokens/drivers'

// Create a connection from your config
const config = await getConfig()
const connection = createSolanaConnection(config)

// The underlying web3.js Connection is available via `.raw`
const slot = await connection.raw.getSlot()
```

### Using Wallet

```typescript
import { getConfig, loadWallet, createWallet } from 'ts-tokens'

const config = await getConfig()

// Load the configured wallet keypair (from wallet.keypairPath,
// TOKENS_KEYPAIR, or ~/.config/solana/id.json)
const keypair = loadWallet(config)
console.log('Address:', keypair.publicKey.toBase58())

// Create a signing wallet wrapper
const wallet = createWallet(config)
console.log('Wallet address:', wallet.publicKey)
```

To fund a devnet wallet, use the CLI: `tokens wallet:airdrop 1` (1 SOL).

## Token Operations

### Create Token

```typescript
import { createToken } from 'ts-tokens'

const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000_000, // 1 billion tokens
})

console.log('Token mint:', token.mint.toBase58())
console.log('Token account:', token.tokenAccount.toBase58())
```

### Mint Tokens

```typescript
import { mintTokens } from 'ts-tokens'

await mintTokens({
  mint: tokenMint,
  amount: 1_000_000, // Amount in smallest units
  destination: recipientWallet,
})
```

### Transfer Tokens

```typescript
import { transferTokens } from 'ts-tokens'

await transferTokens({
  mint: tokenMint,
  from: senderWallet,
  to: recipientAddress,
  amount: 100_000,
})
```

### Burn Tokens

```typescript
import { burnTokens } from 'ts-tokens'

await burnTokens({
  mint: tokenMint,
  amount: 50_000,
  owner: walletOwner,
})
```

## Token Accounts

### Get or Create Token Account

```typescript
import { getOrCreateAssociatedTokenAccount } from 'ts-tokens'

const tokenAccount = await getOrCreateAssociatedTokenAccount({
  mint: tokenMint,
  owner: ownerWallet,
})

console.log('Token account:', tokenAccount.address.toBase58())
console.log('Balance:', tokenAccount.amount)
```

### Get Token Account Info

```typescript
import { getTokenAccountInfo } from 'ts-tokens'

const info = await getTokenAccountInfo(tokenAccountAddress)

console.log('Mint:', info.mint.toBase58())
console.log('Owner:', info.owner.toBase58())
console.log('Amount:', info.amount)
```

### Close Token Account

```typescript
import { closeTokenAccount } from 'ts-tokens'

// Close account and recover rent
await closeTokenAccount({
  account: tokenAccountAddress,
  owner: ownerWallet,
  destination: destinationForRent, // Optional, defaults to owner
})
```

## Authority Management

### Set Mint Authority

```typescript
import { setMintAuthority, revokeMintAuthority } from 'ts-tokens'

// Transfer mint authority
await setMintAuthority({
  mint: tokenMint,
  currentAuthority: currentAuthorityWallet,
  newAuthority: newAuthorityAddress,
})

// Revoke mint authority (no more minting possible)
await revokeMintAuthority({
  mint: tokenMint,
  authority: authorityWallet,
})
```

### Freeze Authority

```typescript
import {
  setFreezeAuthority,
  freezeAccount,
  thawAccount,
} from 'ts-tokens'

// Set freeze authority
await setFreezeAuthority({
  mint: tokenMint,
  currentAuthority: currentAuthorityWallet,
  newAuthority: newAuthorityAddress,
})

// Freeze account
await freezeAccount({
  account: tokenAccountAddress,
  mint: tokenMint,
  authority: freezeAuthorityWallet,
})

// Thaw (unfreeze) account
await thawAccount({
  account: tokenAccountAddress,
  mint: tokenMint,
  authority: freezeAuthorityWallet,
})
```

## Storage Providers

The default storage provider is `arweave`. Uploads can also fall back across
providers via `uploadWithFallback`, whose default order is
`arweave → ipfs → shadow-drive`. The `local` filesystem adapter is **not**
part of the fallback chain (its `localhost` URLs are not publicly resolvable)
— it is only used when explicitly configured.

### Arweave

Uploads go through an Irys node and are signed with your Solana keypair, so
you need a keypair configured (`wallet.keypairPath`, the `TOKENS_KEYPAIR`
environment variable, or `~/.config/solana/id.json`) **and** a funded Irys
balance.

```typescript
import { createArweaveAdapter } from 'ts-tokens/storage'

const storage = createArweaveAdapter({
  gateway: 'https://arweave.net',
  irysNode: 'https://node1.irys.xyz',
})

// Upload a metadata JSON object
const result = await storage.uploadJson({
  name: 'My Token',
  symbol: 'MTK',
  description: 'My awesome token',
  image: 'https://example.com/image.png',
})

console.log('Metadata URI:', result.url)
```

### IPFS

IPFS uploads require a pinning service (Pinata JWT via `pinningApiKey` or the
`PINATA_JWT` environment variable) or a local node (`apiEndpoint`).

```typescript
import { createIPFSAdapter } from 'ts-tokens/storage'

const storage = createIPFSAdapter({
  gateway: 'https://ipfs.io',
  pinningService: 'pinata',
  pinningApiKey: 'your-pinata-jwt',
})

const result = await storage.uploadJson(metadata)
console.log('Metadata URI:', result.url)
```

### Shadow Drive

Shadow Drive requires a pre-created storage account and an `endpoint` pointing
at a running SHDW storage node (the legacy hosted GenesysGo endpoint is
defunct).

```typescript
import { getConfig } from 'ts-tokens'
import { createShadowDriveAdapter } from 'ts-tokens/storage'

const config = await getConfig()
const storage = createShadowDriveAdapter({
  storageAccount: '<your-storage-account>',
  endpoint: 'https://your-shdw-node.example.com',
})
storage.setTokenConfig(config)

// Upload a file
const result = await storage.uploadFile('./image.png')
console.log('File URI:', result.url)
```

## TypeScript Types

```typescript
import type {
  TokenConfig,
  CreateTokenOptions,
  MintTokensOptions,
  TransferOptions,
  NFTMetadata,
  CollectionMetadata,
} from 'ts-tokens'
```

## Next Steps

- [Fungible Tokens](/guide/fungible) - Token creation and management
- [NFTs](/guide/nft) - NFT creation and collections
