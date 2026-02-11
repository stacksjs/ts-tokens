# Migrating from Metaplex

Side-by-side comparison of Metaplex Token Metadata SDK vs ts-tokens Simple NFT.

## Creating an NFT

### Metaplex

```ts
import { createNft } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi'
import { generateSigner, percentAmount } from '@metaplex-foundation/umi'

const umi = createUmi('https://api.devnet.solana.com')
const mint = generateSigner(umi)

await createNft(umi, {
  mint,
  name: 'My NFT',
  symbol: 'MNFT',
  uri: 'https://arweave.net/metadata.json', // Must upload separately
  sellerFeeBasisPoints: percentAmount(5), // 500 basis points
  creators: [{ address: umi.identity.publicKey, verified: true, share: 100 }],
  isMutable: true,
}).sendAndConfirm(umi)
```

### ts-tokens Simple NFT

```ts
import { simpleNFT } from 'ts-tokens'

const nft = await simpleNFT.createSimpleNFT(connection, payer, {
  name: 'My NFT',
  image: 'https://example.com/image.png', // Auto-generates metadata JSON
  royalty: 5, // 5% — not basis points
}, config)
// Handles: metadata generation, upload, mint, ATA, metadata PDA, master edition
```

## Reading NFT Data

### Metaplex

```ts
import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata'

const asset = await fetchDigitalAsset(umi, mintAddress)
console.log(asset.metadata.name)
console.log(asset.metadata.sellerFeeBasisPoints) // 500
```

### ts-tokens Simple NFT

```ts
const nft = await simpleNFT.getSimpleNFT(connection, mint, config)
console.log(nft.name)
console.log(nft.royalty) // 5 (percentage)
```

## Collections

### Metaplex

```ts
// 1. Create collection NFT
const collectionMint = generateSigner(umi)
await createNft(umi, {
  mint: collectionMint,
  name: 'My Collection',
  uri: 'https://...',
  sellerFeeBasisPoints: percentAmount(5),
  isCollection: true,
}).sendAndConfirm(umi)

// 2. Create NFT with collection
await createNft(umi, {
  /* ... */
  collection: { key: collectionMint.publicKey, verified: false },
}).sendAndConfirm(umi)

// 3. Verify collection (separate transaction!)
await verifyCollectionV1(umi, {
  metadata: nftMetadata,
  collectionMint: collectionMint.publicKey,
  authority: umi.identity,
}).sendAndConfirm(umi)
```

### ts-tokens Simple NFT

```ts
// 1. Create collection
const collection = await simpleNFT.createSimpleCollection(connection, payer, {
  name: 'My Collection',
  image: 'https://...',
  royalty: 5,
}, config)

// 2. Add NFT to collection (create + verify in concept)
await simpleNFT.addToCollection(connection, nftMint, collectionMint, authority, config)
```

## Transfers

### Metaplex

```ts
import { transferV1 } from '@metaplex-foundation/mpl-token-metadata'

await transferV1(umi, {
  mint: mintAddress,
  authority: umi.identity,
  tokenOwner: umi.identity.publicKey,
  destinationOwner: recipient,
  tokenStandard: TokenStandard.NonFungible,
}).sendAndConfirm(umi)
```

### ts-tokens Simple NFT

```ts
await simpleNFT.transferSimpleNFT(connection, mint, from, to, config)
```

## Key Differences

| Feature | Metaplex | ts-tokens Simple NFT |
|---------|----------|---------------------|
| Royalty format | Basis points (500) | Percentage (5) |
| Metadata upload | Manual | Automatic |
| Default mutability | `true` | `false` (safer) |
| Collection verify | Separate transaction | Included in addToCollection |
| Dependencies | Umi framework | Direct @solana/web3.js |
| On-chain program | Same | Same (metaqbxxUerdq...) |
| Wallet compatibility | Full | Full |
| Marketplace support | Full | Full |
