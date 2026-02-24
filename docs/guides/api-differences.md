# API Differences: Metaplex SDK vs ts-tokens

## Architecture

| Aspect | Metaplex SDK | ts-tokens |
|---|---|---|
| **Pattern** | Builder/OOP with `Metaplex.make()` | Functional with config objects |
| **Addresses** | `PublicKey` objects | String addresses (converted internally) |
| **Configuration** | Plugin-based identity/storage | Simple `TokenConfig` object |
| **Transaction handling** | Automatic signing/sending | Explicit via `buildTransaction` + `sendAndConfirmTransaction` |
| **Error handling** | Custom error classes | Standard Error with descriptive messages |

## Key Differences

### 1. No Global Instance

Metaplex SDK uses a global instance pattern:

```typescript
// Metaplex SDK
const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet))
const nft = await metaplex.nfts().findByMint(...)
```

ts-tokens passes config to each function:

```typescript
// ts-tokens
const config = { rpcUrl, keypair }
const nft = await getNFTMetadata(mint, config)
```

### 2. String Addresses

Metaplex SDK requires `PublicKey` objects everywhere. ts-tokens accepts plain strings:

```typescript
// Metaplex SDK
const mint = new PublicKey('...')
await metaplex.nfts().findByMint({ mintAddress: mint })

// ts-tokens
await getNFTMetadata('...', config)
```

### 3. Built-in Batch Operations

ts-tokens includes native batch support:

```typescript
import { batchUpdateNFTMetadata, batchVerifyCollection, batchBurnNFTs } from 'ts-tokens/legacy'
```

### 4. DAS API Integration

ts-tokens can use DAS API for faster queries:

```typescript
import { getNFTsInCollection } from 'ts-tokens/legacy'
// Automatically uses DAS when available, falls back to on-chain
const nfts = await getNFTsInCollection(collection, config, { useDAS: true })
```

### 5. Collection Discovery

ts-tokens adds discovery capabilities not in Metaplex SDK:

```typescript
import { discoverCollectionByCreator, discoverCollectionByCandyMachine } from 'ts-tokens/legacy'
```

### 6. Export/Import Tools

```typescript
import { exportToJSON, exportToCSV, importFromSugarConfig } from 'ts-tokens/legacy'
```

## Return Types

| Operation | Metaplex SDK | ts-tokens |
|---|---|---|
| Find NFT | `Nft \| Sft` (complex object) | `NFTMetadata \| null` (simple interface) |
| Create NFT | `{ nft, response }` | `{ mint, metadata, masterEdition, signature }` |
| Update NFT | `{ response }` | `TransactionResult` |
| Transfer | `{ response }` | `TransactionResult` |
| Burn | `{ response }` | `TransactionResult` |

`TransactionResult` is: `{ signature: string; confirmed: boolean; error?: string; slot?: number }`

## Feature Comparison

| Feature | Metaplex SDK | ts-tokens |
|---|---|---|
| Regular NFTs | Yes | Yes |
| Programmable NFTs | Yes | Yes (via `pnft` module) |
| Compressed NFTs | Via Bubblegum | Yes (via `nft/compressed`) |
| MPL Core | No | Yes (via `core` module) |
| Token-2022 | No | Yes (via `token/token2022`) |
| Candy Machine v3 | Yes | Yes |
| DAS API | No | Yes |
| Batch operations | No | Yes |
| CLI | No | Yes |
| Analytics/Snapshots | No | Yes |
| Sugar config import | No | Yes |
