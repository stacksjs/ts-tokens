# Simple NFT Standard

## Why Simple NFT

The Metaplex Token Metadata Program is powerful but complex. Creating a single NFT requires understanding PDAs, multiple accounts (Mint, Metadata, MasterEdition), basis points for royalties, and multi-instruction transactions.

The Simple NFT module provides a **better developer experience** on top of the same Metaplex infrastructure:

- **Royalties as percentages** — `royalty: 5` instead of `sellerFeeBasisPoints: 500`
- **Sensible defaults** — `isMutable: false` by default (safer), auto-generated metadata JSON
- **Single function calls** — `createSimpleNFT()` handles upload, metadata generation, mint creation, and master edition
- **Cleaner types** — `SimpleNFT` combines all data into one interface

## Architecture

Simple NFT is **not** a new on-chain program. It's a TypeScript API layer that builds instructions for the existing Metaplex Token Metadata Program (`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`).

```
Your Code → Simple NFT API → nft/ modules → Token Metadata Program
                                           → SPL Token Program
                                           → Storage (Arweave/IPFS)
```

All NFTs created through Simple NFT are standard Metaplex NFTs, compatible with all Solana wallets and marketplaces.

## Design Principles

1. **Single instruction where possible** — Combine common multi-instruction flows
2. **Sensible defaults** — No required params that have obvious defaults
3. **TypeScript-first** — Types that make sense, not auto-generated from Rust
4. **Progressive complexity** — Simple things simple, complex things possible
5. **Full compatibility** — Same on-chain accounts as Metaplex

## Modules

| Module | Description |
|--------|-------------|
| `create` | Create, read, update NFTs |
| `collection` | Collection management |
| `transfer` | NFT transfers |
| `burn` | Burn and reclaim rent |
| `editions` | Master editions and prints |
| `freeze` | Freeze/thaw + delegate/revoke |
| `query` | Query NFTs by owner/collection |
| `batch` | Batch create, transfer, update |
| `metadata` | Metadata generation and validation |
