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

---

## Phase 1: Foundation & Architecture

### 1.1 Project Restructuring

- [ ] Remove existing QR/Barcode code from `packages/ts-tokens/src/` (this is legacy code from a different project)
- [ ] Update root `README.md` to reflect new blockchain token focus
- [ ] Update `package.json` description and keywords for blockchain tokens
- [ ] Create new project architecture diagram in docs

### 1.2 Configuration System

- [ ] Rename config name from `tokenx` to `tokens` in `src/config.ts`
- [ ] Define comprehensive `TokenConfig` interface in `src/types.ts`:
  - [ ] `chain`: Current active chain (default: `'solana'`)
  - [ ] `network`: Network environment (`'mainnet-beta'` | `'devnet'` | `'testnet'` | `'localnet'`)
  - [ ] `rpcUrl`: Custom RPC endpoint (optional)
  - [ ] `commitment`: Solana commitment level (`'processed'` | `'confirmed'` | `'finalized'`)
  - [ ] `wallet`: Wallet configuration (keypair path or adapter)
  - [ ] `verbose`: Logging verbosity
  - [ ] `dryRun`: Simulate transactions without executing
  - [ ] `confirmOptions`: Transaction confirmation options
  - [ ] `ipfsGateway`: IPFS gateway URL for metadata
  - [ ] `arweaveGateway`: Arweave gateway URL for metadata
  - [ ] `storageProvider`: Default storage provider (`'ipfs'` | `'arweave'` | `'nft.storage'` | `'shadow-drive'`)

### 1.3 Driver/Adapter Architecture

- [ ] Create `src/drivers/` directory for chain-specific implementations
- [ ] Define `ChainDriver` interface in `src/types/driver.ts`:

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

- [ ] Create `src/drivers/solana/` directory structure
- [ ] Create driver registry/factory in `src/drivers/index.ts`
- [ ] Implement driver auto-detection from config

### 1.4 Core Types Definition

- [ ] Create `src/types/` directory with organized type files:
  - [ ] `src/types/index.ts` - Main export file
  - [ ] `src/types/config.ts` - Configuration types
  - [ ] `src/types/driver.ts` - Driver interface types
  - [ ] `src/types/token.ts` - Fungible token types
  - [ ] `src/types/nft.ts` - NFT and collection types
  - [ ] `src/types/metadata.ts` - Metadata standard types
  - [ ] `src/types/transaction.ts` - Transaction types
  - [ ] `src/types/wallet.ts` - Wallet types
  - [ ] `src/types/storage.ts` - Storage provider types

### 1.5 Dependency Setup (Zero External Dependencies Philosophy)

> **Goal**: Compete with Metaplex by having ZERO dependencies beyond official Solana packages. We implement everything ourselves using raw Solana program instructions, not Metaplex SDKs.

#### Official Solana Dependencies (Only These)

- [ ] Add to `packages/ts-tokens/package.json`:
  - [ ] `@solana/web3.js` - Core Solana SDK (official, required)
  - [ ] `@solana/spl-token` - SPL Token program client (official, required)

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

- [ ] Create `ArweaveStorageAdapter` implementing `StorageAdapter` interface
- [ ] Implement direct Arweave HTTP API calls (no `@irys/sdk`):
  - [ ] `POST /tx` - Submit transaction
  - [ ] `GET /tx/{id}/data` - Retrieve data
  - [ ] `GET /price/{bytes}` - Get upload price
  - [ ] `GET /{id}` - Get transaction status
- [ ] Implement Arweave transaction signing with Solana keypair (cross-chain signing)
- [ ] Implement chunked uploads for large files (>100KB)
- [ ] Implement bundle transactions for batch uploads (ANS-104 spec)
- [ ] Add gateway URL configuration (arweave.net, ar-io.net, etc.)
- [ ] Implement `publicUrl()` returning `https://arweave.net/{txId}`
- [ ] Add retry logic with exponential backoff

#### IPFS Driver

- [ ] Create `IPFSStorageAdapter` implementing `StorageAdapter` interface
- [ ] Implement direct IPFS HTTP API calls (no `nft.storage` SDK):
  - [ ] `POST /api/v0/add` - Add file to IPFS
  - [ ] `POST /api/v0/cat` - Retrieve file
  - [ ] `POST /api/v0/pin/add` - Pin content
  - [ ] `POST /api/v0/pin/rm` - Unpin content
- [ ] Support multiple IPFS providers via config:
  - [ ] Local IPFS node (`localhost:5001`)
  - [ ] Pinata API (`api.pinata.cloud`)
  - [ ] NFT.Storage API (`api.nft.storage`) - direct HTTP, no SDK
  - [ ] Web3.Storage API (`api.web3.storage`)
  - [ ] Infura IPFS (`ipfs.infura.io`)
- [ ] Implement `publicUrl()` returning configurable gateway URL
- [ ] Add CID v0/v1 support
- [ ] Implement directory uploads (CAR files)

#### Shadow Drive Driver (Solana-Native)

- [ ] Create `ShadowDriveStorageAdapter` implementing `StorageAdapter` interface
- [ ] Implement direct Shadow Drive program instructions (no `@shadow-drive/sdk`):
  - [ ] `initializeAccount` - Create storage account
  - [ ] `uploadFile` - Upload file to account
  - [ ] `deleteFile` - Delete file
  - [ ] `editFile` - Replace file contents
  - [ ] `addStorage` - Increase storage capacity
  - [ ] `reduceStorage` - Decrease storage (get SOL back)
  - [ ] `claimStake` - Claim staked SOL
- [ ] Shadow Drive Program ID: `2e1wdyNhUvE76y6yUCvah2KaviavMJYKoRun8acMRBZZ`
- [ ] Implement SHDW token payment handling
- [ ] Implement `publicUrl()` returning `https://shdw-drive.genesysgo.net/{account}/{filename}`
- [ ] Add storage account management utilities

#### Local/Filesystem Driver (Development)

- [ ] Ensure existing local driver in `@stacksjs/storage` works for dev/testing
- [ ] Add mock URLs for local development (`file://` or `http://localhost`)

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

- [ ] Create `src/programs/token-metadata/` directory
- [ ] Program ID: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
- [ ] Implement instruction builders:
  - [ ] `createMetadataAccountV3` - Create metadata for token
  - [ ] `updateMetadataAccountV2` - Update metadata
  - [ ] `createMasterEditionV3` - Create master edition
  - [ ] `mintNewEditionFromMasterEditionViaToken` - Print editions
  - [ ] `verifyCollection` - Verify NFT in collection
  - [ ] `unverifyCollection` - Remove collection verification
  - [ ] `setAndVerifyCollection` - Set and verify in one tx
  - [ ] `verifyCreator` - Verify creator signature
  - [ ] `verifySizedCollectionItem` - Verify sized collection
  - [ ] `burnNft` - Burn NFT with metadata
  - [ ] `burnEditionNft` - Burn edition
- [ ] Implement account deserializers:
  - [ ] `Metadata` account parsing
  - [ ] `MasterEdition` account parsing
  - [ ] `Edition` account parsing
  - [ ] `CollectionAuthorityRecord` parsing
- [ ] Implement PDA derivation functions:
  - [ ] `findMetadataPda(mint)`
  - [ ] `findMasterEditionPda(mint)`
  - [ ] `findEditionPda(mint)`
  - [ ] `findCollectionAuthorityPda(mint, authority)`

#### Candy Machine v3 Program (Replace `mpl-candy-machine`)

- [ ] Create `src/programs/candy-machine/` directory
- [ ] Program ID: `CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR`
- [ ] Implement instruction builders:
  - [ ] `initializeCandyMachine` - Create new CM
  - [ ] `addConfigLines` - Add NFT config lines
  - [ ] `updateCandyMachine` - Update CM settings
  - [ ] `setCandyMachineAuthority` - Transfer authority
  - [ ] `mintFromCandyMachine` - Mint NFT
  - [ ] `setMintAuthority` - Set mint authority
  - [ ] `withdraw` - Withdraw funds
- [ ] Implement Candy Guard program:
  - [ ] Program ID: `Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g`
  - [ ] `initialize` - Create guard
  - [ ] `update` - Update guards
  - [ ] `wrap` / `unwrap` - Wrap/unwrap CM with guard
  - [ ] `mint` - Mint with guard validation
- [ ] Implement all guard types as instruction builders:
  - [ ] `solPayment`, `tokenPayment`, `nftPayment`
  - [ ] `startDate`, `endDate`
  - [ ] `mintLimit`, `redeemedAmount`
  - [ ] `allowList` (Merkle proof validation)
  - [ ] `nftGate`, `tokenGate`
  - [ ] `addressGate`, `programGate`
  - [ ] `freezeSolPayment`, `freezeTokenPayment`
  - [ ] `allocation`, `token2022Payment`
- [ ] Implement account deserializers:
  - [ ] `CandyMachine` account parsing
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

- [ ] Create `src/utils/base58.ts` with ~20 lines of code:

  ```ts
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  export function encode(buffer: Uint8Array): string { /* ... */ }
  export function decode(str: string): Uint8Array { /* ... */ }
  ```

- [ ] Add comprehensive tests for encoding/decoding
- [ ] Ensure compatibility with Solana address format

---

## Phase 2: Core Library - Solana Integration

### 2.1 Connection Management

- [ ] Create `src/drivers/solana/connection.ts`:
  - [ ] `createConnection(config)` - Create RPC connection
  - [ ] `getConnection()` - Get cached connection
  - [ ] Connection pooling for multiple requests
  - [ ] Automatic retry logic with exponential backoff
  - [ ] RPC rate limiting handling
  - [ ] Health check functionality

### 2.2 Wallet Management

- [ ] Create `src/drivers/solana/wallet.ts`:
  - [ ] `loadKeypair(path)` - Load keypair from file
  - [ ] `loadKeypairFromEnv(envVar)` - Load from environment variable
  - [ ] `generateKeypair()` - Generate new keypair
  - [ ] `getPublicKey()` - Get current wallet public key
  - [ ] `signTransaction(tx)` - Sign transaction
  - [ ] `signAllTransactions(txs)` - Batch sign
- [ ] Create `src/wallet/adapter.ts` for browser wallet adapters:
  - [ ] Phantom adapter support
  - [ ] Solflare adapter support
  - [ ] Generic wallet adapter interface

### 2.3 Transaction Utilities

- [ ] Create `src/drivers/solana/transaction.ts`:
  - [ ] `buildTransaction(instructions)` - Build transaction from instructions
  - [ ] `sendTransaction(tx)` - Send and confirm transaction
  - [ ] `sendTransactionWithRetry(tx, retries)` - Retry on failure
  - [ ] `simulateTransaction(tx)` - Simulate without sending
  - [ ] `getTransactionStatus(signature)` - Check transaction status
  - [ ] `waitForConfirmation(signature)` - Wait for confirmation
  - [ ] Priority fee estimation and setting
  - [ ] Compute unit optimization

### 2.4 Account Utilities

- [ ] Create `src/drivers/solana/account.ts`:
  - [ ] `getAccountInfo(address)` - Fetch account info
  - [ ] `getMultipleAccounts(addresses)` - Batch fetch
  - [ ] `getTokenAccounts(owner)` - Get all token accounts for owner
  - [ ] `getNFTAccounts(owner)` - Get all NFT accounts for owner
  - [ ] `getBalance(address)` - Get SOL balance
  - [ ] `getTokenBalance(owner, mint)` - Get token balance

---

## Phase 3: Fungible Token Support

### 3.1 Token Creation

- [ ] Create `src/token/create.ts`:
  - [ ] `createToken(options)` - Create new SPL token
    - [ ] `name` - Token name
    - [ ] `symbol` - Token symbol (max 10 chars)
    - [ ] `decimals` - Decimal places (0-9)
    - [ ] `initialSupply` - Initial mint amount (optional)
    - [ ] `mintAuthority` - Mint authority pubkey
    - [ ] `freezeAuthority` - Freeze authority pubkey (optional)
    - [ ] `metadata` - Token metadata (name, symbol, uri)
  - [ ] `createTokenWithMetadata(options)` - Create with Metaplex metadata
  - [ ] Return token mint address and transaction signature

### 3.2 Token Minting

- [ ] Create `src/token/mint.ts`:
  - [ ] `mintTokens(options)` - Mint tokens to address
    - [ ] `mint` - Token mint address
    - [ ] `destination` - Recipient address
    - [ ] `amount` - Amount to mint (in base units)
    - [ ] `mintAuthority` - Authority signer
  - [ ] `mintToMultiple(options)` - Batch mint to multiple addresses
  - [ ] Validate mint authority before minting

### 3.3 Token Transfers

- [ ] Create `src/token/transfer.ts`:
  - [ ] `transferTokens(options)` - Transfer tokens
    - [ ] `mint` - Token mint address
    - [ ] `from` - Source token account or owner
    - [ ] `to` - Destination address
    - [ ] `amount` - Amount to transfer
  - [ ] `transferToMultiple(options)` - Batch transfer (airdrop)
  - [ ] Auto-create associated token accounts if needed

### 3.4 Token Burns

- [ ] Create `src/token/burn.ts`:
  - [ ] `burnTokens(options)` - Burn tokens
    - [ ] `mint` - Token mint address
    - [ ] `from` - Token account to burn from
    - [ ] `amount` - Amount to burn
  - [ ] `burnAll(mint, owner)` - Burn entire balance

### 3.5 Token Authority Management

- [ ] Create `src/token/authority.ts`:
  - [ ] `setMintAuthority(mint, newAuthority)` - Transfer mint authority
  - [ ] `revokeMintAuthority(mint)` - Revoke mint authority (make fixed supply)
  - [ ] `setFreezeAuthority(mint, newAuthority)` - Transfer freeze authority
  - [ ] `revokeFreezeAuthority(mint)` - Revoke freeze authority
  - [ ] `freezeAccount(mint, account)` - Freeze token account
  - [ ] `thawAccount(mint, account)` - Unfreeze token account

### 3.6 Token Account Management

- [ ] Create `src/token/account.ts`:
  - [ ] `getOrCreateAssociatedTokenAccount(owner, mint)` - Get or create ATA
  - [ ] `createTokenAccount(owner, mint)` - Create new token account
  - [ ] `closeTokenAccount(account)` - Close empty token account (reclaim SOL)
  - [ ] `getTokenAccountInfo(account)` - Get token account details

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

- [ ] Create `src/nft/collection.ts`:
  - [ ] `createCollection(options)` - Create NFT collection
    - [ ] `name` - Collection name
    - [ ] `symbol` - Collection symbol
    - [ ] `uri` - Collection metadata URI
    - [ ] `sellerFeeBasisPoints` - Royalty percentage (basis points)
    - [ ] `creators` - Creator shares array
    - [ ] `isMutable` - Whether metadata can be updated
  - [ ] `updateCollection(options)` - Update collection metadata
  - [ ] `verifyCollection(collection, nft)` - Verify NFT belongs to collection
  - [ ] `unverifyCollection(collection, nft)` - Remove collection verification

### 4.2 NFT Minting

- [ ] Create `src/nft/mint.ts`:
  - [ ] `mintNFT(options)` - Mint single NFT
    - [ ] `name` - NFT name
    - [ ] `symbol` - NFT symbol
    - [ ] `uri` - Metadata URI
    - [ ] `sellerFeeBasisPoints` - Royalty
    - [ ] `creators` - Creator array with shares
    - [ ] `collection` - Collection address (optional)
    - [ ] `isMutable` - Metadata mutability
    - [ ] `primarySaleHappened` - Primary sale flag
  - [ ] `mintNFTToCollection(options)` - Mint directly to collection
  - [ ] `mintCompressedNFT(options)` - Mint compressed NFT (cNFT)
  - [ ] Return mint address and transaction signature

### 4.3 NFT Transfers

- [ ] Create `src/nft/transfer.ts`:
  - [ ] `transferNFT(options)` - Transfer NFT
    - [ ] `mint` - NFT mint address
    - [ ] `from` - Current owner
    - [ ] `to` - New owner
  - [ ] `transferCompressedNFT(options)` - Transfer cNFT
  - [ ] Automatic ATA creation for recipient

### 4.4 NFT Burns

- [ ] Create `src/nft/burn.ts`:
  - [ ] `burnNFT(mint, owner)` - Burn NFT
  - [ ] `burnCompressedNFT(options)` - Burn cNFT
  - [ ] Reclaim rent from closed accounts

### 4.5 NFT Metadata Management

- [ ] Create `src/nft/metadata.ts`:
  - [ ] `updateNFTMetadata(options)` - Update NFT metadata
    - [ ] `mint` - NFT mint address
    - [ ] `name` - New name (optional)
    - [ ] `symbol` - New symbol (optional)
    - [ ] `uri` - New metadata URI (optional)
    - [ ] `sellerFeeBasisPoints` - New royalty (optional)
    - [ ] `creators` - New creators (optional)
  - [ ] `getNFTMetadata(mint)` - Fetch on-chain metadata
  - [ ] `fetchOffChainMetadata(uri)` - Fetch JSON metadata from URI
  - [ ] `verifyCreator(mint, creator)` - Verify creator signature
  - [ ] `unverifyCreator(mint, creator)` - Remove creator verification

### 4.6 Candy Machine (NFT Drops)

- [ ] Create `src/nft/candy-machine/` directory
- [ ] Create `src/nft/candy-machine/create.ts`:
  - [ ] `createCandyMachine(options)` - Create new Candy Machine
    - [ ] `itemsAvailable` - Total NFTs in collection
    - [ ] `sellerFeeBasisPoints` - Royalty
    - [ ] `symbol` - Collection symbol
    - [ ] `maxEditionSupply` - Max editions (0 for unique)
    - [ ] `isMutable` - Metadata mutability
    - [ ] `creators` - Creator array
    - [ ] `collection` - Collection NFT address
    - [ ] `configLineSettings` - Config line settings
    - [ ] `hiddenSettings` - Hidden settings (for reveals)
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

- [ ] Create `src/nft/candy-machine/items.ts`:
  - [ ] `addConfigLines(candyMachine, items)` - Add NFT config lines
    - [ ] `name` - NFT name (with index placeholder)
    - [ ] `uri` - Metadata URI (with index placeholder)
  - [ ] `addConfigLinesFromFile(candyMachine, filePath)` - Bulk add from JSON
  - [ ] `getLoadedItems(candyMachine)` - Get loaded item count
  - [ ] `getMintedItems(candyMachine)` - Get minted item count

### 4.9 Candy Machine Minting

- [ ] Create `src/nft/candy-machine/mint.ts`:
  - [ ] `mintFromCandyMachine(candyMachine, options)` - Mint NFT from CM
  - [ ] `mintWithGuard(candyMachine, guard, options)` - Mint with specific guard
  - [ ] `mintMultiple(candyMachine, count, options)` - Batch mint

### 4.10 NFT Queries

- [ ] Create `src/nft/query.ts`:
  - [ ] `getNFTsByOwner(owner)` - Get all NFTs owned by address
  - [ ] `getNFTsByCollection(collection)` - Get all NFTs in collection
  - [ ] `getNFTsByCreator(creator)` - Get all NFTs by creator
  - [ ] `getCollectionInfo(collection)` - Get collection details
  - [ ] `getCandyMachineInfo(candyMachine)` - Get CM details
  - [ ] `getCandyMachineItems(candyMachine)` - Get all CM items

### 4.11 Compressed NFTs (cNFTs)

- [ ] Create `src/nft/compressed/` directory
- [ ] Create `src/nft/compressed/tree.ts`:
  - [ ] `createMerkleTree(options)` - Create Merkle tree for cNFTs
    - [ ] `maxDepth` - Tree depth (determines capacity)
    - [ ] `maxBufferSize` - Concurrent update buffer
    - [ ] `canopyDepth` - Proof caching depth
  - [ ] `getMerkleTreeInfo(tree)` - Get tree info
  - [ ] `getTreeCapacity(tree)` - Get remaining capacity
- [ ] Create `src/nft/compressed/mint.ts`:
  - [ ] `mintCompressedNFT(tree, options)` - Mint cNFT to tree
  - [ ] `mintCompressedNFTBatch(tree, items)` - Batch mint cNFTs
- [ ] Create `src/nft/compressed/transfer.ts`:
  - [ ] `transferCompressedNFT(options)` - Transfer cNFT
  - [ ] `getAssetProof(assetId)` - Get proof for transfer
- [ ] Create `src/nft/compressed/query.ts`:
  - [ ] `getCompressedNFTsByOwner(owner)` - Get cNFTs by owner
  - [ ] `getCompressedNFTsByTree(tree)` - Get cNFTs in tree
  - [ ] `getCompressedNFTMetadata(assetId)` - Get cNFT metadata

### 4.12 Editions (Prints)

- [ ] Create `src/nft/editions.ts`:
  - [ ] `createMasterEdition(mint, maxSupply)` - Create master edition
  - [ ] `printEdition(masterMint, options)` - Print edition from master
  - [ ] `getEditionInfo(mint)` - Get edition info
  - [ ] `getEditionsByMaster(masterMint)` - Get all editions

---

## Phase 5: CLI Implementation

### 5.1 CLI Structure

- [ ] Restructure `bin/cli.ts` with proper command organization
- [ ] Create `src/cli/` directory for CLI-specific code
- [ ] Create `src/cli/commands/` for command implementations
- [ ] Create `src/cli/utils/` for CLI utilities
- [ ] Add colorful output with `chalk`
- [ ] Add spinners with `ora` for async operations
- [ ] Add interactive prompts with `inquirer`

### 5.2 Configuration Commands

- [ ] `tokens config init` - Initialize config file interactively
- [ ] `tokens config show` - Display current configuration
- [ ] `tokens config set <key> <value>` - Set config value
- [ ] `tokens config get <key>` - Get config value
- [ ] `tokens config network <network>` - Switch network (devnet/mainnet/etc)

### 5.3 Wallet Commands

- [ ] `tokens wallet generate` - Generate new keypair
- [ ] `tokens wallet import <path>` - Import keypair from file
- [ ] `tokens wallet show` - Show current wallet address
- [ ] `tokens wallet balance` - Show SOL balance
- [ ] `tokens wallet airdrop [amount]` - Request devnet airdrop

### 5.4 Fungible Token Commands

- [ ] `tokens create` - Create new fungible token (interactive)
  - [ ] `--name <name>` - Token name
  - [ ] `--symbol <symbol>` - Token symbol
  - [ ] `--decimals <n>` - Decimal places
  - [ ] `--supply <amount>` - Initial supply
  - [ ] `--metadata-uri <uri>` - Metadata URI
- [ ] `tokens mint <mint> <amount>` - Mint tokens
  - [ ] `--to <address>` - Recipient (default: self)
- [ ] `tokens transfer <mint> <amount> <to>` - Transfer tokens
- [ ] `tokens burn <mint> <amount>` - Burn tokens
- [ ] `tokens info <mint>` - Show token info
- [ ] `tokens balance <mint>` - Show token balance
- [ ] `tokens holders <mint>` - List token holders
- [ ] `tokens authority <mint>` - Manage authorities
  - [ ] `--revoke-mint` - Revoke mint authority
  - [ ] `--revoke-freeze` - Revoke freeze authority
  - [ ] `--transfer-mint <address>` - Transfer mint authority
  - [ ] `--transfer-freeze <address>` - Transfer freeze authority

### 5.5 NFT Commands

- [ ] `tokens nft create` - Create single NFT (interactive)
  - [ ] `--name <name>` - NFT name
  - [ ] `--symbol <symbol>` - Symbol
  - [ ] `--uri <uri>` - Metadata URI
  - [ ] `--royalty <bps>` - Royalty in basis points
  - [ ] `--collection <address>` - Collection address
- [ ] `tokens nft mint <uri>` - Mint NFT from metadata URI
- [ ] `tokens nft transfer <mint> <to>` - Transfer NFT
- [ ] `tokens nft burn <mint>` - Burn NFT
- [ ] `tokens nft info <mint>` - Show NFT info
- [ ] `tokens nft list [owner]` - List NFTs owned

### 5.6 Collection Commands

- [ ] `tokens collection create` - Create collection (interactive)
  - [ ] `--name <name>` - Collection name
  - [ ] `--symbol <symbol>` - Symbol
  - [ ] `--uri <uri>` - Metadata URI
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

- [ ] Set up `packages/react/` with proper React + TypeScript config
- [ ] Add peer dependencies: `react`, `react-dom`, `@solana/wallet-adapter-react`
- [ ] Create component library build configuration
- [ ] Set up Storybook for component development

### 6.2 Wallet Components

- [ ] `<WalletProvider>` - Wallet context provider
- [ ] `<WalletConnectButton>` - Connect wallet button
- [ ] `<WalletDisconnectButton>` - Disconnect button
- [ ] `<WalletMultiButton>` - Multi-wallet selector
- [ ] `<WalletAddress>` - Display wallet address (truncated)
- [ ] `<WalletBalance>` - Display SOL balance

### 6.3 Token Components

- [ ] `<TokenBalance mint={} />` - Display token balance
- [ ] `<TokenInfo mint={} />` - Display token info card
- [ ] `<TokenList owner={} />` - List all tokens owned
- [ ] `<TokenTransferForm mint={} />` - Token transfer form
- [ ] `<TokenMintForm mint={} />` - Token mint form (for authorities)

### 6.4 NFT Components

- [ ] `<NFTCard mint={} />` - NFT display card with image
- [ ] `<NFTGrid owner={} />` - Grid of owned NFTs
- [ ] `<NFTGallery collection={} />` - Collection gallery
- [ ] `<NFTDetails mint={} />` - Full NFT details view
- [ ] `<NFTTransferButton mint={} />` - Transfer NFT button
- [ ] `<NFTBurnButton mint={} />` - Burn NFT button

### 6.5 Candy Machine Components

- [ ] `<CandyMachineProvider>` - CM context provider
- [ ] `<MintButton candyMachine={} />` - Mint button
- [ ] `<MintCounter candyMachine={} />` - Minted/Total counter
- [ ] `<MintProgress candyMachine={} />` - Progress bar
- [ ] `<MintPrice candyMachine={} />` - Display mint price
- [ ] `<CountdownTimer date={} />` - Countdown to mint start
- [ ] `<AllowlistChecker candyMachine={} />` - Check allowlist status

### 6.6 Utility Components

- [ ] `<TransactionToast />` - Transaction notification toast
- [ ] `<ExplorerLink signature={} />` - Link to block explorer
- [ ] `<AddressDisplay address={} />` - Formatted address display
- [ ] `<SolAmount amount={} />` - Formatted SOL amount
- [ ] `<TokenAmount mint={} amount={} />` - Formatted token amount

### 6.7 Hooks

- [ ] `useWallet()` - Wallet state and methods
- [ ] `useConnection()` - Solana connection
- [ ] `useTokenBalance(mint)` - Token balance hook
- [ ] `useNFT(mint)` - NFT data hook
- [ ] `useNFTs(owner)` - All NFTs hook
- [ ] `useCandyMachine(address)` - CM state hook
- [ ] `useTransaction()` - Transaction sending hook
- [ ] `useTokenAccounts(owner)` - Token accounts hook

---

## Phase 7: Vue Components

### 7.1 Setup

- [ ] Set up `packages/vue/` with proper Vue 3 + TypeScript config
- [ ] Create composables for Solana integration
- [ ] Create component library build configuration
- [ ] Set up Histoire or Storybook for component development

### 7.2 Wallet Components

- [ ] `<WalletProvider>` - Wallet context provider
- [ ] `<WalletConnectButton>` - Connect wallet button
- [ ] `<WalletDisconnectButton>` - Disconnect button
- [ ] `<WalletMultiButton>` - Multi-wallet selector
- [ ] `<WalletAddress>` - Display wallet address
- [ ] `<WalletBalance>` - Display SOL balance

### 7.3 Token Components

- [ ] `<TokenBalance :mint="" />` - Display token balance
- [ ] `<TokenInfo :mint="" />` - Display token info card
- [ ] `<TokenList :owner="" />` - List all tokens owned
- [ ] `<TokenTransferForm :mint="" />` - Token transfer form
- [ ] `<TokenMintForm :mint="" />` - Token mint form

### 7.4 NFT Components

- [ ] `<NFTCard :mint="" />` - NFT display card
- [ ] `<NFTGrid :owner="" />` - Grid of owned NFTs
- [ ] `<NFTGallery :collection="" />` - Collection gallery
- [ ] `<NFTDetails :mint="" />` - Full NFT details
- [ ] `<NFTTransferButton :mint="" />` - Transfer button
- [ ] `<NFTBurnButton :mint="" />` - Burn button

### 7.5 Candy Machine Components

- [ ] `<CandyMachineProvider>` - CM context provider
- [ ] `<MintButton :candy-machine="" />` - Mint button
- [ ] `<MintCounter :candy-machine="" />` - Counter
- [ ] `<MintProgress :candy-machine="" />` - Progress bar
- [ ] `<MintPrice :candy-machine="" />` - Price display
- [ ] `<CountdownTimer :date="" />` - Countdown
- [ ] `<AllowlistChecker :candy-machine="" />` - Allowlist check

### 7.6 Composables

- [ ] `useWallet()` - Wallet state and methods
- [ ] `useConnection()` - Solana connection
- [ ] `useTokenBalance(mint)` - Token balance
- [ ] `useNFT(mint)` - NFT data
- [ ] `useNFTs(owner)` - All NFTs
- [ ] `useCandyMachine(address)` - CM state
- [ ] `useTransaction()` - Transaction sending
- [ ] `useTokenAccounts(owner)` - Token accounts

---

## Phase 8: Documentation & Examples

### 8.1 Documentation Site Updates

- [ ] Update `docs/index.md` with new project focus
- [ ] Update `docs/intro.md` with blockchain token introduction
- [ ] Update `docs/install.md` with new installation instructions
- [ ] Update `docs/config.md` with new configuration options
- [ ] Update `docs/usage.md` with new usage examples

### 8.2 API Documentation

- [ ] Create `docs/api/tokens/` directory for fungible token docs
  - [ ] `docs/api/tokens/create.md` - Token creation
  - [ ] `docs/api/tokens/mint.md` - Minting tokens
  - [ ] `docs/api/tokens/transfer.md` - Transferring tokens
  - [ ] `docs/api/tokens/burn.md` - Burning tokens
  - [ ] `docs/api/tokens/authority.md` - Authority management
  - [ ] `docs/api/tokens/metadata.md` - Token metadata
- [ ] Create `docs/api/nft/` directory for NFT docs
  - [ ] `docs/api/nft/create.md` - NFT creation
  - [ ] `docs/api/nft/collection.md` - Collections
  - [ ] `docs/api/nft/transfer.md` - Transfers
  - [ ] `docs/api/nft/metadata.md` - Metadata
  - [ ] `docs/api/nft/compressed.md` - Compressed NFTs
- [ ] Create `docs/api/candy-machine/` directory
  - [ ] `docs/api/candy-machine/create.md` - Creating CM
  - [ ] `docs/api/candy-machine/guards.md` - Guard configuration
  - [ ] `docs/api/candy-machine/mint.md` - Minting from CM
  - [ ] `docs/api/candy-machine/manage.md` - Management

### 8.3 CLI Documentation

- [ ] Create `docs/cli/` directory
  - [ ] `docs/cli/index.md` - CLI overview
  - [ ] `docs/cli/config.md` - Configuration commands
  - [ ] `docs/cli/wallet.md` - Wallet commands
  - [ ] `docs/cli/tokens.md` - Token commands
  - [ ] `docs/cli/nft.md` - NFT commands
  - [ ] `docs/cli/candy-machine.md` - CM commands
  - [ ] `docs/cli/storage.md` - Storage commands

### 8.4 Component Documentation

- [ ] Create `docs/components/` directory
  - [ ] `docs/components/react/` - React component docs
  - [ ] `docs/components/vue/` - Vue component docs
  - [ ] Include live examples with CodeSandbox/StackBlitz

### 8.5 Guides & Tutorials

- [ ] Create `docs/guides/` directory
  - [ ] `docs/guides/getting-started.md` - Quick start guide
  - [ ] `docs/guides/create-fungible-token.md` - Create your first token
  - [ ] `docs/guides/create-nft-collection.md` - Create NFT collection
  - [ ] `docs/guides/candy-machine-drop.md` - Set up NFT drop
  - [ ] `docs/guides/allowlist-setup.md` - Configure allowlists
  - [ ] `docs/guides/royalties.md` - Understanding royalties
  - [ ] `docs/guides/metadata-standards.md` - Metadata best practices
  - [ ] `docs/guides/storage-options.md` - Choosing storage provider
  - [ ] `docs/guides/testing-devnet.md` - Testing on devnet

### 8.6 Example Projects

- [ ] Create `examples/` directory in repo root
- [ ] `examples/create-token/` - Simple token creation example
- [ ] `examples/nft-minting-site/` - React NFT minting site
- [ ] `examples/candy-machine-ui/` - Full CM frontend
- [ ] `examples/token-airdrop/` - Airdrop script example
- [ ] `examples/vue-nft-gallery/` - Vue NFT gallery
- [ ] `examples/cli-scripts/` - CLI automation scripts

---

## Phase 9: Testing & Quality Assurance

### 9.1 Unit Tests

- [ ] Create `test/` directory structure mirroring `src/`
- [ ] Test configuration loading and validation
- [ ] Test driver interface implementations
- [ ] Test token creation functions
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

## Future Considerations (Post v1.0)

### Additional Chain Support

- [ ] Design chain driver interface for extensibility
- [ ] Research Ethereum/EVM integration (ERC-20, ERC-721, ERC-1155)
- [ ] Research other Solana-like chains (Sui, Aptos)
- [ ] Create driver implementation guide for contributors

### Advanced Features

- [ ] Token-2022 extensions support (transfer fees, interest-bearing, etc.)
- [ ] Programmable NFTs (pNFTs) support
- [ ] Auction house integration
- [ ] Staking/locking mechanisms
- [ ] DAO integration for token governance
- [ ] Multi-sig support for authorities
- [ ] Batch operations optimization
- [ ] Real-time websocket subscriptions

### Developer Experience

- [ ] VS Code extension for token development
- [ ] Token/NFT explorer web app
- [ ] GraphQL API layer
- [ ] Webhook notifications for events
- [ ] Analytics dashboard

---

## Notes

- **Priority**: Solana support is the primary focus. All other chains are future considerations.
- **Metaplex Compatibility**: Aim for full compatibility with Metaplex standards and tooling.
- **Testing**: Always test on devnet before mainnet operations.
- **Security**: Never commit private keys. Use environment variables or secure key management.
- **Documentation**: Keep docs updated as features are implemented.

---

*Last updated: December 2024*
