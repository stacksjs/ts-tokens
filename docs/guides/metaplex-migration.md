# Metaplex SDK Migration Guide

Migrate from `@metaplex-foundation/js` to `ts-tokens` with minimal code changes.

## Quick Start: Compatibility Shim

For the fastest migration, use the Metaplex-compatible shim that maps 1:1 to the old API:

```typescript
// Before (Metaplex SDK)
import { Metaplex } from '@metaplex-foundation/js'
const metaplex = Metaplex.make(connection)
const nft = await metaplex.nfts().findByMint({ mintAddress })

// After (ts-tokens compat shim)
import { Metaplex } from 'ts-tokens/compat'
const metaplex = Metaplex(config)
const nft = await metaplex.nfts().findByMint({ mintAddress })
```

## Function-by-Function Mapping

### NFT Operations

| Metaplex SDK | ts-tokens | Module |
|---|---|---|
| `nfts().findByMint({ mintAddress })` | `getNFTMetadata(mint, config)` | `nft/metadata` |
| `nfts().findAllByOwner({ owner })` | `getNFTsByOwner(owner, config)` | `nft/query` |
| `nfts().findAllByCreator({ creator })` | `getNFTsByCreator(creator, config)` | `nft/query` |
| `nfts().create({ ... })` | `createNFT({ ... }, config)` | `nft/create` |
| `nfts().update({ nftOrSft, ... })` | `updateNFTMetadata(mint, updates, config)` | `nft/metadata` |
| `nfts().delete({ mintAddress })` | `burnNFTFull(mint, config)` | `nft/burn` |
| `nfts().transfer({ ... })` | `transferNFT(mint, to, config)` | `nft/transfer` |
| `nfts().printNewEdition({ ... })` | `printEdition(masterMint, edition, config)` | `nft/editions` |
| `nfts().verifyCreator({ ... })` | `verifyCreator(mint, config)` | `nft/metadata` |

### Collection Operations

| Metaplex SDK | ts-tokens | Module |
|---|---|---|
| `nfts().verifyCollection({ ... })` | `verifyNFTInCollection(nft, collection, config)` | `legacy/verification` |
| `nfts().unverifyCollection({ ... })` | `unverifyNFTFromCollection(nft, collection, config)` | `legacy/verification` |
| N/A | `migrateToSizedCollection(mint, size, config)` | `legacy/verification` |
| N/A | `getCollectionStats(mint, config)` | `legacy/analytics` |
| N/A | `getHolderSnapshot(mint, config)` | `legacy/analytics` |

### Candy Machine Operations

| Metaplex SDK | ts-tokens | Module |
|---|---|---|
| `candyMachines().findByAddress({ ... })` | `getCandyMachineInfo(address, config)` | `legacy/candy-machine` |
| `candyMachines().update({ ... })` | `updateCandyMachine(address, updates, config)` | `legacy/candy-machine` |
| `candyMachines().delete({ ... })` | `closeCandyMachine(address, config)` | `legacy/candy-machine` |
| `candyMachines().withdraw({ ... })` | `withdrawCandyMachineFunds(address, config)` | `legacy/candy-machine` |

### Authority Operations

| Metaplex SDK | ts-tokens | Module |
|---|---|---|
| `nfts().update({ newUpdateAuthority })` | `transferUpdateAuthority(mint, newAuth, config)` | `legacy/authority` |
| `nfts().approveCollectionAuthority(...)` | `setCollectionAuthority(mint, auth, config)` | `legacy/authority` |
| `nfts().revokeCollectionAuthority(...)` | `revokeCollectionAuthority(mint, auth, config)` | `legacy/authority` |

## Type Mapping

```typescript
// Metaplex types -> ts-tokens equivalents
import type { Nft, Sft, NftWithToken } from 'ts-tokens/compat'

// These are type-compatible with the Metaplex SDK types
```

## Common Migration Patterns

### 1. Replace Connection with Config

```typescript
// Before
const connection = new Connection('https://api.mainnet-beta.solana.com')
const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet))

// After
const config = { rpcUrl: 'https://api.mainnet-beta.solana.com', keypair: wallet }
```

### 2. Replace `toPublicKey()` calls

```typescript
// Before
const mint = new PublicKey(mintAddress)
const nft = await metaplex.nfts().findByMint({ mintAddress: mint })

// After - ts-tokens accepts strings directly
const nft = await getNFTMetadata(mintAddress, config)
```

### 3. Batch Operations

```typescript
// Before (manual loop)
for (const mint of mints) {
  await metaplex.nfts().update({ nftOrSft: { address: mint }, uri: newUri })
}

// After (built-in batching)
await batchUpdateNFTMetadata(
  mints.map(mint => ({ mint, updates: { uri: newUri } })),
  config,
  { batchSize: 5, onProgress: (done, total) => console.log(`${done}/${total}`) }
)
```

## Codemod Patterns

Common find-and-replace regex patterns for migration:

```bash
# Replace Metaplex import
s/import { Metaplex } from '@metaplex-foundation\/js'/import { Metaplex } from 'ts-tokens\/compat'/g

# Replace nfts().findByMint
s/\.nfts\(\)\.findByMint\(\{ mintAddress: (\w+) \}\)/getNFTMetadata($1, config)/g

# Replace nfts().create
s/\.nfts\(\)\.create\(/createNFT(/g

# Replace nfts().update
s/\.nfts\(\)\.update\(/updateNFTMetadata(/g
```
