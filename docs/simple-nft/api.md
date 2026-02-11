# Simple NFT API Reference

## Creation & Reading

### `createSimpleNFT(connection, payer, options, config)`

Create an NFT with automatic metadata generation and upload.

```ts
const result = await createSimpleNFT(connection, payer, {
  name: 'My NFT',           // Required
  image: 'https://...',     // Required: URL or Buffer
  symbol: 'MNFT',           // Optional, default: ''
  description: 'A cool NFT', // Optional
  royalty: 5,               // Optional, percentage (5 = 5%), default: 0
  creators: [{ address: pubkey, share: 100 }], // Optional
  collection: collectionPubkey, // Optional
  isMutable: false,         // Optional, default: false
  maxEditions: 100,         // Optional, default: 0 (no editions)
  attributes: [{ trait: 'Color', value: 'Blue' }], // Optional
}, config)
// Returns: { mint, metadata, masterEdition, signature, uri }
```

### `getSimpleNFT(connection, mint, config)`

Fetch NFT data and return as `SimpleNFT`.

```ts
const nft = await getSimpleNFT(connection, mintPubkey, config)
// Returns: SimpleNFT | null
```

### `updateSimpleNFT(connection, mint, authority, updates, config)`

Update mutable NFT metadata.

```ts
const signature = await updateSimpleNFT(connection, mint, authority, {
  name: 'New Name',
  royalty: 10,  // percentage
}, config)
```

### `freezeSimpleNFT(connection, mint, authority, config)`

Make NFT metadata immutable (irreversible).

```ts
const signature = await freezeSimpleNFT(connection, mint, authority, config)
```

### `getSimpleNFTsByOwner(connection, owner, config)`

Get all NFTs owned by an address.

```ts
const nfts = await getSimpleNFTsByOwner(connection, ownerPubkey, config)
```

### `verifySimpleNFT(nft)`

Validate NFT data (pure function, no network calls).

```ts
const { valid, issues } = verifySimpleNFT(nft)
```

## Collections

### `createSimpleCollection(connection, payer, options, config)`

Create a collection NFT.

```ts
const result = await createSimpleCollection(connection, payer, {
  name: 'Collection',
  image: 'https://...',
  royalty: 5,
}, config)
```

### `getSimpleCollection(connection, mint, config)`

Fetch collection data.

### `addToCollection(connection, nftMint, collectionMint, authority, config)`

Verify an NFT as part of a collection.

### `removeFromCollection(connection, nftMint, collectionMint, authority, config)`

Unverify an NFT from a collection.

### `getCollectionNFTs(connection, collectionMint, config, options?)`

Get NFTs in a collection.

### `getCollectionSize(connection, collectionMint, config)`

Get the number of verified NFTs.

### `updateCollection(connection, collectionMint, authority, updates, config)`

Update collection metadata.

### `setCollectionSize(connection, collectionMint, authority, size, config)`

Set sized collection size.

### `transferCollectionAuthority(connection, collectionMint, current, new, config)`

Transfer update authority.

### `getCollectionStats(connection, collectionMint, config)`

Get collection statistics (size, verified, owners).

## Transfer

### `transferSimpleNFT(connection, mint, from, to, config)`

Transfer an NFT.

```ts
const result = await transferSimpleNFT(connection, mint, from, to, config)
// Returns: { signature, from, to, mint }
```

## Burn

### `burnSimpleNFT(connection, mint, owner, config)`

Burn an NFT and reclaim rent.

```ts
const result = await burnSimpleNFT(connection, mint, owner, config)
// Returns: { signature, mint, owner }
```

## Editions

### `createMasterEditionSimple(connection, mint, authority, config, maxSupply?)`

Create a master edition.

```ts
const result = await createMasterEditionSimple(connection, mint, authority, config, 100)
// Returns: { signature, mint, masterEdition }
```

### `printEditionSimple(connection, masterMint, authority, editionNumber, config)`

Print a numbered edition.

```ts
const result = await printEditionSimple(connection, masterMint, authority, 1, config)
// Returns: { mint, metadata, edition, editionNumber, signature }
```

## Freeze & Delegation

### `freezeNFT(connection, mint, tokenAccount, config)`

Freeze an NFT token account (prevents transfers).

### `thawNFT(connection, mint, tokenAccount, config)`

Unfreeze an NFT token account.

### `delegateNFT(connection, mint, delegate, config)`

Approve a delegate for the NFT.

### `revokeNFTDelegate(connection, mint, config)`

Revoke delegate approval.

## Query

### `getSimpleNFTsByOwner(connection, owner, config)`

Get NFTs by owner (returns SimpleNFT[]).

### `getSimpleNFTsByCollection(connection, collectionMint, config, limit?)`

Get NFTs in a collection (returns SimpleNFT[]).

## Batch Operations

### `batchCreateSimpleNFTs(connection, payer, options, config)`

Create multiple NFTs with progress.

```ts
const result = await batchCreateSimpleNFTs(connection, payer, {
  items: [{ name: 'NFT 1', image: '...' }, { name: 'NFT 2', image: '...' }],
  onProgress: (done, total) => console.log(`${done}/${total}`),
}, config)
// Returns: { successful, failed, total }
```

### `batchTransferSimpleNFTs(connection, from, options, config)`

Transfer multiple NFTs to one recipient.

### `batchUpdateSimpleNFTs(connection, authority, items, config, onProgress?)`

Update metadata for multiple NFTs.

## Types

See `simple-nft/types.ts` for full type definitions:

- `SimpleNFT` — NFT data with royalty as percentage
- `SimpleCreator` — Creator with PublicKey address
- `SimpleCollection` — Collection data
- `CreateSimpleNFTOptions` — Creation options
- `UpdateSimpleNFTOptions` — Update options
- `SimpleNFTResult` — Creation result
- `TransferResult` / `BurnResult` — Operation results
- `BatchResult<T>` — Batch operation results
