# ts-tokens TODO

> A comprehensive task list for building a TypeScript library, CLI, and components for managing fungible and non-fungible tokens on blockchains.

## Table of Contents

- [Phase 1: Foundation & Architecture](#phase-1-foundation--architecture)
- [Phase 2: Core Library - Solana Integration](#phase-2-core-library---solana-integration)
- [Phase 3: Fungible Token Support](#phase-3-fungible-token-support)
- [Phase 4: NFT Collection Management](#phase-4-nft-collection-management)
- [Phase 5: CLI Implementation](#phase-5-cli-implementation)
- [Phase 6: React Components](#phase-6-react-components)
- [Phase 7: Vue Components](#phase-7-vue-components)
- [Phase 8: Documentation & Examples](#phase-8-documentation--examples)
- [Phase 9: Testing & Quality Assurance](#phase-9-testing--quality-assurance)
- [Phase 10: Release & Distribution](#phase-10-release--distribution)
- [Phase 11: Security & Best Practices](#phase-11-security--best-practices)
- [Phase 12: Token-2022 (SPL Token Extensions)](#phase-12-token-2022-spl-token-extensions)
- [Phase 13: Marketplace & Trading Features](#phase-13-marketplace--trading-features)
- [Phase 14: Analytics & Indexing](#phase-14-analytics--indexing)
- [Phase 15: Automation & Scripting](#phase-15-automation--scripting)
- [Phase 16: Migration & Compatibility Tools](#phase-16-migration--compatibility-tools)
- [Phase 17: Simple NFT Standard (ts-tokens Native)](#phase-17-simple-nft-standard-ts-tokens-native)
- [Phase 18: Staking & Token Locking](#phase-18-staking--token-locking)
- [Phase 19: Multi-Sig Authority Support](#phase-19-multi-sig-authority-support)
- [Phase 20: Programmable NFTs (pNFTs)](#phase-20-programmable-nfts-pnfts)
- [Phase 21: ts-governance - DAO & Governance Package](#phase-21-ts-governance---dao--governance-package)
- [Phase 22: Developer Experience Enhancements](#phase-22-developer-experience-enhancements)
- [Phase 23: Performance Optimization](#phase-23-performance-optimization)
- [Phase 24: Internationalization & Accessibility](#phase-24-internationalization--accessibility)
- [Phase 25: Ecosystem Integrations](#phase-25-ecosystem-integrations)
- [Recommended Implementation Order](#recommended-implementation-order)

---

## Phase 1: Foundation & Architecture

### 1.1 Project Restructuring

- [ ] Remove existing QR/Barcode code from `packages/ts-tokens/src/` (this is legacy code from a different project)
- [x] Update root `README.md` to reflect new blockchain token focus
- [x] Update `package.json` description and keywords for blockchain tokens
- [ ] Create new project architecture diagram in docs

### 1.2 Configuration System

- [x] Rename config name from `tokenx` to `tokens` in `src/config.ts`
- [x] Define comprehensive `TokenConfig` interface in `src/types.ts`:
  - [x] `chain`: Current active chain (default: `'solana'`)
  - [x] `network`: Network environment (`'mainnet-beta'` | `'devnet'` | `'testnet'` | `'localnet'`)
  - [x] `rpcUrl`: Custom RPC endpoint (optional)
  - [x] `commitment`: Solana commitment level (`'processed'` | `'confirmed'` | `'finalized'`)
  - [x] `wallet`: Wallet configuration (keypair path or adapter)
  - [x] `verbose`: Logging verbosity
  - [x] `dryRun`: Simulate transactions without executing
  - [x] `confirmOptions`: Transaction confirmation options
  - [x] `ipfsGateway`: IPFS gateway URL for metadata
  - [x] `arweaveGateway`: Arweave gateway URL for metadata
  - [x] `storageProvider`: Default storage provider (`'ipfs'` | `'arweave'` | `'nft.storage'` | `'shadow-drive'`)

### 1.3 Driver/Adapter Architecture

- [x] Create `src/drivers/` directory for chain-specific implementations
- [x] Define `ChainDriver` interface in `src/types/driver.ts`:

  ```ts
  interface ChainDriver {
    name: string
    connect(): Promise<Connection>
    disconnect(): Promise<void>
    getBalance(address: string): Promise<bigint>
    // Fungible token methods
    createToken(options: CreateTokenOptions): Promise<TokenResult>
    mintTokens(options: MintOptions): Promise<TransactionResult>
    transferTokens(options: TransferOptions): Promise<TransactionResult>
    burnTokens(options: BurnOptions): Promise<TransactionResult>
    // NFT methods
    createCollection(options: CreateCollectionOptions): Promise<CollectionResult>
    mintNFT(options: MintNFTOptions): Promise<NFTResult>
    // ... more methods
  }
  ```

- [x] Create `src/drivers/solana/` directory structure
- [x] Create driver registry/factory in `src/drivers/index.ts`
- [ ] Implement driver auto-detection from config

### 1.4 Core Types Definition

- [x] Create `src/types/` directory with organized type files:
  - [x] `src/types/index.ts` - Main export file
  - [x] `src/types/config.ts` - Configuration types
  - [x] `src/types/driver.ts` - Driver interface types
  - [x] `src/types/token.ts` - Fungible token types
  - [x] `src/types/nft.ts` - NFT and collection types
  - [x] `src/types/metadata.ts` - Metadata standard types
  - [x] `src/types/transaction.ts` - Transaction types
  - [x] `src/types/wallet.ts` - Wallet types
  - [x] `src/types/storage.ts` - Storage provider types

### 1.5 Dependency Setup (Zero External Dependencies Philosophy)

> **Goal**: Compete with Metaplex by having ZERO dependencies beyond official Solana packages. We implement everything ourselves using raw Solana program instructions, not Metaplex SDKs.

#### Official Solana Dependencies (Only These)

- [x] Add to `packages/ts-tokens/package.json`:
  - [x] `@solana/web3.js` - Core Solana SDK (official, required)
  - [x] `@solana/spl-token` - SPL Token program client (official, required)

#### Internal Stacks Dependencies (Our Own Zero-Dep Packages)

- [ ] `@stacksjs/clapp` - CLI framework (source: `~/Code/clapp`, improve as needed)
  - [ ] Spinners, colors, prompts, tables all from this single package
- [ ] `@stacksjs/storage` - Storage abstraction (source: `~/Code/stacks/storage/framework/core/storage/src`)
  - [ ] Use for all file/asset storage operations
  - [ ] Extend with blockchain-specific drivers (see 1.6)

#### What We Do NOT Use (Metaplex Replacement Strategy)

- [ ] ~~`@metaplex-foundation/mpl-token-metadata`~~ → Implement raw Token Metadata Program instructions
- [ ] ~~`@metaplex-foundation/mpl-candy-machine`~~ → Implement raw Candy Machine v3 instructions
- [ ] ~~`@metaplex-foundation/umi`~~ → Build our own lightweight transaction builder
- [ ] ~~`@metaplex-foundation/mpl-core`~~ → Implement raw Core Asset Program instructions
- [ ] ~~`bs58`~~ → Use native `Buffer` or implement 10-line base58 encoder
- [ ] ~~`@irys/sdk`~~ → Direct Arweave HTTP API via `@stacksjs/storage` driver
- [ ] ~~`nft.storage`~~ → Direct IPFS HTTP API via `@stacksjs/storage` driver
- [ ] ~~`@shadow-drive/sdk`~~ → Direct Shadow Drive program instructions

### 1.6 Storage Drivers for `@stacksjs/storage`

> Extend `@stacksjs/storage` with blockchain-optimized drivers. Source: `~/Code/stacks/storage/framework/core/storage/src`

#### Arweave Driver

- [x] Create `ArweaveStorageAdapter` implementing `StorageAdapter` interface
- [x] Implement direct Arweave HTTP API calls (no `@irys/sdk`):
  - [x] `POST /tx` - Submit transaction
  - [x] `GET /tx/{id}/data` - Retrieve data
  - [x] `GET /price/{bytes}` - Get upload price
  - [x] `GET /{id}` - Get transaction status
- [ ] Implement Arweave transaction signing with Solana keypair (cross-chain signing)
- [x] Implement chunked uploads for large files (>100KB)
- [ ] Implement bundle transactions for batch uploads (ANS-104 spec)
- [x] Add gateway URL configuration (arweave.net, ar-io.net, etc.)
- [x] Implement `publicUrl()` returning `https://arweave.net/{txId}`
- [x] Add retry logic with exponential backoff

#### IPFS Driver

- [x] Create `IPFSStorageAdapter` implementing `StorageAdapter` interface
- [x] Implement direct IPFS HTTP API calls (no `nft.storage` SDK):
  - [x] `POST /api/v0/add` - Add file to IPFS
  - [x] `POST /api/v0/cat` - Retrieve file
  - [ ] `POST /api/v0/pin/add` - Pin content
  - [ ] `POST /api/v0/pin/rm` - Unpin content
- [x] Support multiple IPFS providers via config:
  - [x] Local IPFS node (`localhost:5001`)
  - [x] Pinata API (`api.pinata.cloud`)
  - [x] NFT.Storage API (`api.nft.storage`) - direct HTTP, no SDK
  - [x] Web3.Storage API (`api.web3.storage`)
  - [x] Infura IPFS (`ipfs.infura.io`)
- [x] Implement `publicUrl()` returning configurable gateway URL
- [ ] Add CID v0/v1 support
- [ ] Implement directory uploads (CAR files)

#### Shadow Drive Driver (Solana-Native)

- [x] Create `ShadowDriveStorageAdapter` implementing `StorageAdapter` interface
- [ ] Implement direct Shadow Drive program instructions (no `@shadow-drive/sdk`):
  - [ ] `initializeAccount` - Create storage account
  - [x] `uploadFile` - Upload file to account
  - [x] `deleteFile` - Delete file
  - [ ] `editFile` - Replace file contents
  - [ ] `addStorage` - Increase storage capacity
  - [ ] `reduceStorage` - Decrease storage (get SOL back)
  - [ ] `claimStake` - Claim staked SOL
- [ ] Shadow Drive Program ID: `2e1wdyNhUvE76y6yUCvah2KaviavMJYKoRun8acMRBZZ`
- [ ] Implement SHDW token payment handling
- [x] Implement `publicUrl()` returning `https://shdw-drive.genesysgo.net/{account}/{filename}`
- [ ] Add storage account management utilities

#### Local/Filesystem Driver (Development)

- [x] Ensure existing local driver in `@stacksjs/storage` works for dev/testing
- [x] Add mock URLs for local development (`file://` or `http://localhost`)

#### Driver Factory

- [ ] Create `createStorageDriver(config)` factory function
- [ ] Auto-select driver based on `config.storageProvider`:

  ```ts
  type StorageProvider = 'arweave' | 'ipfs' | 'shadow-drive' | 'local'
  ```

- [ ] Support driver-specific configuration options
- [ ] Implement fallback chain (try arweave → ipfs → shadow-drive)

### 1.7 Raw Solana Program Implementations (Metaplex Replacement)

> Instead of using Metaplex SDKs, we implement raw instruction builders for each program.

#### Token Metadata Program (Replace `mpl-token-metadata`)

- [x] Create `src/programs/token-metadata/` directory
- [x] Program ID: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
- [x] Implement instruction builders:
  - [x] `createMetadataAccountV3` - Create metadata for token
  - [x] `updateMetadataAccountV2` - Update metadata
  - [x] `createMasterEditionV3` - Create master edition
  - [ ] `mintNewEditionFromMasterEditionViaToken` - Print editions
  - [x] `verifyCollection` - Verify NFT in collection
  - [x] `unverifyCollection` - Remove collection verification
  - [x] `setAndVerifyCollection` - Set and verify in one tx
  - [x] `verifyCreator` - Verify creator signature
  - [ ] `verifySizedCollectionItem` - Verify sized collection
  - [x] `burnNft` - Burn NFT with metadata
  - [ ] `burnEditionNft` - Burn edition
- [x] Implement account deserializers:
  - [x] `Metadata` account parsing
  - [x] `MasterEdition` account parsing
  - [x] `Edition` account parsing
  - [ ] `CollectionAuthorityRecord` parsing
- [x] Implement PDA derivation functions:
  - [x] `findMetadataPda(mint)`
  - [x] `findMasterEditionPda(mint)`
  - [x] `findEditionPda(mint)`
  - [x] `findCollectionAuthorityPda(mint, authority)`

#### Candy Machine v3 Program (Replace `mpl-candy-machine`)

- [x] Create `src/programs/candy-machine/` directory
- [x] Program ID: `CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR`
- [x] Implement instruction builders:
  - [x] `initializeCandyMachine` - Create new CM
  - [x] `addConfigLines` - Add NFT config lines
  - [x] `updateCandyMachine` - Update CM settings
  - [x] `setCandyMachineAuthority` - Transfer authority
  - [x] `mintFromCandyMachine` - Mint NFT
  - [ ] `setMintAuthority` - Set mint authority
  - [x] `withdraw` - Withdraw funds
- [x] Implement Candy Guard program:
  - [x] Program ID: `Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g`
  - [ ] `initialize` - Create guard
  - [ ] `update` - Update guards
  - [ ] `wrap` / `unwrap` - Wrap/unwrap CM with guard
  - [ ] `mint` - Mint with guard validation
- [x] Implement all guard types as instruction builders:
  - [x] `solPayment`, `tokenPayment`, `nftPayment`
  - [x] `startDate`, `endDate`
  - [x] `mintLimit`, `redeemedAmount`
  - [x] `allowList` (Merkle proof validation)
  - [x] `nftGate`, `tokenGate`
  - [x] `addressGate`, `programGate`
  - [x] `freezeSolPayment`, `freezeTokenPayment`
  - [x] `allocation`, `token2022Payment`
- [x] Implement account deserializers:
  - [x] `CandyMachine` account parsing
  - [ ] `CandyGuard` account parsing

#### Core Asset Program (Replace `mpl-core`) - Optional Future

- [ ] Create `src/programs/core/` directory
- [ ] Program ID: `CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`
- [ ] Implement instruction builders for Core NFT standard
- [ ] Note: This is Metaplex's new standard, evaluate if we want to support or create our own

#### Bubblegum Program (Compressed NFTs)

- [ ] Create `src/programs/bubblegum/` directory
- [ ] Program ID: `BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY`
- [ ] Implement instruction builders:
  - [ ] `createTree` - Create Merkle tree
  - [ ] `mintV1` - Mint compressed NFT
  - [ ] `mintToCollectionV1` - Mint to collection
  - [ ] `transfer` - Transfer cNFT
  - [ ] `burn` - Burn cNFT
  - [ ] `delegate` - Delegate authority
  - [ ] `redeem` / `cancelRedeem` - Redemption flow
  - [ ] `decompressV1` - Decompress to regular NFT
- [ ] Implement concurrent Merkle tree utilities
- [ ] Implement proof fetching from DAS API

#### Account Compression Program

- [ ] Create `src/programs/account-compression/` directory
- [ ] Program ID: `cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK`
- [ ] Implement Merkle tree operations
- [ ] Implement proof verification

### 1.8 Base58 Implementation (Replace `bs58`)

- [x] Create `src/utils/base58.ts` with ~20 lines of code:

  ```ts
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  export function encode(buffer: Uint8Array): string { /* ... */ }
  export function decode(str: string): Uint8Array { /* ... */ }
  ```

- [ ] Add comprehensive tests for encoding/decoding
- [x] Ensure compatibility with Solana address format

---

## Phase 2: Core Library - Solana Integration

### 2.1 Connection Management

- [x] Create `src/drivers/solana/connection.ts`:
  - [x] `createConnection(config)` - Create RPC connection
  - [x] `getConnection()` - Get cached connection
  - [x] Connection pooling for multiple requests
  - [x] Automatic retry logic with exponential backoff
  - [ ] RPC rate limiting handling
  - [x] Health check functionality

### 2.2 Wallet Management

- [x] Create `src/drivers/solana/wallet.ts`:
  - [x] `loadKeypair(path)` - Load keypair from file
  - [x] `loadKeypairFromEnv(envVar)` - Load from environment variable
  - [x] `generateKeypair()` - Generate new keypair
  - [x] `getPublicKey()` - Get current wallet public key
  - [x] `signTransaction(tx)` - Sign transaction
  - [x] `signAllTransactions(txs)` - Batch sign
- [ ] Create `src/wallet/adapter.ts` for browser wallet adapters:
  - [ ] Phantom adapter support
  - [ ] Solflare adapter support
  - [ ] Generic wallet adapter interface

### 2.3 Transaction Utilities

- [x] Create `src/drivers/solana/transaction.ts`:
  - [x] `buildTransaction(instructions)` - Build transaction from instructions
  - [x] `sendTransaction(tx)` - Send and confirm transaction
  - [x] `sendTransactionWithRetry(tx, retries)` - Retry on failure
  - [x] `simulateTransaction(tx)` - Simulate without sending
  - [x] `getTransactionStatus(signature)` - Check transaction status
  - [x] `waitForConfirmation(signature)` - Wait for confirmation
  - [x] Priority fee estimation and setting
  - [x] Compute unit optimization

### 2.4 Account Utilities

- [x] Create `src/drivers/solana/account.ts`:
  - [x] `getAccountInfo(address)` - Fetch account info
  - [x] `getMultipleAccounts(addresses)` - Batch fetch
  - [x] `getTokenAccounts(owner)` - Get all token accounts for owner
  - [x] `getNFTAccounts(owner)` - Get all NFT accounts for owner
  - [x] `getBalance(address)` - Get SOL balance
  - [x] `getTokenBalance(owner, mint)` - Get token balance

---

## Phase 3: Fungible Token Support

### 3.1 Token Creation

- [x] Create `src/token/create.ts`:
  - [x] `createToken(options)` - Create new SPL token
    - [x] `name` - Token name
    - [x] `symbol` - Token symbol (max 10 chars)
    - [x] `decimals` - Decimal places (0-9)
    - [x] `initialSupply` - Initial mint amount (optional)
    - [x] `mintAuthority` - Mint authority pubkey
    - [x] `freezeAuthority` - Freeze authority pubkey (optional)
    - [x] `metadata` - Token metadata (name, symbol, uri)
  - [x] `createTokenWithMetadata(options)` - Create with Metaplex metadata
  - [x] Return token mint address and transaction signature

### 3.2 Token Minting

- [x] Create `src/token/mint.ts`:
  - [x] `mintTokens(options)` - Mint tokens to address
    - [x] `mint` - Token mint address
    - [x] `destination` - Recipient address
    - [x] `amount` - Amount to mint (in base units)
    - [x] `mintAuthority` - Authority signer
  - [x] `mintToMultiple(options)` - Batch mint to multiple addresses
  - [x] Validate mint authority before minting

### 3.3 Token Transfers

- [x] Create `src/token/transfer.ts`:
  - [x] `transferTokens(options)` - Transfer tokens
    - [x] `mint` - Token mint address
    - [x] `from` - Source token account or owner
    - [x] `to` - Destination address
    - [x] `amount` - Amount to transfer
  - [x] `transferToMultiple(options)` - Batch transfer (airdrop)
  - [x] Auto-create associated token accounts if needed

### 3.4 Token Burns

- [x] Create `src/token/burn.ts`:
  - [x] `burnTokens(options)` - Burn tokens
    - [x] `mint` - Token mint address
    - [x] `from` - Token account to burn from
    - [x] `amount` - Amount to burn
  - [x] `burnAll(mint, owner)` - Burn entire balance

### 3.5 Token Authority Management

- [x] Create `src/token/authority.ts`:
  - [x] `setMintAuthority(mint, newAuthority)` - Transfer mint authority
  - [x] `revokeMintAuthority(mint)` - Revoke mint authority (make fixed supply)
  - [x] `setFreezeAuthority(mint, newAuthority)` - Transfer freeze authority
  - [x] `revokeFreezeAuthority(mint)` - Revoke freeze authority
  - [x] `freezeAccount(mint, account)` - Freeze token account
  - [x] `thawAccount(mint, account)` - Unfreeze token account

### 3.6 Token Account Management

- [x] Create `src/token/account.ts`:
  - [x] `getOrCreateAssociatedTokenAccount(owner, mint)` - Get or create ATA
  - [x] `createTokenAccount(owner, mint)` - Create new token account
  - [x] `closeTokenAccount(account)` - Close empty token account (reclaim SOL)
  - [x] `getTokenAccountInfo(account)` - Get token account details

### 3.7 Token Metadata

- [ ] Create `src/token/metadata.ts`:
  - [ ] `createTokenMetadata(options)` - Create metadata for existing token
    - [ ] `mint` - Token mint address
    - [ ] `name` - Display name
    - [ ] `symbol` - Symbol
    - [ ] `uri` - Metadata JSON URI
    - [ ] `sellerFeeBasisPoints` - Royalty (0 for fungible)
    - [ ] `creators` - Creator array (optional)
  - [ ] `updateTokenMetadata(options)` - Update existing metadata
  - [ ] `getTokenMetadata(mint)` - Fetch metadata

### 3.8 Token Queries

- [ ] Create `src/token/query.ts`:
  - [ ] `getTokenInfo(mint)` - Get token mint info
  - [ ] `getTokenSupply(mint)` - Get current supply
  - [ ] `getTokenHolders(mint)` - Get all token holders (paginated)
  - [ ] `getTokenHistory(mint)` - Get transaction history
  - [ ] `getLargestAccounts(mint)` - Get largest token holders

---

## Phase 4: NFT Collection Management

### 4.1 Collection Creation

- [x] Create `src/nft/collection.ts`:
  - [x] `createCollection(options)` - Create NFT collection
    - [x] `name` - Collection name
    - [x] `symbol` - Collection symbol
    - [x] `uri` - Collection metadata URI
    - [x] `sellerFeeBasisPoints` - Royalty percentage (basis points)
    - [x] `creators` - Creator shares array
    - [x] `isMutable` - Whether metadata can be updated
  - [ ] `updateCollection(options)` - Update collection metadata
  - [ ] `verifyCollection(collection, nft)` - Verify NFT belongs to collection
  - [ ] `unverifyCollection(collection, nft)` - Remove collection verification

### 4.2 NFT Minting

- [x] Create `src/nft/mint.ts`:
  - [x] `mintNFT(options)` - Mint single NFT
    - [x] `name` - NFT name
    - [x] `symbol` - NFT symbol
    - [x] `uri` - Metadata URI
    - [x] `sellerFeeBasisPoints` - Royalty
    - [x] `creators` - Creator array with shares
    - [x] `collection` - Collection address (optional)
    - [x] `isMutable` - Metadata mutability
    - [ ] `primarySaleHappened` - Primary sale flag
  - [ ] `mintNFTToCollection(options)` - Mint directly to collection
  - [ ] `mintCompressedNFT(options)` - Mint compressed NFT (cNFT)
  - [x] Return mint address and transaction signature

### 4.3 NFT Transfers

- [x] Create `src/nft/transfer.ts`:
  - [x] `transferNFT(options)` - Transfer NFT
    - [x] `mint` - NFT mint address
    - [x] `from` - Current owner
    - [x] `to` - New owner
  - [ ] `transferCompressedNFT(options)` - Transfer cNFT
  - [x] Automatic ATA creation for recipient

### 4.4 NFT Burns

- [x] Create `src/nft/burn.ts`:
  - [x] `burnNFT(mint, owner)` - Burn NFT
  - [ ] `burnCompressedNFT(options)` - Burn cNFT
  - [x] Reclaim rent from closed accounts

### 4.5 NFT Metadata Management

- [x] Create `src/nft/metadata.ts`:
  - [x] `updateNFTMetadata(options)` - Update NFT metadata
    - [x] `mint` - NFT mint address
    - [x] `name` - New name (optional)
    - [x] `symbol` - New symbol (optional)
    - [x] `uri` - New metadata URI (optional)
    - [x] `sellerFeeBasisPoints` - New royalty (optional)
    - [x] `creators` - New creators (optional)
  - [x] `getNFTMetadata(mint)` - Fetch on-chain metadata
  - [x] `fetchOffChainMetadata(uri)` - Fetch JSON metadata from URI
  - [x] `verifyCreator(mint, creator)` - Verify creator signature
  - [x] `unverifyCreator(mint, creator)` - Remove creator verification

### 4.6 Candy Machine (NFT Drops)

- [x] Create `src/nft/candy-machine/` directory
- [x] Create `src/nft/candy-machine/create.ts`:
  - [x] `createCandyMachine(options)` - Create new Candy Machine
    - [x] `itemsAvailable` - Total NFTs in collection
    - [x] `sellerFeeBasisPoints` - Royalty
    - [x] `symbol` - Collection symbol
    - [x] `maxEditionSupply` - Max editions (0 for unique)
    - [x] `isMutable` - Metadata mutability
    - [x] `creators` - Creator array
    - [x] `collection` - Collection NFT address
    - [x] `configLineSettings` - Config line settings
    - [x] `hiddenSettings` - Hidden settings (for reveals)
- [ ] Create `src/nft/candy-machine/config.ts`:
  - [ ] `updateCandyMachine(options)` - Update CM settings
  - [ ] `setCandyMachineAuthority(cm, newAuthority)` - Transfer authority
  - [ ] `deleteCandyMachine(cm)` - Delete and reclaim rent

### 4.7 Candy Machine Guards

- [ ] Create `src/nft/candy-machine/guards.ts`:
  - [ ] `addGuards(candyMachine, guards)` - Add mint guards
  - [ ] Supported guards:
    - [ ] `solPayment` - SOL payment guard
    - [ ] `tokenPayment` - SPL token payment guard
    - [ ] `nftPayment` - NFT burn payment guard
    - [ ] `startDate` - Mint start date
    - [ ] `endDate` - Mint end date
    - [ ] `mintLimit` - Per-wallet mint limit
    - [ ] `allowList` - Merkle tree allowlist
    - [ ] `nftGate` - NFT holder gate
    - [ ] `tokenGate` - Token holder gate
    - [ ] `redeemedAmount` - Max total mints
    - [ ] `addressGate` - Specific address gate
    - [ ] `freezeSolPayment` - Freeze SOL until thaw
    - [ ] `freezeTokenPayment` - Freeze tokens until thaw
    - [ ] `programGate` - Require specific program in tx
    - [ ] `allocation` - Allocation tracking
    - [ ] `token2022Payment` - Token-2022 payment
  - [ ] `updateGuards(candyMachine, guards)` - Update guards
  - [ ] `removeGuards(candyMachine)` - Remove all guards

### 4.8 Candy Machine Items

- [x] Create `src/nft/candy-machine/items.ts`:
  - [x] `addConfigLines(candyMachine, items)` - Add NFT config lines
    - [x] `name` - NFT name (with index placeholder)
    - [x] `uri` - Metadata URI (with index placeholder)
  - [ ] `addConfigLinesFromFile(candyMachine, filePath)` - Bulk add from JSON
  - [ ] `getLoadedItems(candyMachine)` - Get loaded item count
  - [ ] `getMintedItems(candyMachine)` - Get minted item count

### 4.9 Candy Machine Minting

- [x] Create `src/nft/candy-machine/mint.ts`:
  - [x] `mintFromCandyMachine(candyMachine, options)` - Mint NFT from CM
  - [ ] `mintWithGuard(candyMachine, guard, options)` - Mint with specific guard
  - [ ] `mintMultiple(candyMachine, count, options)` - Batch mint

### 4.10 NFT Queries

- [x] Create `src/nft/query.ts`:
  - [x] `getNFTsByOwner(owner)` - Get all NFTs owned by address
  - [x] `getNFTsByCollection(collection)` - Get all NFTs in collection
  - [x] `getNFTsByCreator(creator)` - Get all NFTs by creator
  - [x] `getCollectionInfo(collection)` - Get collection details
  - [ ] `getCandyMachineInfo(candyMachine)` - Get CM details
  - [ ] `getCandyMachineItems(candyMachine)` - Get all CM items

### 4.11 Compressed NFTs (cNFTs)

- [x] Create `src/nft/compressed/` directory
- [x] Create `src/nft/compressed/tree.ts`:
  - [x] `createMerkleTree(options)` - Create Merkle tree for cNFTs
    - [x] `maxDepth` - Tree depth (determines capacity)
    - [x] `maxBufferSize` - Concurrent update buffer
    - [x] `canopyDepth` - Proof caching depth
  - [x] `getMerkleTreeInfo(tree)` - Get tree info
  - [x] `getTreeCapacity(tree)` - Get remaining capacity
- [x] Create `src/nft/compressed/mint.ts`:
  - [x] `mintCompressedNFT(tree, options)` - Mint cNFT to tree
  - [x] `mintCompressedNFTBatch(tree, items)` - Batch mint cNFTs
- [x] Create `src/nft/compressed/transfer.ts`:
  - [x] `transferCompressedNFT(options)` - Transfer cNFT
  - [x] `getAssetProof(assetId)` - Get proof for transfer
- [ ] Create `src/nft/compressed/query.ts`:
  - [ ] `getCompressedNFTsByOwner(owner)` - Get cNFTs by owner (requires DAS API)
  - [ ] `getCompressedNFTsByTree(tree)` - Get cNFTs in tree (requires DAS API)
  - [x] `getCompressedNFTMetadata(assetId)` - Get cNFT metadata (via getAsset)

### 4.12 Editions (Prints)

- [x] Create `src/nft/editions.ts`:
  - [x] `createMasterEdition(mint, maxSupply)` - Create master edition
  - [x] `printEdition(masterMint, options)` - Print edition from master
  - [x] `getEditionInfo(mint)` - Get edition info
  - [x] `getEditionsByMaster(masterMint)` - Get all editions

---

## Phase 5: CLI Implementation

### 5.1 CLI Structure

- [x] Restructure `bin/cli.ts` with proper command organization
- [ ] Create `src/cli/` directory for CLI-specific code
- [ ] Create `src/cli/commands/` for command implementations
- [ ] Create `src/cli/utils/` for CLI utilities
- [ ] Add colorful output with `chalk`
- [ ] Add spinners with `ora` for async operations
- [ ] Add interactive prompts with `inquirer`

### 5.2 Configuration Commands

- [x] `tokens config init` - Initialize config file interactively
- [x] `tokens config show` - Display current configuration
- [ ] `tokens config set <key> <value>` - Set config value
- [ ] `tokens config get <key>` - Get config value
- [x] `tokens config network <network>` - Switch network (devnet/mainnet/etc)

### 5.3 Wallet Commands

- [x] `tokens wallet generate` - Generate new keypair
- [ ] `tokens wallet import <path>` - Import keypair from file
- [x] `tokens wallet show` - Show current wallet address
- [x] `tokens wallet balance` - Show SOL balance
- [x] `tokens wallet airdrop [amount]` - Request devnet airdrop

### 5.4 Fungible Token Commands

- [x] `tokens create` - Create new fungible token (interactive)
  - [x] `--name <name>` - Token name
  - [x] `--symbol <symbol>` - Token symbol
  - [x] `--decimals <n>` - Decimal places
  - [x] `--supply <amount>` - Initial supply
  - [ ] `--metadata-uri <uri>` - Metadata URI
- [x] `tokens mint <mint> <amount>` - Mint tokens
  - [x] `--to <address>` - Recipient (default: self)
- [x] `tokens transfer <mint> <amount> <to>` - Transfer tokens
- [x] `tokens burn <mint> <amount>` - Burn tokens
- [x] `tokens info <mint>` - Show token info
- [x] `tokens balance <mint>` - Show token balance
- [ ] `tokens holders <mint>` - List token holders
- [ ] `tokens authority <mint>` - Manage authorities
  - [ ] `--revoke-mint` - Revoke mint authority
  - [ ] `--revoke-freeze` - Revoke freeze authority
  - [ ] `--transfer-mint <address>` - Transfer mint authority
  - [ ] `--transfer-freeze <address>` - Transfer freeze authority

### 5.5 NFT Commands

- [x] `tokens nft create` - Create single NFT (interactive)
  - [x] `--name <name>` - NFT name
  - [ ] `--symbol <symbol>` - Symbol
  - [x] `--uri <uri>` - Metadata URI
  - [x] `--royalty <bps>` - Royalty in basis points
  - [x] `--collection <address>` - Collection address
- [ ] `tokens nft mint <uri>` - Mint NFT from metadata URI
- [x] `tokens nft transfer <mint> <to>` - Transfer NFT
- [x] `tokens nft burn <mint>` - Burn NFT
- [x] `tokens nft info <mint>` - Show NFT info
- [x] `tokens nft list [owner]` - List NFTs owned

### 5.6 Collection Commands

- [x] `tokens collection create` - Create collection (interactive)
  - [x] `--name <name>` - Collection name
  - [x] `--symbol <symbol>` - Symbol
  - [x] `--uri <uri>` - Metadata URI
  - [ ] `--royalty <bps>` - Royalty in basis points
- [ ] `tokens collection info <address>` - Show collection info
- [ ] `tokens collection items <address>` - List collection items
- [ ] `tokens collection verify <collection> <nft>` - Verify NFT in collection
- [ ] `tokens collection update <address>` - Update collection metadata

### 5.7 Candy Machine Commands

- [ ] `tokens candy create` - Create Candy Machine (interactive)
  - [ ] `--items <n>` - Number of items
  - [ ] `--symbol <symbol>` - Symbol
  - [ ] `--royalty <bps>` - Royalty
  - [ ] `--collection <address>` - Collection address
  - [ ] `--config <path>` - Config file path
- [ ] `tokens candy upload <path>` - Upload assets and create config lines
  - [ ] `--storage <provider>` - Storage provider (arweave/ipfs/shadow)
- [ ] `tokens candy add <candy-machine> <items-file>` - Add config lines
- [ ] `tokens candy guards <candy-machine>` - Manage guards (interactive)
- [ ] `tokens candy mint <candy-machine>` - Mint from Candy Machine
  - [ ] `--count <n>` - Number to mint
- [ ] `tokens candy info <candy-machine>` - Show CM info
- [ ] `tokens candy withdraw <candy-machine>` - Withdraw funds
- [ ] `tokens candy delete <candy-machine>` - Delete CM

### 5.8 Storage Commands

- [ ] `tokens upload <path>` - Upload file to storage
  - [ ] `--provider <provider>` - Storage provider
  - [ ] `--type <type>` - Content type (image/json/etc)
- [ ] `tokens upload-assets <directory>` - Bulk upload assets
  - [ ] `--provider <provider>` - Storage provider
  - [ ] `--output <path>` - Output manifest path
- [ ] `tokens upload-metadata <path>` - Upload metadata JSON
- [ ] `tokens storage balance` - Check storage balance (Arweave/Shadow)
- [ ] `tokens storage fund <amount>` - Fund storage account

### 5.9 Utility Commands

- [ ] `tokens airdrop <mint> <recipients-file>` - Airdrop tokens/NFTs
  - [ ] `--amount <amount>` - Amount per recipient (fungible)
  - [ ] `--delay <ms>` - Delay between transactions
- [ ] `tokens snapshot <mint>` - Snapshot token holders
  - [ ] `--output <path>` - Output file path
  - [ ] `--min-balance <amount>` - Minimum balance filter
- [ ] `tokens verify <signature>` - Verify transaction
- [ ] `tokens decode <data>` - Decode transaction/account data

---

## Phase 6: React Components

### 6.1 Setup

- [x] Set up `packages/react/` with proper React + TypeScript config
- [x] Add peer dependencies: `react`, `react-dom`, `@solana/wallet-adapter-react`
- [x] Create component library build configuration
- [ ] Set up Storybook for component development

### 6.2 Wallet Components

- [x] `<TokensProvider>` - Tokens context provider
- [ ] `<WalletConnectButton>` - Connect wallet button
- [ ] `<WalletDisconnectButton>` - Disconnect button
- [ ] `<WalletMultiButton>` - Multi-wallet selector
- [x] `<WalletAddress>` - Display wallet address (truncated)
- [x] `<WalletBalance>` - Display SOL balance

### 6.3 Token Components

- [x] `<TokenBalance mint={} />` - Display token balance
- [x] `<TokenInfo mint={} />` - Display token info card
- [x] `<TokenList owner={} />` - List all tokens owned
- [ ] `<TokenTransferForm mint={} />` - Token transfer form
- [ ] `<TokenMintForm mint={} />` - Token mint form (for authorities)

### 6.4 NFT Components

- [x] `<NFTCard mint={} />` - NFT display card with image
- [x] `<NFTGrid owner={} />` - Grid of owned NFTs
- [ ] `<NFTGallery collection={} />` - Collection gallery
- [x] `<NFTDetails mint={} />` - Full NFT details view
- [ ] `<NFTTransferButton mint={} />` - Transfer NFT button
- [ ] `<NFTBurnButton mint={} />` - Burn NFT button

### 6.5 Candy Machine Components

- [ ] `<CandyMachineProvider>` - CM context provider
- [x] `<MintButton candyMachine={} />` - Mint button
- [x] `<MintCounter candyMachine={} />` - Minted/Total counter
- [x] `<MintProgress candyMachine={} />` - Progress bar
- [ ] `<MintPrice candyMachine={} />` - Display mint price
- [ ] `<CountdownTimer date={} />` - Countdown to mint start
- [ ] `<AllowlistChecker candyMachine={} />` - Check allowlist status

### 6.6 Utility Components

- [x] `<TransactionToast />` - Transaction notification toast
- [x] `<ExplorerLink signature={} />` - Link to block explorer
- [x] `<AddressDisplay address={} />` - Formatted address display
- [x] `<SolAmount amount={} />` - Formatted SOL amount
- [ ] `<TokenAmount mint={} amount={} />` - Formatted token amount

### 6.7 Hooks

- [ ] `useWallet()` - Wallet state and methods
- [x] `useConnection()` - Solana connection
- [x] `useTokenBalance(mint)` - Token balance hook
- [x] `useNFT(mint)` - NFT data hook
- [x] `useNFTs(owner)` - All NFTs hook
- [x] `useCandyMachine(address)` - CM state hook
- [x] `useTransaction()` - Transaction sending hook
- [x] `useTokenAccounts(owner)` - Token accounts hook

---

## Phase 7: Vue Components

### 7.1 Setup

- [x] Set up `packages/vue/` with proper Vue 3 + TypeScript config
- [x] Create composables for Solana integration
- [x] Create component library build configuration

### 7.2 Wallet Components

- [x] `<TokensPlugin>` - Tokens plugin for Vue app
- [ ] `<WalletConnectButton>` - Connect wallet button
- [ ] `<WalletDisconnectButton>` - Disconnect button
- [ ] `<WalletMultiButton>` - Multi-wallet selector
- [x] `<WalletAddress>` - Display wallet address
- [x] `<WalletBalance>` - Display SOL balance

### 7.3 Token Components

- [x] `<TokenBalance :mint="" />` - Display token balance
- [x] `<TokenInfo :mint="" />` - Display token info card
- [x] `<TokenList :owner="" />` - List all tokens owned
- [ ] `<TokenTransferForm :mint="" />` - Token transfer form
- [ ] `<TokenMintForm :mint="" />` - Token mint form

### 7.4 NFT Components

- [x] `<NFTCard :mint="" />` - NFT display card
- [x] `<NFTGrid :owner="" />` - Grid of owned NFTs
- [ ] `<NFTGallery :collection="" />` - Collection gallery
- [x] `<NFTDetails :mint="" />` - Full NFT details
- [ ] `<NFTTransferButton :mint="" />` - Transfer button
- [ ] `<NFTBurnButton :mint="" />` - Burn button

### 7.5 Candy Machine Components

- [ ] `<CandyMachineProvider>` - CM context provider
- [x] `<MintButton :candy-machine="" />` - Mint button
- [x] `<MintCounter :candy-machine="" />` - Counter
- [x] `<MintProgress :candy-machine="" />` - Progress bar
- [ ] `<MintPrice :candy-machine="" />` - Price display
- [ ] `<CountdownTimer :date="" />` - Countdown
- [ ] `<AllowlistChecker :candy-machine="" />` - Allowlist check

### 7.6 Composables

- [ ] `useWallet()` - Wallet state and methods
- [x] `useConnection()` - Solana connection
- [x] `useTokenBalance(mint)` - Token balance
- [x] `useNFT(mint)` - NFT data
- [x] `useNFTs(owner)` - All NFTs
- [x] `useCandyMachine(address)` - CM state
- [x] `useTransaction()` - Transaction sending
- [x] `useTokenAccounts(owner)` - Token accounts

---

## Phase 8: Documentation & Examples

### 8.1 Documentation Site Updates

- [ ] Update `docs/index.md` with new project focus
- [ ] Update `docs/intro.md` with blockchain token introduction
- [ ] Update `docs/install.md` with new installation instructions
- [ ] Update `docs/config.md` with new configuration options
- [ ] Update `docs/usage.md` with new usage examples

### 8.2 API Documentation

- [x] Create `docs/api/tokens/` directory for fungible token docs
  - [x] `docs/api/tokens/create.md` - Token creation
  - [x] `docs/api/tokens/mint.md` - Minting tokens
  - [x] `docs/api/tokens/transfer.md` - Transferring tokens
  - [x] `docs/api/tokens/burn.md` - Burning tokens
  - [ ] `docs/api/tokens/authority.md` - Authority management
  - [ ] `docs/api/tokens/metadata.md` - Token metadata
- [x] Create `docs/api/nft/` directory for NFT docs
  - [x] `docs/api/nft/create.md` - NFT creation
  - [x] `docs/api/nft/collection.md` - Collections
  - [ ] `docs/api/nft/transfer.md` - Transfers
  - [ ] `docs/api/nft/metadata.md` - Metadata
  - [ ] `docs/api/nft/compressed.md` - Compressed NFTs
- [ ] Create `docs/api/candy-machine/` directory
  - [ ] `docs/api/candy-machine/create.md` - Creating CM
  - [ ] `docs/api/candy-machine/guards.md` - Guard configuration
  - [ ] `docs/api/candy-machine/mint.md` - Minting from CM
  - [ ] `docs/api/candy-machine/manage.md` - Management

### 8.3 CLI Documentation

- [x] Create `docs/cli/` directory
  - [x] `docs/cli/index.md` - CLI overview
  - [x] `docs/cli/config.md` - Configuration commands
  - [x] `docs/cli/wallet.md` - Wallet commands
  - [x] `docs/cli/tokens.md` - Token commands
  - [x] `docs/cli/nft.md` - NFT commands
  - [x] `docs/cli/candy-machine.md` - CM commands
  - [ ] `docs/cli/storage.md` - Storage commands

### 8.4 Component Documentation

- [x] Create `docs/components/` directory
  - [x] `docs/components/react/` - React component docs
  - [x] `docs/components/vue/` - Vue component docs
  - [ ] Include live examples with CodeSandbox/StackBlitz

### 8.5 Guides & Tutorials

- [x] Create `docs/guides/` directory
  - [x] `docs/guides/getting-started.md` - Quick start guide
  - [ ] `docs/guides/create-fungible-token.md` - Create your first token
  - [ ] `docs/guides/create-nft-collection.md` - Create NFT collection
  - [ ] `docs/guides/candy-machine-drop.md` - Set up NFT drop
  - [ ] `docs/guides/allowlist-setup.md` - Configure allowlists
  - [ ] `docs/guides/royalties.md` - Understanding royalties
  - [ ] `docs/guides/metadata-standards.md` - Metadata best practices
  - [ ] `docs/guides/storage-options.md` - Choosing storage provider
  - [ ] `docs/guides/testing-devnet.md` - Testing on devnet

### 8.6 Example Projects

- [x] Create `examples/` directory in repo root
- [x] `examples/create-token/` - Simple token creation example
- [x] `examples/nft-collection/` - NFT collection example
- [ ] `examples/nft-minting-site/` - React NFT minting site
- [ ] `examples/candy-machine-ui/` - Full CM frontend
- [ ] `examples/token-airdrop/` - Airdrop script example
- [ ] `examples/vue-nft-gallery/` - Vue NFT gallery
- [ ] `examples/cli-scripts/` - CLI automation scripts

---

## Phase 9: Testing & Quality Assurance

### 9.1 Unit Tests

- [x] Create `test/` directory structure mirroring `src/`
- [x] Test configuration loading and validation
- [ ] Test driver interface implementations
- [x] Test token creation functions
- [ ] Test token minting functions
- [ ] Test token transfer functions
- [ ] Test NFT creation functions
- [ ] Test collection management functions
- [ ] Test Candy Machine functions
- [ ] Test utility functions

### 9.2 Integration Tests

- [ ] Set up devnet testing environment
- [ ] Create test wallet with devnet SOL
- [ ] Test full token lifecycle (create → mint → transfer → burn)
- [ ] Test full NFT lifecycle (create → transfer → burn)
- [ ] Test collection creation and verification
- [ ] Test Candy Machine creation and minting
- [ ] Test compressed NFT operations

### 9.3 CLI Tests

- [ ] Test all CLI commands with mock data
- [ ] Test interactive prompts
- [ ] Test error handling and messages
- [ ] Test output formatting

### 9.4 Component Tests

- [ ] Set up React Testing Library
- [ ] Set up Vue Test Utils
- [ ] Test wallet connection components
- [ ] Test token display components
- [ ] Test NFT display components
- [ ] Test form components
- [ ] Test hooks/composables

### 9.5 E2E Tests

- [ ] Set up Playwright or Cypress
- [ ] Test React example app
- [ ] Test Vue example app
- [ ] Test wallet connection flow
- [ ] Test minting flow

### 9.6 Code Quality

- [ ] Configure ESLint rules for Solana best practices
- [ ] Add TypeScript strict mode
- [ ] Set up Prettier formatting
- [ ] Add pre-commit hooks for linting
- [ ] Add CI/CD pipeline for tests
- [ ] Add code coverage reporting

---

## Phase 10: Release & Distribution

### 10.1 Package Preparation

- [ ] Finalize `packages/ts-tokens/package.json`:
  - [ ] Update version to `0.1.0`
  - [ ] Update description
  - [ ] Update keywords for discoverability
  - [ ] Add proper `peerDependencies`
  - [ ] Configure `exports` for subpath imports
- [ ] Finalize `packages/react/package.json`
- [ ] Finalize `packages/vue/package.json`
- [ ] Create `packages/cli/package.json` (if separate package)

### 10.2 Build Configuration

- [ ] Configure TypeScript build for all packages
- [ ] Generate `.d.ts` type definitions
- [ ] Configure tree-shaking friendly builds
- [ ] Set up source maps
- [ ] Configure minification for production

### 10.3 Binary Distribution

- [ ] Build CLI binaries for all platforms:
  - [ ] `tokens-linux-x64`
  - [ ] `tokens-linux-arm64`
  - [ ] `tokens-darwin-x64`
  - [ ] `tokens-darwin-arm64`
  - [ ] `tokens-windows-x64.exe`
- [ ] Test binaries on each platform
- [ ] Set up GitHub releases with binaries

### 10.4 NPM Publishing

- [ ] Publish `ts-tokens` to npm
- [ ] Publish `@ts-tokens/react` to npm
- [ ] Publish `@ts-tokens/vue` to npm
- [ ] Set up npm provenance
- [ ] Configure npm access and 2FA

### 10.5 Documentation Deployment

- [ ] Deploy documentation site
- [ ] Set up custom domain (if applicable)
- [ ] Configure search (Algolia DocSearch)
- [ ] Add version selector for docs

### 10.6 Marketing & Community

- [ ] Write announcement blog post
- [ ] Create demo video
- [ ] Post to Twitter/X
- [ ] Post to relevant Discord servers
- [ ] Submit to Solana ecosystem directories
- [ ] Create GitHub discussions for community

---

## Phase 11: Security & Best Practices

### 11.1 Security Auditing

- [ ] Implement transaction simulation before execution (always preview)
- [ ] Add balance checks before operations (prevent failed txs)
- [ ] Implement authority validation before sensitive operations
- [ ] Add warning prompts for irreversible actions (revoke authority, burn)
- [ ] Create security checklist for token launches

### 11.2 Key Management

- [ ] Support hardware wallet signing (Ledger via HID)
- [ ] Implement encrypted keypair storage (local keyring)
- [ ] Add environment variable keypair loading (`TOKENS_KEYPAIR`)
- [ ] Support keypair from stdin (for CI/CD pipelines)
- [ ] Implement session-based signing (sign once, execute many)

### 11.3 Rate Limiting & RPC Management

- [ ] Implement RPC request queuing and rate limiting
- [ ] Add automatic RPC failover (multiple endpoints)
- [ ] Support custom RPC providers (Helius, QuickNode, Triton, etc.)
- [ ] Implement request caching for read operations
- [ ] Add RPC health monitoring and auto-switching

### 11.4 Error Handling & Recovery

- [ ] Create comprehensive error types with actionable messages
- [ ] Implement transaction retry with exponential backoff
- [ ] Add transaction recovery for partially failed batches
- [ ] Create error code documentation
- [ ] Implement dry-run mode for all destructive operations

### 11.5 Security Checklists

> **Goal**: Comprehensive security checklists for every operation type to ensure users never make costly mistakes.

#### Pre-Launch Token Security Checklist

- [ ] Create `tokens security check <mint>` CLI command
- [ ] Implement automated security audit:

  ```ts
  const audit = await tokens.security.audit(tokenMint)
  // Returns detailed security report with warnings/recommendations
  ```

##### Token Configuration Checks

- [ ] **Mint Authority**
  - [ ] Verify mint authority is set correctly (not compromised wallet)
  - [ ] Warn if mint authority is a hot wallet (recommend multi-sig)
  - [ ] Check if mint authority should be revoked for fixed supply
  - [ ] Verify mint authority is not a known scam address
- [ ] **Freeze Authority**
  - [ ] Warn if freeze authority exists (can freeze user tokens)
  - [ ] Recommend revoking freeze authority for trustless tokens
  - [ ] Verify freeze authority holder if intentionally kept
- [ ] **Supply Verification**
  - [ ] Verify initial supply matches intended amount
  - [ ] Check for any unexpected mints after creation
  - [ ] Verify decimal places are correct (common mistake: wrong decimals)
- [ ] **Metadata Verification**
  - [ ] Verify metadata URI is accessible and valid JSON
  - [ ] Check metadata matches on-chain data (name, symbol)
  - [ ] Verify image URL is accessible
  - [ ] Check for metadata mutability (warn if mutable)
  - [ ] Verify update authority is secure

##### Smart Contract Security (Token-2022)

- [ ] **Transfer Fee Checks**
  - [ ] Verify fee percentage is as intended
  - [ ] Check fee recipient address is correct
  - [ ] Warn about high fees (>5%)
- [ ] **Transfer Hook Checks**
  - [ ] Verify hook program is audited/trusted
  - [ ] Check hook program source is available
  - [ ] Warn about unknown hook programs
- [ ] **Permanent Delegate Checks**
  - [ ] Warn if permanent delegate is set (can transfer any time)
  - [ ] Verify delegate address is intended

#### Pre-Launch NFT Collection Security Checklist

##### Collection Configuration

- [ ] **Collection Authority**
  - [ ] Verify collection authority is secure (multi-sig recommended)
  - [ ] Check if authority should be transferred to DAO
- [ ] **Royalty Configuration**
  - [ ] Verify royalty percentage is correct
  - [ ] Verify all creator addresses are correct
  - [ ] Check creator shares sum to 100%
  - [ ] Verify creators have signed/verified
- [ ] **Metadata Mutability**
  - [ ] Warn if collection is mutable (can be rugged)
  - [ ] Recommend making immutable after launch
- [ ] **Update Authority**
  - [ ] Verify update authority is secure
  - [ ] Recommend multi-sig for update authority

##### Candy Machine Security

- [ ] **Price Configuration**
  - [ ] Verify mint price is correct
  - [ ] Check payment destination address
- [ ] **Guard Configuration**
  - [ ] Verify start/end dates are correct
  - [ ] Check allowlist merkle root is correct
  - [ ] Verify mint limits are set appropriately
- [ ] **Bot Protection**
  - [ ] Recommend enabling bot tax
  - [ ] Check for rate limiting guards
  - [ ] Verify captcha/gatekeeper if needed

#### Transaction Security Checklist

- [ ] Create pre-transaction security checks:

  ```ts
  const check = await tokens.security.checkTransaction(transaction)
  // {
  //   safe: false,
  //   warnings: ['Sending to known scam address', 'Unusually high amount'],
  //   recommendations: ['Verify recipient address', 'Consider smaller test tx'],
  // }
  ```

##### Pre-Transaction Checks

- [ ] **Address Validation**
  - [ ] Verify recipient is valid Solana address
  - [ ] Check against known scam address database
  - [ ] Warn if sending to exchange deposit address without memo
  - [ ] Warn if address has never been used (potential typo)
- [ ] **Amount Validation**
  - [ ] Warn if amount is unusually large
  - [ ] Check sufficient balance (including fees)
  - [ ] Verify decimal handling is correct
- [ ] **Authority Checks**
  - [ ] Verify signer has required authority
  - [ ] Check for authority expiration (delegated)
- [ ] **Simulation**
  - [ ] Always simulate transaction before sending
  - [ ] Parse simulation for errors/warnings
  - [ ] Show expected account changes

#### Wallet Security Checklist

- [ ] Create `tokens security wallet` CLI command
- [ ] Implement wallet security audit:

  ```ts
  const walletAudit = await tokens.security.auditWallet(wallet)
  ```

##### Wallet Checks

- [ ] **Key Security**
  - [ ] Warn if using file-based keypair (recommend hardware wallet)
  - [ ] Check keypair file permissions (should be 600)
  - [ ] Verify keypair is not in version control
  - [ ] Check for keypair in environment variables (warn about logging)
- [ ] **Balance Checks**
  - [ ] Warn if wallet has large SOL balance (recommend cold storage)
  - [ ] Check for dust attacks (tiny token amounts from unknown sources)
  - [ ] Identify suspicious token accounts
- [ ] **Authority Exposure**
  - [ ] List all tokens where wallet is mint authority
  - [ ] List all tokens where wallet is freeze authority
  - [ ] List all NFT collections where wallet is update authority
  - [ ] Recommend multi-sig for high-value authorities

#### Authority Transfer Security Checklist

- [ ] Create confirmation flow for authority transfers:

  ```ts
  await tokens.security.confirmAuthorityTransfer({
    type: 'mint',
    from: currentAuthority,
    to: newAuthority,
    // Requires explicit confirmation with warnings
  })
  ```

##### Authority Transfer Checks

- [ ] **Irreversibility Warning**
  - [ ] Clearly warn that authority transfers are irreversible
  - [ ] Require explicit confirmation (type address to confirm)
- [ ] **Destination Validation**
  - [ ] Verify new authority address is correct
  - [ ] Check if new authority is multi-sig (recommended)
  - [ ] Warn if transferring to single hot wallet
- [ ] **Revocation Checks**
  - [ ] Double-confirm authority revocation (setting to null)
  - [ ] Explain implications (no more minting, etc.)
  - [ ] Require typing "REVOKE" to confirm

#### Burn Security Checklist

- [ ] Create confirmation flow for burns:

  ```ts
  await tokens.security.confirmBurn({
    mint: tokenMint,
    amount: burnAmount,
    // Requires explicit confirmation
  })
  ```

##### Burn Checks

- [ ] **Irreversibility Warning**
  - [ ] Clearly warn that burns are irreversible
  - [ ] Show USD value if available
- [ ] **Amount Validation**
  - [ ] Confirm amount with decimal display
  - [ ] Warn if burning large percentage of holdings
  - [ ] Warn if burning entire balance
- [ ] **NFT Burns**
  - [ ] Show NFT image and name before burn
  - [ ] Require typing NFT name to confirm
  - [ ] Check if NFT is part of valuable collection

#### DAO/Governance Security Checklist

- [ ] Create `governance security check <dao>` CLI command

##### DAO Configuration Checks

- [ ] **Voting Parameters**
  - [ ] Warn if quorum is too low (<5%)
  - [ ] Warn if approval threshold is too low (<50%)
  - [ ] Check voting period is reasonable (not too short)
  - [ ] Verify execution delay provides time to react
- [ ] **Treasury Security**
  - [ ] Verify treasury is controlled by governance
  - [ ] Check for backdoor admin access
  - [ ] Verify proposal threshold prevents spam
- [ ] **Authority Distribution**
  - [ ] Check token distribution (warn if concentrated)
  - [ ] Verify no single entity controls majority
  - [ ] Check for delegation concentration

#### Staking Security Checklist

- [ ] Create `tokens staking security <pool>` CLI command

##### Staking Pool Checks

- [ ] **Pool Configuration**
  - [ ] Verify reward rate is sustainable
  - [ ] Check reward token balance covers obligations
  - [ ] Verify lock periods are as advertised
  - [ ] Check early unstake penalties are reasonable
- [ ] **Authority Checks**
  - [ ] Verify pool authority is secure
  - [ ] Check for emergency withdrawal mechanisms
  - [ ] Verify pause functionality exists
- [ ] **Smart Contract Checks**
  - [ ] Verify staking program is audited
  - [ ] Check for known vulnerabilities
  - [ ] Verify upgrade authority (if upgradeable)

#### Security Report Generation

- [ ] Create comprehensive security report:

  ```ts
  const report = await tokens.security.generateReport({
    tokens: [token1, token2],
    collections: [collection1],
    daos: [dao1],
    stakingPools: [pool1],
    wallet: myWallet,
  })
  // Generates PDF/HTML report with all findings
  ```

- [ ] Report includes:
  - [ ] Executive summary with risk score
  - [ ] Detailed findings by category
  - [ ] Recommendations with priority levels
  - [ ] Action items checklist
  - [ ] Historical comparison (if previous report exists)

#### CLI Security Commands

- [ ] `tokens security audit <mint>` - Full token security audit
- [ ] `tokens security collection <collection>` - Collection audit
- [ ] `tokens security wallet` - Wallet security check
- [ ] `tokens security tx <signature>` - Analyze transaction
- [ ] `tokens security address <address>` - Check address reputation
- [ ] `tokens security report` - Generate full security report
- [ ] `tokens security watch <mint>` - Monitor for security events

#### Security Notifications

- [ ] Implement security event monitoring:

  ```ts
  tokens.security.watch(tokenMint, {
    onAuthorityChange: (event) => notify(event),
    onLargeMint: (event) => notify(event),
    onSuspiciousActivity: (event) => notify(event),
  })
  ```

- [ ] Webhook support for security alerts
- [ ] Email notifications for critical events
- [ ] Discord/Telegram bot integration

#### Phishing & Social Engineering Protection

- [ ] **Approval Phishing Detection**
  - [ ] Warn when approving unlimited token spending
  - [ ] Detect suspicious approval patterns
  - [ ] Show approval history and recommend revocations
  - [ ] `tokens security approvals` - List all active approvals
- [ ] **Fake Token Detection**
  - [ ] Check if token name/symbol mimics known tokens
  - [ ] Verify token against official registries
  - [ ] Warn about tokens with similar names (e.g., "USDC" vs "USDC.e")
  - [ ] Check token age and holder count
- [ ] **Malicious Metadata Detection**
  - [ ] Scan metadata URIs for known malicious domains
  - [ ] Check for redirect chains in metadata URLs
  - [ ] Detect hidden characters in names/symbols
  - [ ] Warn about external links in NFT metadata

#### Program/Contract Security

- [ ] **Program Verification**
  - [ ] Verify program is verified on-chain (Anchor verified)
  - [ ] Check program upgrade authority status
  - [ ] Warn if program is upgradeable by unknown authority
  - [ ] Check program against known vulnerability database
- [ ] **CPI (Cross-Program Invocation) Analysis**
  - [ ] Analyze which programs a transaction will invoke
  - [ ] Warn about unknown or unverified programs
  - [ ] Detect potential sandwich attack vectors
- [ ] **IDL Verification**
  - [ ] Verify program IDL matches on-chain bytecode
  - [ ] Warn if IDL is missing or outdated

#### MEV & Front-Running Protection

- [ ] **Transaction Privacy**
  - [ ] Support private transaction submission (Jito bundles)
  - [ ] Implement transaction timing randomization
  - [ ] Warn about MEV-vulnerable transactions
- [ ] **Slippage Protection**
  - [ ] Enforce maximum slippage on swaps
  - [ ] Detect abnormal price impact
  - [ ] Warn about low liquidity situations
- [ ] **Sandwich Attack Detection**
  - [ ] Analyze mempool for potential sandwich attacks
  - [ ] Recommend Jito bundles for high-value transactions

#### Backup & Recovery Security

- [ ] **Keypair Backup Verification**
  - [ ] Prompt for backup verification on first use
  - [ ] Implement encrypted backup export
  - [ ] Support Shamir secret sharing for key backup
- [ ] **Recovery Options**
  - [ ] Document recovery procedures for lost keys
  - [ ] Implement social recovery options (multi-sig guardians)
  - [ ] Support hardware wallet recovery flows
- [ ] **Disaster Recovery**
  - [ ] Export all authority positions for recovery planning
  - [ ] Generate recovery documentation
  - [ ] Test recovery procedures in devnet

#### Operational Security (OpSec)

- [ ] **Environment Checks**
  - [ ] Warn if running on shared/public computer
  - [ ] Check for screen recording software
  - [ ] Verify secure network connection (warn on public WiFi)
  - [ ] Check clipboard for sensitive data exposure
- [ ] **Session Security**
  - [ ] Implement session timeouts for CLI
  - [ ] Clear sensitive data from memory after use
  - [ ] Secure logging (redact sensitive values)
- [ ] **Audit Logging**
  - [ ] Log all sensitive operations locally
  - [ ] Tamper-evident audit trail
  - [ ] Export audit logs for compliance

#### Compliance & Regulatory

- [ ] **OFAC Sanctions Screening**
  - [ ] Check addresses against OFAC sanctions list
  - [ ] Warn before transacting with flagged addresses
  - [ ] Configurable compliance mode
- [ ] **Transaction Limits**
  - [ ] Configurable daily/weekly transaction limits
  - [ ] Require additional confirmation above thresholds
  - [ ] Cool-down periods for large operations
- [ ] **Record Keeping**
  - [ ] Export transaction history for tax reporting
  - [ ] Generate cost basis reports
  - [ ] Track gains/losses per token

#### Third-Party Integration Security

- [ ] **RPC Provider Security**
  - [ ] Verify RPC responses against multiple providers
  - [ ] Detect RPC manipulation attacks
  - [ ] Warn about untrusted RPC endpoints
- [ ] **API Key Management**
  - [ ] Secure storage for API keys (Helius, etc.)
  - [ ] Key rotation reminders
  - [ ] Scope-limited API keys where possible
- [ ] **Dependency Security**
  - [ ] Regular dependency audits
  - [ ] Lock file verification
  - [ ] Warn about known vulnerable dependencies

#### Incident Response

- [ ] **Emergency Procedures**
  - [ ] `tokens emergency freeze` - Quick freeze all authorities
  - [ ] `tokens emergency revoke` - Revoke all approvals
  - [ ] `tokens emergency transfer` - Emergency authority transfer
  - [ ] Document incident response playbook
- [ ] **Post-Incident Analysis**
  - [ ] Transaction trace analysis tools
  - [ ] Timeline reconstruction
  - [ ] Loss calculation utilities

---

## Phase 12: Token-2022 (SPL Token Extensions)

> Token-2022 is the next-gen SPL Token program with powerful extensions. Critical for competing with Metaplex.

### 12.1 Core Token-2022 Support

- [ ] Create `src/programs/token-2022/` directory
- [ ] Program ID: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- [ ] Implement basic token operations with Token-2022

### 12.2 Token-2022 Extensions

- [ ] **Transfer Fees** - Automatic fee collection on transfers
  - [ ] `initializeTransferFeeConfig` - Set up transfer fees
  - [ ] `setTransferFee` - Update fee percentage
  - [ ] `withdrawWithheldTokensFromMint` - Collect fees
  - [ ] `harvestWithheldTokensToMint` - Harvest from accounts
- [ ] **Interest-Bearing Tokens** - Tokens that accrue interest
  - [ ] `initializeInterestBearingMint` - Set up interest
  - [ ] `updateRateInterestBearingMint` - Update rate
  - [ ] `amountToUiAmount` / `uiAmountToAmount` - Convert with interest
- [ ] **Non-Transferable Tokens** (Soulbound)
  - [ ] `initializeNonTransferable` - Make token soulbound
- [ ] **Permanent Delegate**
  - [ ] `initializePermanentDelegate` - Set permanent delegate
- [ ] **Transfer Hook** - Custom logic on transfers
  - [ ] `initializeTransferHook` - Set hook program
  - [ ] `updateTransferHook` - Update hook
- [ ] **Metadata Pointer** - On-chain metadata
  - [ ] `initializeMetadataPointer` - Point to metadata
  - [ ] `updateMetadataPointer` - Update pointer
- [ ] **Confidential Transfers** - Private balances
  - [ ] `initializeConfidentialTransferMint` - Enable confidential
  - [ ] `configureConfidentialTransferAccount` - Configure account
  - [ ] `confidentialTransfer` - Private transfer
- [ ] **Default Account State** - Frozen by default
  - [ ] `initializeDefaultAccountState` - Set default state
  - [ ] `updateDefaultAccountState` - Update state
- [ ] **CPI Guard** - Prevent CPI token transfers
  - [ ] `enableCpiGuard` / `disableCpiGuard`
- [ ] **Mint Close Authority** - Close mint accounts
  - [ ] `initializeMintCloseAuthority` - Set close authority
- [ ] **Group/Member Pointers** - Token grouping
  - [ ] `initializeGroupPointer` / `initializeGroupMemberPointer`

### 12.3 CLI Commands for Token-2022

- [ ] `tokens create --token-2022` - Create Token-2022 token
- [ ] `tokens create --transfer-fee <bps>` - With transfer fees
- [ ] `tokens create --interest-rate <rate>` - Interest-bearing
- [ ] `tokens create --soulbound` - Non-transferable
- [ ] `tokens create --confidential` - Confidential transfers
- [ ] `tokens fees collect <mint>` - Collect transfer fees
- [ ] `tokens fees withdraw <mint>` - Withdraw collected fees

---

## Phase 13: Marketplace & Trading Features

### 13.1 Listing & Sales

- [ ] Create `src/marketplace/` directory
- [ ] Implement direct peer-to-peer NFT sales (no marketplace program)
- [ ] Implement escrow-based sales with atomic swaps
- [ ] Support SOL and SPL token payments
- [ ] Implement offer/bid system

### 13.2 Auction Support

- [ ] Implement English auction (highest bid wins)
- [ ] Implement Dutch auction (price decreases over time)
- [ ] Implement timed auctions with auto-settlement
- [ ] Create auction house program interactions (if using existing)

### 13.3 Royalty Enforcement

- [ ] Implement royalty calculation and distribution
- [ ] Support creator splits (multiple creators)
- [ ] Track primary vs secondary sales
- [ ] Implement royalty bypass detection/prevention

### 13.4 CLI Commands for Trading

- [ ] `tokens nft list <mint> --price <amount>` - List NFT for sale
- [ ] `tokens nft delist <mint>` - Remove listing
- [ ] `tokens nft buy <mint>` - Purchase listed NFT
- [ ] `tokens nft offer <mint> --price <amount>` - Make offer
- [ ] `tokens nft auction <mint> --type <type> --start <price>` - Start auction

---

## Phase 14: Analytics & Indexing

### 14.1 On-Chain Data Indexing

- [ ] Implement transaction history fetching
- [ ] Parse and index token transfers
- [ ] Parse and index NFT sales/transfers
- [ ] Track holder snapshots over time
- [ ] Implement real-time event streaming (websockets)

### 14.2 DAS API Integration (Digital Asset Standard)

- [ ] Create `src/das/` directory for DAS API client
- [ ] Implement DAS RPC methods (no external SDK):
  - [ ] `getAsset` - Get asset by ID
  - [ ] `getAssetsByOwner` - Get assets by owner
  - [ ] `getAssetsByGroup` - Get assets by collection
  - [ ] `getAssetsByCreator` - Get assets by creator
  - [ ] `searchAssets` - Search with filters
  - [ ] `getAssetProof` - Get Merkle proof for cNFTs
  - [ ] `getAssetsByAuthority` - Get by authority
- [ ] Support multiple DAS providers (Helius, Triton, etc.)
- [ ] Implement pagination and cursor handling
- [ ] Add response caching

### 14.3 Analytics Utilities

- [ ] `tokens analytics holders <mint>` - Holder distribution
- [ ] `tokens analytics volume <mint>` - Trading volume
- [ ] `tokens analytics history <mint>` - Price history
- [ ] `tokens analytics whale-watch <mint>` - Large holder tracking
- [ ] Export to CSV/JSON formats

---

## Phase 15: Automation & Scripting

### 15.1 Batch Operations

- [ ] Implement batch token transfers (airdrop optimization)
- [ ] Implement batch NFT minting
- [ ] Implement batch metadata updates
- [ ] Use lookup tables (ALTs) for large batches
- [ ] Implement transaction chunking for RPC limits

### 15.2 Scheduled Operations

- [ ] Implement delayed/scheduled transactions
- [ ] Support cron-like scheduling for CLI
- [ ] Implement mint start/end automation
- [ ] Create webhook triggers for events

### 15.3 Scripting API

- [ ] Create fluent API for chaining operations:

  ```ts
  await tokens
    .createToken({ name: 'MyToken', symbol: 'MTK' })
    .mint({ amount: 1000000 })
    .transfer({ to: recipient, amount: 500000 })
    .execute()
  ```

- [ ] Implement transaction batching in fluent API
- [ ] Add dry-run support for scripts
- [ ] Create script templates for common workflows

---

## Phase 16: Migration & Compatibility Tools

### 16.1 Metaplex Migration

- [ ] Create migration guide from Metaplex SDK
- [ ] Implement 1:1 API compatibility layer (optional)
- [ ] Create codemod scripts for automatic migration
- [ ] Document API differences and equivalents

### 16.2 Import/Export Tools

- [ ] Import existing collections from on-chain data
- [ ] Export collection data to JSON/CSV
- [ ] Import Candy Machine config from Sugar format
- [ ] Export to Metaplex-compatible formats

### 16.3 Backward Compatibility

- [ ] Support reading legacy metadata formats
- [ ] Handle deprecated instruction formats
- [ ] Maintain compatibility with existing NFT marketplaces

### 16.4 Legacy Metaplex Collection Management

> **Goal**: Full management capabilities for existing Metaplex-generated NFT collections, including old Candy Machine v1/v2 collections.

#### Collection Discovery & Import

- [ ] `importCollection(collectionMint)` - Import existing collection

  ```ts
  const collection = await tokens.legacy.importCollection({
    collectionMint: 'ABC123...',
    // Automatically detects:
    // - Metaplex version (v1, v2, v3, Core)
    // - Candy Machine version (v1, v2, v3)
    // - Collection size and minted count
    // - Creator addresses and royalties
  })
  ```

- [ ] `discoverCollectionByCreator(creator)` - Find all collections by creator
- [ ] `discoverCollectionByAuthority(authority)` - Find by update authority
- [ ] `discoverCollectionByCandyMachine(cm)` - Find by CM address
- [ ] Auto-detect collection type and version

#### Collection Metadata Management

- [ ] `getCollectionMetadata(collection)` - Fetch full collection metadata

  ```ts
  const metadata = await tokens.legacy.getCollectionMetadata(collectionMint)
  // {
  //   name: 'My Old Collection',
  //   symbol: 'MOC',
  //   uri: 'https://arweave.net/...',
  //   sellerFeeBasisPoints: 500,
  //   creators: [...],
  //   collection: { verified: true, key: '...' },
  //   uses: null,
  //   isMutable: true,
  //   primarySaleHappened: true,
  //   editionNonce: 255,
  // }
  ```

- [ ] `updateCollectionMetadata(collection, updates)` - Update collection NFT metadata

  ```ts
  await tokens.legacy.updateCollectionMetadata(collectionMint, {
    name: 'Updated Collection Name',
    uri: 'https://new-metadata-uri...',
    // Only works if isMutable: true
  })
  ```

- [ ] `updateCollectionUri(collection, newUri)` - Update just the URI
- [ ] `updateCollectionRoyalty(collection, newRoyaltyBps)` - Update royalty

#### Individual NFT Management

- [ ] `getNFTsInCollection(collection, options)` - Get all NFTs in collection

  ```ts
  const nfts = await tokens.legacy.getNFTsInCollection(collectionMint, {
    page: 1,
    limit: 100,
    includeMetadata: true, // Fetch off-chain metadata too
  })
  // Returns array of NFT data with on-chain + off-chain metadata
  ```

- [ ] `getNFTMetadata(mint)` - Get single NFT metadata (Metaplex format)
- [ ] `updateNFTMetadata(mint, updates)` - Update individual NFT

  ```ts
  await tokens.legacy.updateNFTMetadata(nftMint, {
    name: 'NFT #123 - Renamed',
    uri: 'https://new-uri...',
  })
  ```

- [ ] `updateNFTUri(mint, newUri)` - Update just URI
- [ ] `batchUpdateNFTMetadata(mints, updates)` - Batch update multiple NFTs

  ```ts
  // Update all NFTs in collection with new base URI
  await tokens.legacy.batchUpdateNFTMetadata({
    collection: collectionMint,
    transform: (nft, index) => ({
      uri: `https://new-base-uri.com/${index}.json`,
    }),
  })
  ```

#### Authority Management

- [ ] `getCollectionAuthorities(collection)` - Get all authorities

  ```ts
  const authorities = await tokens.legacy.getCollectionAuthorities(collectionMint)
  // {
  //   updateAuthority: 'ABC...',
  //   mintAuthority: null, // NFTs don't have mint authority
  //   collectionAuthority: 'DEF...',
  //   creators: [{ address: '...', verified: true, share: 100 }],
  // }
  ```

- [ ] `transferUpdateAuthority(collection, newAuthority)` - Transfer update authority

  ```ts
  await tokens.legacy.transferUpdateAuthority(collectionMint, newAuthorityPubkey)
  ```

- [ ] `transferNFTUpdateAuthority(mint, newAuthority)` - Transfer for single NFT
- [ ] `batchTransferUpdateAuthority(mints, newAuthority)` - Batch transfer
- [ ] `setCollectionAuthority(collection, authority)` - Set collection authority record
- [ ] `revokeCollectionAuthority(collection, authority)` - Revoke authority

#### Creator Management

- [ ] `verifyCreator(mint, creator)` - Verify creator on NFT

  ```ts
  // Creator signs to verify themselves on NFT
  await tokens.legacy.verifyCreator(nftMint, creatorPubkey)
  ```

- [ ] `unverifyCreator(mint, creator)` - Remove creator verification
- [ ] `batchVerifyCreator(mints, creator)` - Batch verify across collection
- [ ] `updateCreators(mint, newCreators)` - Update creator array

  ```ts
  await tokens.legacy.updateCreators(nftMint, [
    { address: creator1, share: 70, verified: false },
    { address: creator2, share: 30, verified: false },
  ])
  // Note: Creators need to verify themselves after update
  ```

#### Collection Verification

- [ ] `verifyNFTInCollection(nft, collection)` - Verify NFT belongs to collection

  ```ts
  await tokens.legacy.verifyNFTInCollection(nftMint, collectionMint)
  // Requires collection authority signature
  ```

- [ ] `unverifyNFTFromCollection(nft, collection)` - Remove from collection
- [ ] `batchVerifyCollection(nfts, collection)` - Batch verify multiple NFTs
- [ ] `setAndVerifyCollection(nft, collection)` - Set and verify in one tx
- [ ] `migrateToSizedCollection(collection)` - Migrate to sized collection

  ```ts
  // Upgrade old unsized collection to sized collection
  await tokens.legacy.migrateToSizedCollection(collectionMint, {
    size: 10000, // Total collection size
  })
  ```

#### Royalty Management

- [ ] `getRoyaltyInfo(mint)` - Get royalty configuration

  ```ts
  const royalty = await tokens.legacy.getRoyaltyInfo(nftMint)
  // {
  //   sellerFeeBasisPoints: 500, // 5%
  //   creators: [
  //     { address: '...', share: 70 }, // Gets 70% of 5%
  //     { address: '...', share: 30 }, // Gets 30% of 5%
  //   ],
  // }
  ```

- [ ] `updateRoyalty(mint, newRoyaltyBps)` - Update royalty percentage
- [ ] `updateRoyaltySplits(mint, newCreators)` - Update creator splits
- [ ] `batchUpdateRoyalty(collection, newRoyaltyBps)` - Update entire collection

#### Edition Management (Master Editions & Prints)

- [ ] `getMasterEditionInfo(mint)` - Get master edition details

  ```ts
  const edition = await tokens.legacy.getMasterEditionInfo(masterMint)
  // {
  //   supply: 50, // Editions printed
  //   maxSupply: 100, // Max editions (null = unlimited)
  //   type: 'MasterEditionV2',
  // }
  ```

- [ ] `getEditionInfo(mint)` - Get print edition details
- [ ] `printEdition(masterMint, options)` - Print new edition

  ```ts
  const edition = await tokens.legacy.printEdition(masterMint, {
    to: recipientAddress,
    editionNumber: 51, // Optional, auto-increments if not specified
  })
  ```

- [ ] `getEditionsByMaster(masterMint)` - Get all editions of a master
- [ ] `updateMasterEditionMaxSupply(mint, newMax)` - Reduce max supply

#### Burning & Closing

- [ ] `burnNFT(mint)` - Burn NFT and reclaim rent

  ```ts
  const rent = await tokens.legacy.burnNFT(nftMint)
  // Burns token, closes metadata, master edition, and token accounts
  // Returns reclaimed rent in lamports
  ```

- [ ] `burnEdition(mint)` - Burn print edition
- [ ] `batchBurnNFTs(mints)` - Batch burn multiple NFTs
- [ ] `closeEmptyAccounts(owner)` - Close empty token accounts

#### Freeze/Thaw Operations

- [ ] `freezeNFT(mint, owner)` - Freeze NFT (prevent transfers)
- [ ] `thawNFT(mint, owner)` - Unfreeze NFT
- [ ] `batchFreezeNFTs(mints)` - Batch freeze
- [ ] `batchThawNFTs(mints)` - Batch thaw

#### Delegation

- [ ] `delegateNFT(mint, delegate, options)` - Delegate NFT authority

  ```ts
  await tokens.legacy.delegateNFT(nftMint, delegateAddress, {
    type: 'transfer', // 'transfer' | 'sale' | 'utility' | 'staking'
  })
  ```

- [ ] `revokeDelegate(mint)` - Revoke delegation
- [ ] `getDelegateInfo(mint)` - Get current delegate

#### Collection Analytics

- [ ] `getCollectionStats(collection)` - Get collection statistics

  ```ts
  const stats = await tokens.legacy.getCollectionStats(collectionMint)
  // {
  //   totalSupply: 10000,
  //   holders: 3500,
  //   uniqueHolders: 2800,
  //   listedCount: 450,
  //   floorPrice: 2.5, // SOL
  //   totalVolume: 150000, // SOL
  // }
  ```

- [ ] `getHolderSnapshot(collection)` - Snapshot all holders

  ```ts
  const holders = await tokens.legacy.getHolderSnapshot(collectionMint)
  // [{ owner: '...', mints: ['...', '...'], count: 2 }, ...]
  ```

- [ ] `getCollectionHistory(collection)` - Transaction history
- [ ] `exportCollectionData(collection, format)` - Export to JSON/CSV

#### Legacy Candy Machine Management

- [ ] `getCandyMachineInfo(cm)` - Get CM details (v1, v2, or v3)

  ```ts
  const cm = await tokens.legacy.getCandyMachineInfo(candyMachineAddress)
  // {
  //   version: 'v2',
  //   itemsAvailable: 10000,
  //   itemsRedeemed: 8500,
  //   itemsRemaining: 1500,
  //   price: 1.5, // SOL
  //   goLiveDate: Date,
  //   authority: '...',
  //   // ... other CM-specific fields
  // }
  ```

- [ ] `updateCandyMachine(cm, updates)` - Update CM settings
- [ ] `withdrawCandyMachineFunds(cm)` - Withdraw SOL from CM
- [ ] `closeCandyMachine(cm)` - Close CM and reclaim rent

#### CLI Commands for Legacy Management

- [ ] `tokens legacy import <collection>` - Import existing collection
- [ ] `tokens legacy info <collection>` - Show collection info
- [ ] `tokens legacy nfts <collection>` - List all NFTs in collection
- [ ] `tokens legacy update <mint>` - Update NFT metadata (interactive)
- [ ] `tokens legacy batch-update <collection>` - Batch update collection
- [ ] `tokens legacy authority <collection>` - Manage authorities
- [ ] `tokens legacy verify <nft> <collection>` - Verify NFT in collection
- [ ] `tokens legacy royalty <mint> [new-bps]` - View/update royalty
- [ ] `tokens legacy creators <mint>` - Manage creators
- [ ] `tokens legacy burn <mint>` - Burn NFT
- [ ] `tokens legacy snapshot <collection>` - Export holder snapshot
- [ ] `tokens legacy export <collection>` - Export collection data
- [ ] `tokens legacy cm-info <candy-machine>` - Show CM info
- [ ] `tokens legacy cm-withdraw <candy-machine>` - Withdraw CM funds

---

## Future Considerations (Post v1.0)

### Additional Chain Support

- [ ] Design chain driver interface for extensibility
- [ ] Research Ethereum/EVM integration (ERC-20, ERC-721, ERC-1155)
- [ ] Research other Solana-like chains (Sui, Aptos)
- [ ] Create driver implementation guide for contributors

### Advanced Features

- [ ] Real-time websocket subscriptions

### Developer Experience

- [ ] VS Code extension for token development
- [ ] Token/NFT explorer web app
- [ ] GraphQL API layer
- [ ] Webhook notifications for events
- [ ] Analytics dashboard

### Potential New Standards

- [ ] Research cross-chain token bridging
- [ ] Investigate ZK-based privacy features

---

## Phase 17: Simple NFT Standard (ts-tokens Native)

> **Goal**: Create a simpler, more intuitive NFT standard that provides the same features as Metaplex but with cleaner APIs, less boilerplate, and better DX. This becomes our competitive advantage.

### 17.1 Design Principles

- [ ] **Single instruction where possible** - Combine common multi-instruction flows
- [ ] **Sensible defaults** - No required params that have obvious defaults
- [ ] **Readable account names** - No cryptic PDA seeds or account naming
- [ ] **Minimal account overhead** - Fewer accounts = cheaper = faster
- [ ] **TypeScript-first** - Types that make sense, not auto-generated from Rust
- [ ] **Progressive complexity** - Simple things simple, complex things possible

### 17.2 Core Program Design

- [ ] Create `programs/ts-nft/` directory for on-chain program (Anchor or native)
- [ ] Program features:
  - [ ] **Single-instruction mint** - Create NFT in one transaction
  - [ ] **Inline metadata** - Store small metadata on-chain (no separate account)
  - [ ] **Optional external URI** - For larger metadata/media
  - [ ] **Built-in collection support** - No separate verification step
  - [ ] **Native royalties** - Enforced at protocol level
  - [ ] **Simple editions** - Print editions without master edition complexity

### 17.3 Account Structure (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│ NFT Account (single account vs Metaplex's 3+ accounts)      │
├─────────────────────────────────────────────────────────────┤
│ mint: Pubkey              // The SPL token mint             │
│ owner: Pubkey             // Current owner                  │
│ collection: Option<Pubkey> // Collection (if any)           │
│ name: String[32]          // On-chain name                  │
│ symbol: String[10]        // On-chain symbol                │
│ uri: String[200]          // Metadata URI                   │
│ royalty_bps: u16          // Royalty in basis points        │
│ creators: Vec<Creator>    // Up to 5 creators with shares   │
│ is_mutable: bool          // Can metadata be updated        │
│ edition: Option<Edition>  // Edition info (if applicable)   │
│ attributes: Vec<Attr>     // On-chain attributes (optional) │
└─────────────────────────────────────────────────────────────┘
```

- [ ] Design single NFT account structure (vs Metaplex: Mint + Metadata + MasterEdition + Edition)
- [ ] Design Collection account structure
- [ ] Design Creator verification system (simpler than Metaplex)
- [ ] Implement efficient serialization (Borsh with optimizations)

### 17.4 Instruction Set (Clean & Minimal)

#### Core Instructions

- [ ] `create_nft` - Create NFT with all data in one instruction

  ```ts
  // Metaplex requires: createMint + createMetadataAccountV3 + createMasterEditionV3
  // ts-tokens:
  await createNFT({
    name: 'My NFT',
    symbol: 'MNFT',
    uri: 'https://...',
    royalty: 5, // 5% (not basis points!)
    creators: [{ address: wallet, share: 100 }],
  })
  ```

- [ ] `update_nft` - Update mutable fields

  ```ts
  await updateNFT(mint, { name: 'New Name', uri: 'https://new...' })
  ```

- [ ] `transfer_nft` - Transfer with royalty tracking

  ```ts
  await transferNFT(mint, { to: recipient })
  ```

- [ ] `burn_nft` - Burn and reclaim rent

  ```ts
  await burnNFT(mint) // Returns rent to owner
  ```

#### Collection Instructions

- [ ] `create_collection` - Create collection

  ```ts
  await createCollection({
    name: 'My Collection',
    symbol: 'MCOL',
    uri: 'https://...',
    royalty: 5,
    maxSize: 10000, // Optional cap
  })
  ```

- [ ] `add_to_collection` - Add NFT to collection (no separate verify step)

  ```ts
  await addToCollection(nftMint, collectionMint)
  // Automatically verified if caller is collection authority
  ```

- [ ] `remove_from_collection` - Remove NFT from collection
- [ ] `update_collection` - Update collection metadata

#### Edition Instructions

- [ ] `create_editions` - Create edition NFT (simplified)

  ```ts
  await createEditions(masterMint, {
    maxSupply: 100, // or null for unlimited
  })
  ```

- [ ] `print_edition` - Print a single edition

  ```ts
  const edition = await printEdition(masterMint, { to: recipient })
  // Returns edition number automatically
  ```

#### Utility Instructions

- [ ] `freeze_nft` / `thaw_nft` - Freeze/unfreeze NFT
- [ ] `delegate` / `revoke` - Delegate authority
- [ ] `set_royalty` - Update royalty (if mutable)
- [ ] `verify_creator` - Creator signs to verify

### 17.5 TypeScript SDK Design

#### Simple, Intuitive API

- [ ] Create `src/simple-nft/` directory
- [ ] Design fluent builder pattern:

  ```ts
  // Creating an NFT
  const nft = await tokens.nft
    .create()
    .name('My NFT')
    .symbol('MNFT')
    .image('https://...') // Auto-generates metadata JSON
    .royalty(5)
    .creator(wallet)
    .inCollection(collectionMint)
    .mint()

  // Or with object syntax
  const nft = await tokens.nft.create({
    name: 'My NFT',
    image: 'https://...',
    royalty: 5,
  })
  ```

- [ ] Design query API:

  ```ts
  // Get NFT data
  const nft = await tokens.nft.get(mint)
  console.log(nft.name, nft.owner, nft.royalty)

  // Get all NFTs by owner
  const nfts = await tokens.nft.byOwner(wallet)

  // Get collection NFTs
  const items = await tokens.nft.byCollection(collectionMint)
  ```

- [ ] Design batch operations:

  ```ts
  // Batch mint
  await tokens.nft.batchCreate([
    { name: 'NFT #1', uri: '...' },
    { name: 'NFT #2', uri: '...' },
    { name: 'NFT #3', uri: '...' },
  ])

  // Batch transfer (airdrop)
  await tokens.nft.batchTransfer(mints, recipients)
  ```

### 17.6 Metadata Handling (Simplified)

- [ ] **Auto-generate metadata JSON** from simple inputs:

  ```ts
  // User provides:
  await createNFT({
    name: 'Cool NFT',
    description: 'A very cool NFT',
    image: './image.png', // Local file
    attributes: [
      { trait: 'Background', value: 'Blue' },
      { trait: 'Rarity', value: 'Legendary' },
    ],
  })

  // Library automatically:
  // 1. Uploads image to configured storage
  // 2. Generates metadata JSON
  // 3. Uploads metadata JSON
  // 4. Creates NFT with URI
  ```

- [ ] Support multiple metadata input formats:
  - [ ] Full metadata JSON object
  - [ ] Simple object (auto-generates JSON)
  - [ ] URI string (use as-is)
  - [ ] Local file path (auto-upload)

### 17.7 Comparison: ts-tokens vs Metaplex

| Feature | Metaplex | ts-tokens Simple NFT |
|---------|----------|---------------------|
| Create NFT | 3+ instructions | 1 instruction |
| Accounts per NFT | 3-4 (Mint, Metadata, MasterEdition, Edition) | 1-2 (Mint, NFTData) |
| Collection verify | Separate instruction | Automatic on add |
| Royalty format | Basis points (500 = 5%) | Percentage (5 = 5%) |
| Default mutability | Mutable | Immutable (safer default) |
| Creator verification | Required separate tx | Optional, can be inline |
| TypeScript types | Auto-generated, verbose | Hand-crafted, intuitive |
| Error messages | Program error codes | Human-readable messages |

### 17.8 Migration & Compatibility

- [ ] Create migration tool from Metaplex NFTs to ts-tokens format
- [ ] Ensure marketplace compatibility (Magic Eden, Tensor, etc.)
- [ ] Support reading both Metaplex and ts-tokens NFTs
- [ ] Provide adapter for existing Metaplex collections

### 17.9 CLI Commands for Simple NFT

- [ ] `tokens nft create` - Interactive NFT creation

  ```bash
  $ tokens nft create
  ? NFT Name: My Cool NFT
  ? Description: A very cool NFT
  ? Image path or URL: ./image.png
  ? Royalty percentage: 5
  ? Add to collection? (Y/n): y
  ? Collection address: ABC123...

  ✓ Uploaded image to Arweave: ar://xyz...
  ✓ Generated metadata JSON
  ✓ Uploaded metadata to Arweave: ar://abc...
  ✓ Created NFT: 7nft...
  ```

- [ ] `tokens nft create --simple` - One-liner creation

  ```bash
  tokens nft create --name "My NFT" --image ./img.png --royalty 5
  ```

- [ ] `tokens collection create` - Create collection
- [ ] `tokens collection add <nft> <collection>` - Add NFT to collection
- [ ] `tokens nft editions create <master> --max 100` - Create editions
- [ ] `tokens nft editions print <master>` - Print edition

### 17.10 On-Chain Program Development

- [ ] Decide: Anchor vs Native Rust
  - [ ] Anchor: Faster development, more dependencies
  - [ ] Native: Zero dependencies, more control, harder
  - [ ] Recommendation: Start with Anchor, optimize later
- [ ] Set up program development environment
- [ ] Write program instructions
- [ ] Write comprehensive tests
- [ ] Audit program before mainnet deployment
- [ ] Deploy to devnet for testing
- [ ] Deploy to mainnet

### 17.11 Documentation for Simple NFT

- [ ] `docs/simple-nft/overview.md` - Why we created this
- [ ] `docs/simple-nft/quickstart.md` - 5-minute guide
- [ ] `docs/simple-nft/api.md` - Full API reference
- [ ] `docs/simple-nft/migration.md` - Migrating from Metaplex
- [ ] `docs/simple-nft/program.md` - On-chain program docs
- [ ] `docs/simple-nft/comparison.md` - Detailed comparison with Metaplex

---

## Phase 18: Staking & Token Locking

> **Goal**: Implement comprehensive staking and token locking mechanisms for both fungible tokens and NFTs, enabling yield generation, governance participation, and token utility.

### 18.1 Core Staking Program Design

- [ ] Create `src/programs/staking/` directory for on-chain program
- [ ] Program ID: Deploy our own staking program
- [ ] Design principles:
  - [ ] Flexible lock periods (no lock, fixed, variable)
  - [ ] Multiple reward token support
  - [ ] Compound vs simple interest options
  - [ ] Emergency unstake with penalty option

### 18.2 Staking Account Structures

```rust
// Stake Pool - Manages a staking pool for a specific token
┌─────────────────────────────────────────────────────────────┐
│ StakePool Account                                           │
├─────────────────────────────────────────────────────────────┤
│ authority: Pubkey           // Pool admin                   │
│ stake_mint: Pubkey          // Token being staked           │
│ reward_mint: Pubkey         // Reward token (can be same)   │
│ total_staked: u64           // Total tokens staked          │
│ reward_rate: u64            // Rewards per second           │
│ min_stake_amount: u64       // Minimum stake                │
│ lock_period: i64            // Lock duration (0 = none)     │
│ early_unstake_penalty: u16  // Penalty bps for early exit   │
│ last_update_time: i64       // Last reward calculation      │
│ reward_per_token_stored: u128 // Accumulated rewards        │
│ is_paused: bool             // Emergency pause              │
└─────────────────────────────────────────────────────────────┘

// User Stake - Individual user's stake position
┌─────────────────────────────────────────────────────────────┐
│ UserStake Account                                           │
├─────────────────────────────────────────────────────────────┤
│ owner: Pubkey               // Staker                       │
│ pool: Pubkey                // Stake pool                   │
│ amount: u64                 // Amount staked                │
│ stake_time: i64             // When staked                  │
│ lock_end_time: i64          // When lock expires            │
│ rewards_earned: u64         // Unclaimed rewards            │
│ reward_per_token_paid: u128 // Last reward checkpoint       │
└─────────────────────────────────────────────────────────────┘
```

- [ ] Design StakePool account structure
- [ ] Design UserStake account structure
- [ ] Design reward distribution mechanism (per-second accrual)
- [ ] Implement efficient reward calculation (checkpoint system)

### 18.3 Staking Instructions

#### Pool Management

- [ ] `create_stake_pool` - Create new staking pool

  ```ts
  await createStakePool({
    stakeMint: tokenMint,
    rewardMint: rewardTokenMint, // Can be same as stake
    rewardRate: 100, // Tokens per day
    lockPeriod: 30 * 24 * 60 * 60, // 30 days in seconds
    minStake: 1000,
    earlyUnstakePenalty: 10, // 10% penalty
  })
  ```

- [ ] `update_stake_pool` - Update pool parameters
- [ ] `pause_stake_pool` / `resume_stake_pool` - Emergency controls
- [ ] `fund_rewards` - Add reward tokens to pool
- [ ] `withdraw_rewards` - Remove unfunded rewards (admin)
- [ ] `close_stake_pool` - Close pool and return funds

#### User Staking

- [ ] `stake` - Stake tokens

  ```ts
  await stake({
    pool: stakePoolAddress,
    amount: 10000,
  })
  // Automatically claims pending rewards
  ```

- [ ] `unstake` - Unstake tokens

  ```ts
  await unstake({
    pool: stakePoolAddress,
    amount: 5000, // Partial unstake supported
  })
  // Applies penalty if before lock_end_time
  ```

- [ ] `claim_rewards` - Claim accumulated rewards

  ```ts
  const rewards = await claimRewards(stakePoolAddress)
  console.log(`Claimed ${rewards} tokens`)
  ```

- [ ] `compound_rewards` - Restake rewards (if same token)
- [ ] `emergency_unstake` - Force unstake with max penalty

### 18.4 NFT Staking

- [ ] Create `src/staking/nft.ts` for NFT-specific staking
- [ ] `create_nft_stake_pool` - Pool for staking NFTs

  ```ts
  await createNFTStakePool({
    collection: collectionMint, // Only NFTs from this collection
    rewardMint: tokenMint,
    rewardPerNFT: 10, // Tokens per NFT per day
    rarityMultipliers: {
      common: 1,
      rare: 1.5,
      legendary: 3,
    },
  })
  ```

- [ ] `stake_nft` - Stake NFT (transfers to escrow)
- [ ] `unstake_nft` - Unstake and return NFT
- [ ] `claim_nft_rewards` - Claim rewards for staked NFTs
- [ ] Support rarity-based reward multipliers
- [ ] Support trait-based reward bonuses

### 18.5 Token Locking (Vesting)

- [ ] Create `src/locking/` directory
- [ ] `create_lock` - Lock tokens with vesting schedule

  ```ts
  await createLock({
    mint: tokenMint,
    amount: 1000000,
    beneficiary: recipientAddress,
    schedule: {
      type: 'linear', // or 'cliff', 'milestone'
      start: new Date('2025-01-01'),
      end: new Date('2026-01-01'),
      cliffDuration: 90 * 24 * 60 * 60, // 90 day cliff
    },
  })
  ```

- [ ] `claim_vested` - Claim unlocked tokens
- [ ] `get_vested_amount` - Calculate currently vested amount
- [ ] `revoke_lock` - Revoke unvested tokens (if revocable)
- [ ] Support vesting schedules:
  - [ ] **Linear** - Continuous unlock over time
  - [ ] **Cliff** - Nothing until cliff, then linear
  - [ ] **Milestone** - Unlock at specific dates
  - [ ] **Custom** - User-defined unlock points

### 18.6 Liquid Staking (Advanced)

- [ ] Create `src/staking/liquid.ts`
- [ ] `create_liquid_stake_pool` - Pool that issues receipt tokens

  ```ts
  // User stakes SOL/Token, receives stSOL/stToken
  await createLiquidStakePool({
    stakeMint: SOL_MINT,
    receiptMint: stSOL_MINT, // Liquid staking token
    exchangeRate: 1.0, // Initial 1:1
  })
  ```

- [ ] Receipt tokens represent staked position
- [ ] Receipt tokens can be traded/used in DeFi
- [ ] Exchange rate increases as rewards accrue
- [ ] `liquid_stake` / `liquid_unstake` operations

### 18.7 TypeScript SDK for Staking

- [ ] Create `src/staking/index.ts` with clean API:

  ```ts
  // Create pool
  const pool = await tokens.staking.createPool({
    token: myToken,
    rewards: { token: rewardToken, rate: '100/day' },
    lock: '30 days',
  })

  // Stake
  await tokens.staking.stake(pool, { amount: 10000 })

  // Check rewards
  const pending = await tokens.staking.pendingRewards(pool)

  // Claim
  await tokens.staking.claim(pool)

  // Unstake
  await tokens.staking.unstake(pool, { amount: 5000 })
  ```

- [ ] Create query functions:

  ```ts
  // Get all pools for a token
  const pools = await tokens.staking.pools(tokenMint)

  // Get user's stakes
  const myStakes = await tokens.staking.myStakes(wallet)

  // Get pool stats
  const stats = await tokens.staking.poolStats(pool)
  // { totalStaked, apy, totalStakers, rewardsRemaining }
  ```

### 18.8 CLI Commands for Staking

- [ ] `tokens stake create-pool` - Create staking pool (interactive)
- [ ] `tokens stake fund <pool> <amount>` - Fund pool with rewards
- [ ] `tokens stake <pool> <amount>` - Stake tokens
- [ ] `tokens unstake <pool> [amount]` - Unstake (all if no amount)
- [ ] `tokens stake claim <pool>` - Claim rewards
- [ ] `tokens stake compound <pool>` - Compound rewards
- [ ] `tokens stake info <pool>` - Show pool info
- [ ] `tokens stake my-stakes` - Show all user stakes
- [ ] `tokens lock create` - Create token lock/vesting
- [ ] `tokens lock claim <lock>` - Claim vested tokens
- [ ] `tokens lock info <lock>` - Show lock info

### 18.9 Staking Analytics

- [ ] APY/APR calculation utilities
- [ ] Historical reward tracking
- [ ] Pool performance metrics
- [ ] User earnings history
- [ ] Export staking reports

---

## Phase 19: Multi-Sig Authority Support

> **Goal**: Enable secure multi-signature control over token authorities, collections, and staking pools. Critical for teams and DAOs managing tokens.

### 19.1 Multi-Sig Program Design

- [ ] Create `src/programs/multisig/` directory
- [ ] Design lightweight multi-sig (simpler than Squads)
- [ ] Support M-of-N signature schemes
- [ ] Time-locked transactions option

### 19.2 Multi-Sig Account Structures

```rust
┌─────────────────────────────────────────────────────────────┐
│ MultiSig Account                                            │
├─────────────────────────────────────────────────────────────┤
│ threshold: u8               // Required signatures (M)      │
│ owners: Vec<Pubkey>         // Signers (N, max 10)          │
│ nonce: u64                  // Transaction counter          │
│ owner_set_seqno: u32        // Owner change tracking        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Transaction Account                                         │
├─────────────────────────────────────────────────────────────┤
│ multisig: Pubkey            // Parent multisig              │
│ program_id: Pubkey          // Target program               │
│ accounts: Vec<AccountMeta>  // Transaction accounts         │
│ data: Vec<u8>               // Instruction data             │
│ signers: Vec<bool>          // Who has signed               │
│ did_execute: bool           // Execution status             │
│ created_at: i64             // Creation timestamp           │
│ expires_at: Option<i64>     // Optional expiry              │
└─────────────────────────────────────────────────────────────┘
```

- [ ] Design MultiSig account structure
- [ ] Design Transaction account structure
- [ ] Implement signature tracking
- [ ] Implement transaction expiry

### 19.3 Multi-Sig Instructions

#### Setup

- [ ] `create_multisig` - Create multi-sig wallet

  ```ts
  const multisig = await createMultiSig({
    owners: [owner1, owner2, owner3],
    threshold: 2, // 2-of-3
  })
  ```

- [ ] `add_owner` - Add new owner (requires threshold)
- [ ] `remove_owner` - Remove owner (requires threshold)
- [ ] `change_threshold` - Change required signatures

#### Transactions

- [ ] `create_transaction` - Propose a transaction

  ```ts
  const tx = await createMultiSigTransaction({
    multisig: multisigAddress,
    instruction: mintTokensInstruction, // Any instruction
    expiresIn: 7 * 24 * 60 * 60, // 7 days
  })
  ```

- [ ] `approve` - Sign/approve transaction

  ```ts
  await approveTransaction(txAddress)
  // Auto-executes if threshold reached
  ```

- [ ] `reject` - Reject transaction
- [ ] `execute` - Execute approved transaction
- [ ] `cancel` - Cancel pending transaction (proposer only)

### 19.4 Multi-Sig Integration with Tokens

- [ ] `set_token_authority_multisig` - Transfer authority to multisig

  ```ts
  // Transfer mint authority to multisig
  await setTokenAuthorityMultiSig({
    mint: tokenMint,
    authority: 'mint',
    multisig: multisigAddress,
  })
  ```

- [ ] Multi-sig controlled operations:
  - [ ] Token minting
  - [ ] Authority transfers
  - [ ] Metadata updates
  - [ ] Collection management
  - [ ] Staking pool management
  - [ ] Treasury withdrawals

### 19.5 TypeScript SDK for Multi-Sig

```ts
// Create multi-sig
const ms = await tokens.multisig.create({
  owners: [alice, bob, charlie],
  threshold: 2,
})

// Propose minting tokens
const proposal = await tokens.multisig.propose(ms, {
  action: 'mint',
  params: { mint: tokenMint, amount: 1000000, to: treasury },
})

// Other owners approve
await tokens.multisig.approve(proposal) // As bob
await tokens.multisig.approve(proposal) // As charlie
// Auto-executes after 2nd approval

// Query pending transactions
const pending = await tokens.multisig.pending(ms)

// Get multi-sig info
const info = await tokens.multisig.info(ms)
// { owners: [...], threshold: 2, pendingTxs: 3 }
```

### 19.6 CLI Commands for Multi-Sig

- [ ] `tokens multisig create` - Create multi-sig (interactive)
- [ ] `tokens multisig info <address>` - Show multi-sig info
- [ ] `tokens multisig owners <address>` - List owners
- [ ] `tokens multisig propose <multisig>` - Propose transaction
- [ ] `tokens multisig approve <tx>` - Approve transaction
- [ ] `tokens multisig reject <tx>` - Reject transaction
- [ ] `tokens multisig execute <tx>` - Execute approved tx
- [ ] `tokens multisig pending <multisig>` - List pending txs
- [ ] `tokens multisig history <multisig>` - Transaction history

---

## Phase 20: Programmable NFTs (pNFTs)

> **Goal**: Implement programmable NFTs with rule-based transfer restrictions, enabling royalty enforcement, soulbound tokens, and custom transfer logic.

### 20.1 pNFT Program Design

- [ ] Create `src/programs/pnft/` directory
- [ ] Design rule engine for transfer validation
- [ ] Support composable rules (AND/OR logic)
- [ ] Maintain compatibility with standard NFT operations

### 20.2 Rule Types

```rust
┌─────────────────────────────────────────────────────────────┐
│ TransferRule Types                                          │
├─────────────────────────────────────────────────────────────┤
│ RoyaltyEnforcement    // Must pay royalties to transfer     │
│ Soulbound             // Cannot be transferred              │
│ TimeLock              // Cannot transfer until date         │
│ AllowList             // Only transfer to approved addresses│
│ DenyList              // Cannot transfer to blocked addrs   │
│ ProgramGate           // Require specific program in tx     │
│ HolderGate            // Recipient must hold specific token │
│ CreatorApproval       // Creator must co-sign transfer      │
│ CooldownPeriod        // Minimum time between transfers     │
│ MaxTransfers          // Maximum lifetime transfers         │
│ Custom                // Custom program for validation      │
└─────────────────────────────────────────────────────────────┘
```

- [ ] Implement each rule type
- [ ] Design rule composition (multiple rules per NFT)
- [ ] Implement rule inheritance from collection

### 20.3 pNFT Account Structure

```rust
┌─────────────────────────────────────────────────────────────┐
│ ProgrammableNFT Account                                     │
├─────────────────────────────────────────────────────────────┤
│ mint: Pubkey                // NFT mint                     │
│ rules: Vec<TransferRule>    // Active rules                 │
│ rule_set: Option<Pubkey>    // Shared rule set (collection) │
│ delegate: Option<Pubkey>    // Transfer delegate            │
│ state: NFTState             // Unlocked/Listed/Staked       │
│ last_transfer: i64          // For cooldown tracking        │
│ transfer_count: u32         // For max transfer tracking    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RuleSet Account (Collection-level rules)                    │
├─────────────────────────────────────────────────────────────┤
│ authority: Pubkey           // Who can update rules         │
│ rules: Vec<TransferRule>    // Default rules for collection │
│ is_mutable: bool            // Can rules be changed         │
└─────────────────────────────────────────────────────────────┘
```

### 20.4 pNFT Instructions

#### Creation

- [ ] `create_pnft` - Create programmable NFT

  ```ts
  await createPNFT({
    name: 'My pNFT',
    uri: 'https://...',
    rules: [
      { type: 'royalty_enforcement', royalty: 5 },
      { type: 'cooldown', period: 24 * 60 * 60 }, // 24 hours
    ],
  })
  ```

- [ ] `create_rule_set` - Create shared rule set for collection

  ```ts
  await createRuleSet({
    collection: collectionMint,
    rules: [
      { type: 'royalty_enforcement', royalty: 5 },
      { type: 'deny_list', addresses: [knownScammer] },
    ],
  })
  ```

#### Rule Management

- [ ] `add_rule` - Add rule to NFT or rule set
- [ ] `remove_rule` - Remove rule
- [ ] `update_rule` - Update rule parameters
- [ ] `freeze_rules` - Make rules immutable

#### Transfers

- [ ] `transfer_pnft` - Transfer with rule validation

  ```ts
  await transferPNFT({
    mint: pnftMint,
    to: recipient,
    // Automatically validates all rules
    // Automatically pays royalties if required
  })
  ```

- [ ] `delegate_transfer` - Delegate transfer authority
- [ ] `revoke_delegate` - Revoke delegation

#### State Management

- [ ] `lock_pnft` - Lock NFT (for staking, listing, etc.)
- [ ] `unlock_pnft` - Unlock NFT
- [ ] State transitions: `Unlocked` ↔ `Listed` ↔ `Staked`

### 20.5 Royalty Enforcement

- [ ] Implement on-chain royalty payment validation
- [ ] Support multiple royalty recipients (creator splits)
- [ ] Calculate royalty based on sale price
- [ ] Integrate with marketplace escrow patterns
- [ ] Provide royalty bypass for specific programs (bridges, etc.)

### 20.6 Soulbound Tokens (SBTs)

- [ ] `create_soulbound` - Create non-transferable NFT

  ```ts
  await createSoulbound({
    name: 'Achievement Badge',
    uri: 'https://...',
    recipient: userAddress,
    // Automatically adds Soulbound rule
  })
  ```

- [ ] Support "recoverable" soulbound (issuer can reassign)
- [ ] Support "burnable" soulbound (holder can destroy)
- [ ] Use cases: credentials, achievements, memberships

### 20.7 TypeScript SDK for pNFTs

```ts
// Create pNFT with rules
const pnft = await tokens.pnft.create({
  name: 'Programmable NFT',
  rules: [
    tokens.pnft.rules.royalty(5), // 5% royalty
    tokens.pnft.rules.cooldown('24h'),
    tokens.pnft.rules.holderGate(membershipToken),
  ],
})

// Create soulbound
const sbt = await tokens.pnft.createSoulbound({
  name: 'Verified Member',
  to: userAddress,
  recoverable: true, // Issuer can reassign
})

// Transfer (validates rules automatically)
await tokens.pnft.transfer(pnft, {
  to: buyer,
  salePrice: 10, // SOL - for royalty calculation
})

// Check if transfer is allowed
const canTransfer = await tokens.pnft.canTransfer(pnft, {
  to: recipient,
})
// { allowed: false, reason: 'Cooldown period active (23h remaining)' }

// Get NFT rules
const rules = await tokens.pnft.rules(pnft)
```

### 20.8 CLI Commands for pNFTs

- [ ] `tokens pnft create` - Create programmable NFT
- [ ] `tokens pnft rules <mint>` - Show NFT rules
- [ ] `tokens pnft add-rule <mint> <rule>` - Add rule
- [ ] `tokens pnft remove-rule <mint> <rule>` - Remove rule
- [ ] `tokens pnft transfer <mint> <to>` - Transfer with validation
- [ ] `tokens pnft can-transfer <mint> <to>` - Check if transfer allowed
- [ ] `tokens sbt create` - Create soulbound token
- [ ] `tokens sbt recover <mint> <new-owner>` - Recover soulbound

---

## Phase 21: ts-governance - DAO & Governance Package

> **Goal**: Create a separate core package `ts-governance` for DAO governance, voting, and token-based decision making. This is a standalone package that integrates with `ts-tokens`.

### 21.1 Package Setup

- [ ] Create `packages/ts-governance/` directory in monorepo
- [ ] Set up package.json:

  ```json
  {
    "name": "ts-governance",
    "description": "TypeScript SDK for DAO governance and voting on Solana",
    "dependencies": {
      "@solana/web3.js": "...",
      "ts-tokens": "workspace:*"
    }
  }
  ```

- [ ] Create directory structure:

  ```
  packages/ts-governance/
  ├── src/
  │   ├── programs/           # On-chain programs
  │   │   ├── governance/     # Core governance program
  │   │   └── voting/         # Voting mechanisms
  │   ├── dao/                # DAO management
  │   ├── proposals/          # Proposal system
  │   ├── voting/             # Voting logic
  │   ├── treasury/           # Treasury management
  │   ├── delegation/         # Vote delegation
  │   └── types/              # TypeScript types
  ├── bin/
  │   └── cli.ts              # CLI entry point
  └── package.json
  ```

### 21.2 Governance Program Design

- [ ] Create `src/programs/governance/` directory
- [ ] Design principles:
  - [ ] Token-weighted voting (1 token = 1 vote)
  - [ ] NFT-based voting (1 NFT = 1 vote or trait-weighted)
  - [ ] Quadratic voting option
  - [ ] Time-weighted voting (longer holders = more weight)
  - [ ] Delegation support
  - [ ] Proposal lifecycle management

### 21.3 Account Structures

```rust
┌─────────────────────────────────────────────────────────────┐
│ DAO Account                                                 │
├─────────────────────────────────────────────────────────────┤
│ name: String[32]            // DAO name                     │
│ governance_token: Pubkey    // Token for voting power       │
│ treasury: Pubkey            // Treasury account             │
│ config: GovernanceConfig    // Voting parameters            │
│ proposal_count: u64         // Total proposals created      │
│ total_voting_power: u64     // Snapshot of total power      │
│ authority: Pubkey           // Admin (can be multisig)      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ GovernanceConfig                                            │
├─────────────────────────────────────────────────────────────┤
│ voting_period: i64          // How long voting lasts        │
│ quorum_percentage: u8       // Min participation (e.g., 10%)│
│ approval_threshold: u8      // Min yes votes (e.g., 51%)    │
│ proposal_threshold: u64     // Min tokens to propose        │
│ execution_delay: i64        // Timelock after approval      │
│ vote_weight_type: VoteWeight // Token/NFT/Quadratic        │
│ allow_early_execution: bool // Execute before period ends   │
│ allow_vote_change: bool     // Can voters change vote       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Proposal Account                                            │
├─────────────────────────────────────────────────────────────┤
│ dao: Pubkey                 // Parent DAO                   │
│ proposer: Pubkey            // Who created proposal         │
│ title: String[64]           // Proposal title               │
│ description_uri: String     // IPFS/Arweave link to details │
│ instructions: Vec<Instruction> // On-chain actions         │
│ status: ProposalStatus      // Draft/Active/Passed/Failed   │
│ votes_for: u64              // Total yes votes              │
│ votes_against: u64          // Total no votes               │
│ votes_abstain: u64          // Total abstain votes          │
│ start_time: i64             // Voting start                 │
│ end_time: i64               // Voting end                   │
│ executed_at: Option<i64>    // When executed (if passed)    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VoteRecord Account                                          │
├─────────────────────────────────────────────────────────────┤
│ proposal: Pubkey            // Which proposal               │
│ voter: Pubkey               // Who voted                    │
│ vote: Vote                  // For/Against/Abstain          │
│ weight: u64                 // Voting power used            │
│ timestamp: i64              // When voted                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VoteDelegation Account                                      │
├─────────────────────────────────────────────────────────────┤
│ delegator: Pubkey           // Who is delegating            │
│ delegate: Pubkey            // Who receives the power       │
│ dao: Pubkey                 // Which DAO                    │
│ amount: u64                 // Delegated voting power       │
│ expires_at: Option<i64>     // Optional expiry              │
└─────────────────────────────────────────────────────────────┘
```

### 21.4 DAO Instructions

#### DAO Management

- [ ] `create_dao` - Create new DAO

  ```ts
  const dao = await votes.dao.create({
    name: 'My DAO',
    governanceToken: tokenMint,
    config: {
      votingPeriod: '7 days',
      quorum: 10, // 10% participation required
      approvalThreshold: 51, // 51% yes to pass
      proposalThreshold: 10000, // Min tokens to propose
      executionDelay: '2 days', // Timelock
    },
  })
  ```

- [ ] `update_dao_config` - Update governance parameters (via proposal)
- [ ] `set_dao_authority` - Transfer admin (via proposal)

#### Proposals

- [ ] `create_proposal` - Create new proposal

  ```ts
  const proposal = await votes.proposal.create({
    dao: daoAddress,
    title: 'Increase staking rewards',
    description: 'ipfs://Qm...', // Detailed description
    instructions: [
      // On-chain actions to execute if passed
      updateStakingRewardsInstruction,
    ],
  })
  ```

- [ ] `cancel_proposal` - Cancel (proposer or admin only)
- [ ] `execute_proposal` - Execute passed proposal

#### Voting

- [ ] `cast_vote` - Vote on proposal

  ```ts
  await votes.vote.cast({
    proposal: proposalAddress,
    vote: 'for', // 'for' | 'against' | 'abstain'
  })
  // Automatically calculates voting power from token balance
  ```

- [ ] `change_vote` - Change vote (if allowed)
- [ ] `withdraw_vote` - Remove vote (if allowed)

#### Delegation

- [ ] `delegate_votes` - Delegate voting power

  ```ts
  await votes.delegate({
    dao: daoAddress,
    to: delegateAddress,
    amount: 50000, // Or 'all'
    expires: '30 days', // Optional
  })
  ```

- [ ] `undelegate` - Remove delegation
- [ ] `accept_delegation` - Delegate accepts (optional)

### 21.5 Voting Mechanisms

#### Token-Weighted Voting

- [ ] 1 token = 1 vote (standard)
- [ ] Snapshot voting power at proposal creation
- [ ] Prevent double-voting with token transfers

#### NFT-Based Voting

- [ ] 1 NFT = 1 vote
- [ ] Trait-weighted voting (rare NFTs = more votes)
- [ ] Collection-gated DAOs

#### Quadratic Voting

- [ ] Vote weight = √(tokens)
- [ ] Reduces plutocracy
- [ ] Configurable per DAO

#### Time-Weighted Voting

- [ ] Longer holders get more weight
- [ ] Incentivizes long-term alignment
- [ ] Configurable decay/growth curves

### 21.6 Treasury Management

- [ ] Create `src/treasury/` directory
- [ ] `create_treasury` - Create DAO treasury

  ```ts
  const treasury = await votes.treasury.create({
    dao: daoAddress,
    // Treasury is controlled by DAO governance
  })
  ```

- [ ] `deposit_to_treasury` - Anyone can deposit
- [ ] `withdraw_from_treasury` - Only via passed proposal
- [ ] Support multiple token types in treasury
- [ ] Treasury spending proposals with limits

### 21.7 TypeScript SDK for ts-governance

```ts
import { votes } from 'ts-governance'

// Create DAO
const dao = await votes.dao.create({
  name: 'My Project DAO',
  token: governanceToken,
  config: {
    votingPeriod: '5 days',
    quorum: 10,
    approvalThreshold: 66,
  },
})

// Create proposal
const proposal = await votes.proposal.create({
  dao,
  title: 'Fund marketing campaign',
  description: 'ipfs://...',
  actions: [
    votes.actions.transferFromTreasury({
      to: marketingWallet,
      amount: 50000,
      token: usdcMint,
    }),
  ],
})

// Vote
await votes.vote(proposal, 'for')

// Check proposal status
const status = await votes.proposal.status(proposal)
// {
//   status: 'active',
//   votesFor: 150000,
//   votesAgainst: 30000,
//   quorumReached: true,
//   passingThreshold: true,
//   timeRemaining: '2 days',
// }

// Delegate votes
await votes.delegate(dao, {
  to: trustedDelegate,
  amount: 'all',
})

// Get voting power
const power = await votes.votingPower(dao, wallet)
// { own: 50000, delegated: 25000, total: 75000 }

// Get DAO info
const info = await votes.dao.info(dao)
// { name, token, treasury, proposalCount, config, ... }
```

### 21.8 CLI for ts-governance

- [ ] Create `packages/ts-governance/bin/cli.ts`
- [ ] `votes dao create` - Create DAO (interactive)
- [ ] `votes dao info <address>` - Show DAO info
- [ ] `votes dao config <address>` - Show/update config
- [ ] `votes proposal create <dao>` - Create proposal
- [ ] `votes proposal list <dao>` - List proposals
- [ ] `votes proposal info <address>` - Show proposal details
- [ ] `votes proposal vote <address> <for|against|abstain>` - Vote
- [ ] `votes proposal execute <address>` - Execute passed proposal
- [ ] `votes delegate <dao> <to> [amount]` - Delegate votes
- [ ] `votes undelegate <dao>` - Remove delegation
- [ ] `votes power <dao>` - Show your voting power
- [ ] `votes treasury info <dao>` - Show treasury balance
- [ ] `votes treasury deposit <dao> <amount>` - Deposit to treasury

### 21.9 React Components for ts-governance

- [ ] Create `packages/ts-governance-react/` package
- [ ] `<DAOProvider>` - DAO context provider
- [ ] `<ProposalList>` - List of proposals
- [ ] `<ProposalCard>` - Single proposal display
- [ ] `<ProposalDetails>` - Full proposal view
- [ ] `<VoteButton>` - Vote for/against/abstain
- [ ] `<VotingPower>` - Display user's voting power
- [ ] `<DelegateForm>` - Delegate votes UI
- [ ] `<TreasuryBalance>` - Show treasury holdings
- [ ] `<CreateProposalForm>` - Proposal creation wizard
- [ ] `<GovernanceStats>` - DAO statistics

### 21.10 Vue Components for ts-governance

- [ ] Create `packages/ts-governance-vue/` package
- [ ] Same components as React, Vue 3 syntax

### 21.11 Integration with ts-tokens

- [ ] Seamless token balance → voting power
- [ ] Staked tokens can vote (optional config)
- [ ] NFT collection → DAO membership
- [ ] Multi-sig as DAO admin
- [ ] Treasury uses ts-tokens for transfers

### 21.12 Documentation for ts-governance

- [ ] Create `docs/ts-governance/` directory
- [ ] `docs/ts-governance/overview.md` - What is ts-governance
- [ ] `docs/ts-governance/quickstart.md` - Create your first DAO
- [ ] `docs/ts-governance/dao.md` - DAO configuration
- [ ] `docs/ts-governance/proposals.md` - Proposal lifecycle
- [ ] `docs/ts-governance/voting.md` - Voting mechanisms
- [ ] `docs/ts-governance/delegation.md` - Vote delegation
- [ ] `docs/ts-governance/treasury.md` - Treasury management
- [ ] `docs/ts-governance/cli.md` - CLI reference
- [ ] `docs/ts-governance/components.md` - React/Vue components

---

## Phase 22: Developer Experience Enhancements

> **Goal**: Make ts-tokens the most developer-friendly token library with exceptional error messages, debugging tools, and productivity features.

### 22.1 Error Handling & Messages

- [ ] Create custom error classes with actionable messages:

  ```ts
  class InsufficientBalanceError extends TokenError {
    constructor(required: number, available: number, mint: string) {
      super(`Insufficient balance: need ${required}, have ${available}`)
      this.suggestion = `Fund your wallet or reduce the amount`
      this.docsLink = 'https://docs.ts-tokens.dev/errors/insufficient-balance'
    }
  }
  ```

- [ ] Include transaction simulation errors with decoded reasons
- [ ] Add "Did you mean?" suggestions for common mistakes
- [ ] Link to relevant documentation in error messages
- [ ] Provide fix commands where applicable (`tokens fix <error-code>`)

### 22.2 TypeScript Developer Experience

- [ ] Full JSDoc comments on all public APIs
- [ ] Inline examples in JSDoc
- [ ] Strict TypeScript with no `any` types
- [ ] Discriminated unions for result types
- [ ] Builder pattern for complex configurations:

  ```ts
  const cm = await CandyMachine.builder()
    .name('My Collection')
    .items(10000)
    .price(1.5)
    .startDate(new Date('2025-01-01'))
    .addGuard('allowList', merkleRoot)
    .addGuard('mintLimit', 3)
    .build()
  ```

### 22.3 Debugging Tools

- [ ] `tokens debug tx <signature>` - Detailed transaction analysis
- [ ] `tokens debug account <address>` - Account state inspector
- [ ] `tokens debug simulate <instruction>` - Simulate any instruction
- [ ] Transaction trace logging (opt-in verbose mode)
- [ ] Visual transaction builder (web UI)
- [ ] Account diff viewer (before/after transaction)

### 22.4 IDE Integration

- [ ] VS Code extension for ts-tokens:
  - [ ] Syntax highlighting for token configs
  - [ ] Autocomplete for addresses and mints
  - [ ] Inline balance/metadata previews
  - [ ] Quick actions (mint, transfer, burn)
  - [ ] Transaction history sidebar
- [ ] Code snippets for common operations
- [ ] Problem matchers for CLI output

### 22.5 Local Development

- [ ] `tokens dev` - Start local validator with pre-funded wallet
- [ ] `tokens dev:reset` - Reset local state
- [ ] `tokens dev:fund <address>` - Fund address on local
- [ ] `tokens dev:time <timestamp>` - Warp validator time (for testing guards)
- [ ] Auto-reload on config changes
- [ ] Hot module replacement for React/Vue components

### 22.6 Logging & Observability

- [ ] Structured logging (JSON format option)
- [ ] Log levels (debug, info, warn, error)
- [ ] Request/response logging for RPC calls
- [ ] Performance timing for operations
- [ ] OpenTelemetry integration (optional)

---

## Phase 23: Performance Optimization

> **Goal**: Ensure ts-tokens is the fastest token library with minimal RPC calls and optimized transactions.

### 23.1 RPC Optimization

- [ ] Batch RPC calls with `getMultipleAccounts`
- [ ] Implement request deduplication
- [ ] Add response caching with TTL
- [ ] Prefetch related accounts
- [ ] Connection pooling for high-throughput

### 23.2 Transaction Optimization

- [ ] Automatic compute unit estimation
- [ ] Priority fee optimization (dynamic based on network)
- [ ] Transaction packing (combine multiple ops)
- [ ] Lookup tables for common accounts
- [ ] Parallel transaction sending

### 23.3 Bundle Size

- [ ] Tree-shakeable exports
- [ ] Lazy loading for optional features
- [ ] Separate entry points for Node/Browser
- [ ] Minimize dependencies (already zero-dep philosophy)
- [ ] Bundle size monitoring in CI

### 23.4 Caching Strategy

- [ ] In-memory cache for account data
- [ ] Persistent cache option (localStorage/IndexedDB)
- [ ] Cache invalidation on transaction confirmation
- [ ] Configurable cache TTL per data type

---

## Phase 24: Internationalization & Accessibility

### 24.1 Internationalization (i18n)

- [ ] Extract all user-facing strings
- [ ] Create translation files (en, es, zh, ja, ko, etc.)
- [ ] CLI language selection (`tokens config set language es`)
- [ ] Component prop for language override
- [ ] Number/date formatting per locale

### 24.2 Accessibility (a11y)

- [ ] WCAG 2.1 AA compliance for all components
- [ ] Keyboard navigation support
- [ ] Screen reader announcements for transactions
- [ ] High contrast mode support
- [ ] Reduced motion support

---

## Phase 25: Ecosystem Integrations

### 25.1 Wallet Integrations

- [ ] Phantom deep linking
- [ ] Solflare deep linking
- [ ] Backpack integration
- [ ] Ledger hardware wallet
- [ ] Trezor hardware wallet
- [ ] Mobile wallet adapters (Solana Mobile)

### 25.2 DeFi Integrations

- [ ] Jupiter swap integration (for token payments)
- [ ] Raydium pool creation helpers
- [ ] Orca whirlpool integration
- [ ] Marinade staking integration
- [ ] Token lending protocol helpers

### 25.3 Marketplace Integrations

- [ ] Magic Eden listing helpers
- [ ] Tensor listing helpers
- [ ] OpenSea (if Solana support)
- [ ] Marketplace royalty verification
- [ ] Cross-marketplace listing

### 25.4 Infrastructure Integrations

- [ ] Helius DAS API integration
- [ ] Helius webhooks
- [ ] QuickNode add-ons
- [ ] Triton RPC optimization
- [ ] Shyft API integration
- [ ] Hello Moon analytics

---

## Recommended Implementation Order

> Suggested order for tackling phases based on dependencies and value delivery.

### Sprint 1: Foundation (Weeks 1-2)

1. Phase 1.1-1.4: Project restructuring, config, types
2. Phase 1.5-1.8: Dependencies, storage drivers, base58
3. Phase 2: Core Solana integration

### Sprint 2: Core Features (Weeks 3-4)

4. Phase 3: Fungible token support
5. Phase 4.1-4.5: Basic NFT support
6. Phase 5.1-5.5: Core CLI commands

### Sprint 3: NFT Drops (Weeks 5-6)

7. Phase 4.6-4.12: Candy Machine, compressed NFTs, editions
8. Phase 5.6-5.9: NFT CLI commands
9. Phase 16.4: Legacy Metaplex collection management

### Sprint 4: Security & Polish (Weeks 7-8)

10. Phase 11: Security & best practices
11. Phase 9: Testing
12. Phase 22: Developer experience

### Sprint 5: Components (Weeks 9-10)

13. Phase 6: React components
14. Phase 7: Vue components
15. Phase 8: Documentation

### Sprint 6: Advanced Features (Weeks 11-12)

16. Phase 12: Token-2022 extensions
17. Phase 17: Simple NFT standard
18. Phase 18: Staking

### Sprint 7: Governance & Multi-sig (Weeks 13-14)

19. Phase 19: Multi-sig
20. Phase 20: Programmable NFTs
21. Phase 21: ts-governance package

### Sprint 8: Release (Week 15)

22. Phase 10: Release & distribution
23. Phase 23: Performance optimization
24. Phase 25: Ecosystem integrations

---

## Notes

- **Priority**: Solana support is the primary focus. All other chains are future considerations.
- **Metaplex Compatibility**: Aim for full compatibility with Metaplex standards and tooling.
- **Testing**: Always test on devnet before mainnet operations.
- **Security**: Never commit private keys. Use environment variables or secure key management.
- **Documentation**: Keep docs updated as features are implemented.
- **Zero Dependencies**: Maintain the zero-dependency philosophy beyond official Solana packages.
- **DX First**: Developer experience is a competitive advantage—prioritize clear APIs and helpful errors.

---

*Last updated: December 2025*
