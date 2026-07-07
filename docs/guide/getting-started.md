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
import { configure } from 'ts-tokens'

configure({
  network: 'mainnet-beta',
  rpcUrl: 'https://your-rpc-endpoint.com',
  wallet: keypair, // Keypair instance
})
```

## Connection

### Create Connection

```typescript
import { createConnection, getConnection } from 'ts-tokens'

// Create connection
const connection = createConnection({
  rpcUrl: 'https://api.devnet.solana.com',
  commitment: 'confirmed',
})

// Get default connection (uses config)
const defaultConnection = getConnection()
```

### Using Wallet

```typescript
import { loadWallet, createWallet } from 'ts-tokens'

// Load wallet from file
const wallet = await loadWallet('~/.config/solana/id.json')

// Load from secret key
const wallet = await loadWallet(secretKeyArray)

// Create new wallet
const newWallet = createWallet()
console.log('New address:', newWallet.publicKey.toBase58())

// Request airdrop (devnet only)
await requestAirdrop(wallet.publicKey, 1) // 1 SOL
```

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

### Arweave

```typescript
import { ArweaveStorage } from 'ts-tokens'

const storage = new ArweaveStorage({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
})

// Upload metadata
const uri = await storage.upload({
  name: 'My Token',
  symbol: 'MTK',
  description: 'My awesome token',
  image: 'https://example.com/image.png',
})
```

### IPFS

```typescript
import { IPFSStorage } from 'ts-tokens'

const storage = new IPFSStorage({
  gateway: 'https://ipfs.io/ipfs/',
  apiUrl: 'https://api.pinata.cloud',
  apiKey: 'your-api-key',
})

const uri = await storage.upload(metadata)
```

### Shadow Drive

```typescript
import { ShadowDriveStorage } from 'ts-tokens'

const storage = new ShadowDriveStorage({
  wallet: walletKeypair,
})

// Create storage account
const storageAccount = await storage.createAccount({
  name: 'my-storage',
  size: '1GB',
})

// Upload file
const uri = await storage.upload(file, storageAccount)
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
