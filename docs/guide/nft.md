# NFTs

Create and manage non-fungible tokens on Solana.

## Creating NFTs

### Simple NFT

```typescript
import { createNFT } from 'ts-tokens'

const nft = await createNFT({
  name: 'My NFT',
  symbol: 'MNFT',
  uri: 'https://arweave.net/metadata.json',
})

console.log('NFT mint:', nft.mint.toBase58())
```

### NFT with Full Metadata

```typescript
const nft = await createNFT({
  name: 'My Awesome NFT',
  symbol: 'MNFT',
  uri: 'https://arweave.net/metadata.json',
  sellerFeeBasisPoints: 500, // 5% royalties
  creators: [
    { address: creator1, share: 70 },
    { address: creator2, share: 30 },
  ],
  collection: collectionMint, // Optional
  isMutable: true,
  primarySaleHappened: false,
})
```

## Collections

### Create Collection

```typescript
import { createCollection } from 'ts-tokens'

const collection = await createCollection({
  name: 'My Collection',
  symbol: 'MCOL',
  uri: 'https://arweave.net/collection.json',
  sellerFeeBasisPoints: 500,
  creators: [
    { address: creatorAddress, share: 100 },
  ],
})

console.log('Collection mint:', collection.mint.toBase58())
```

### Mint NFT to Collection

```typescript
import { mintNFT, setAndVerifyCollection } from 'ts-tokens'

// Mint NFT
const nft = await mintNFT({
  name: 'Collection NFT #1',
  symbol: 'MCOL',
  uri: 'https://arweave.net/nft1.json',
  collection: collection.mint,
})

// Verify collection (requires collection update authority)
await setAndVerifyCollection({
  nft: nft.mint,
  collection: collection.mint,
  collectionAuthority: collectionAuthorityWallet,
})
```

### Verify Creator

```typescript
import { verifyCreator, unverifyCreator } from 'ts-tokens'

// Verify creator signature
await verifyCreator({
  nft: nftMint,
  creator: creatorWallet,
})

// Unverify (remove verification)
await unverifyCreator({
  nft: nftMint,
  creator: creatorWallet,
})
```

## Transfers

### Transfer NFT

```typescript
import { transferNFT } from 'ts-tokens'

await transferNFT({
  mint: nftMint,
  from: senderWallet,
  to: recipientAddress,
})
```

### Batch Transfer

```typescript
import { transferNFTs } from 'ts-tokens'

await transferNFTs({
  from: senderWallet,
  transfers: [
    { mint: nft1Mint, to: recipient1 },
    { mint: nft2Mint, to: recipient2 },
    { mint: nft3Mint, to: recipient3 },
  ],
})
```

### Transfer with Authority

```typescript
import { transferNFTFrom } from 'ts-tokens'

// Transfer using delegated authority
await transferNFTFrom({
  mint: nftMint,
  from: ownerAddress,
  to: recipientAddress,
  authority: delegateWallet,
})
```

## Burning

### Burn NFT

```typescript
import { burnNFT } from 'ts-tokens'

await burnNFT({
  mint: nftMint,
  owner: ownerWallet,
})
```

### Burn with Collection

```typescript
import { burnNFTFull } from 'ts-tokens'

// Burns NFT and closes all associated accounts
await burnNFTFull({
  mint: nftMint,
  owner: ownerWallet,
  collection: collectionMint, // Optional
})
```

### Batch Burn

```typescript
import { burnNFTs } from 'ts-tokens'

await burnNFTs({
  owner: ownerWallet,
  mints: [nft1Mint, nft2Mint, nft3Mint],
})
```

## Metadata

### Update Metadata

```typescript
import { updateNFTMetadata } from 'ts-tokens'

await updateNFTMetadata({
  mint: nftMint,
  name: 'Updated NFT Name',
  symbol: 'UNFT',
  uri: 'https://arweave.net/new-metadata.json',
  sellerFeeBasisPoints: 250, // 2.5% royalties
})
```

### Get Metadata

```typescript
import { getNFTMetadata, getFullNFTData } from 'ts-tokens'

// Basic metadata
const metadata = await getNFTMetadata(nftMint)
console.log('Name:', metadata.name)

// Full data including off-chain
const fullData = await getFullNFTData(nftMint)
console.log('On-chain:', fullData.onChain)
console.log('Off-chain:', fullData.offChain)
```

### Fetch Off-Chain Metadata

```typescript
import { fetchOffChainMetadata } from 'ts-tokens'

const offChain = await fetchOffChainMetadata(metadataUri)

console.log('Image:', offChain.image)
console.log('Attributes:', offChain.attributes)
console.log('Description:', offChain.description)
```

## Candy Machine

### Create Candy Machine

```typescript
import { createCandyMachine } from 'ts-tokens'

const candyMachine = await createCandyMachine({
  itemsAvailable: 10_000,
  sellerFeeBasisPoints: 500,
  symbol: 'MNFT',
  creators: [
    { address: creatorAddress, percentageShare: 100 },
  ],
  guards: {
    solPayment: {
      amount: 1.5, // 1.5 SOL
      destination: treasuryAddress,
    },
    startDate: {
      date: new Date('2024-01-01'),
    },
    endDate: {
      date: new Date('2024-12-31'),
    },
    mintLimit: {
      limit: 5, // 5 per wallet
    },
  },
})
```

### Add Config Lines

```typescript
import { addConfigLines } from 'ts-tokens'

await addConfigLines({
  candyMachine: candyMachineAddress,
  index: 0,
  configLines: [
    { name: 'NFT #1', uri: 'https://arweave.net/1.json' },
    { name: 'NFT #2', uri: 'https://arweave.net/2.json' },
    { name: 'NFT #3', uri: 'https://arweave.net/3.json' },
    // ... up to 10 at a time
  ],
})
```

### Mint from Candy Machine

```typescript
import { mintFromCandyMachine } from 'ts-tokens'

const nft = await mintFromCandyMachine({
  candyMachine: candyMachineAddress,
  payer: payerWallet,
  minter: minterAddress,
})

console.log('Minted:', nft.mint.toBase58())
```

## Compressed NFTs

Cost-effective NFTs using state compression.

### Create Merkle Tree

```typescript
import { createMerkleTree } from 'ts-tokens'

const tree = await createMerkleTree({
  maxDepth: 14,      // Supports 2^14 = 16,384 NFTs
  maxBufferSize: 64,
  canopyDepth: 10,
})

console.log('Tree address:', tree.address.toBase58())
```

### Mint Compressed NFT

```typescript
import { mintCompressedNFT } from 'ts-tokens'

const cnft = await mintCompressedNFT({
  tree: treeAddress,
  name: 'Compressed NFT #1',
  symbol: 'CNFT',
  uri: 'https://arweave.net/metadata.json',
  collection: collectionMint,
  creators: [
    { address: creatorAddress, share: 100 },
  ],
})

console.log('Asset ID:', cnft.assetId)
```

### Transfer Compressed NFT

```typescript
import { transferCompressedNFT } from 'ts-tokens'

await transferCompressedNFT({
  assetId: assetIdString,
  owner: ownerWallet,
  newOwner: recipientAddress,
})
```

## Editions

### Create Master Edition

```typescript
import { createMasterEdition } from 'ts-tokens'

const master = await createMasterEdition({
  name: 'Master Edition',
  symbol: 'ME',
  uri: 'https://arweave.net/master.json',
  maxSupply: 100, // null for unlimited
})
```

### Print Edition

```typescript
import { printEdition } from 'ts-tokens'

const edition = await printEdition({
  masterEdition: masterMint,
  editionNumber: 1,
})

console.log('Edition mint:', edition.mint.toBase58())
```

## Querying NFTs

### Get NFTs by Owner

```typescript
import { getNFTsByOwner } from 'ts-tokens'

const nfts = await getNFTsByOwner(ownerAddress)

nfts.forEach(nft => {
  console.log(nft.mint.toBase58(), nft.name)
})
```

### Get NFTs by Collection

```typescript
import { getNFTsByCollection } from 'ts-tokens'

const nfts = await getNFTsByCollection(collectionMint)

console.log(`Found ${nfts.length} NFTs in collection`)
```

### Get NFTs by Creator

```typescript
import { getNFTsByCreator } from 'ts-tokens'

const nfts = await getNFTsByCreator(creatorAddress)

nfts.forEach(nft => {
  console.log(nft.mint.toBase58())
})
```

## Framework Integration

### Vue Composables

```vue
<script setup lang="ts">
import { useNFT, useNFTs } from '@ts-tokens/vue'

// Single NFT
const { nft, loading, error } = useNFT(mintAddress)

// User's NFTs
const { nfts, loading: nftsLoading } = useNFTs(walletAddress)
</script>

<template>
  <div v-if="nft">
    <h1>{{ nft.name }}</h1>
    <img :src="nft.image" :alt="nft.name" />
  </div>
</template>
```

### React Hooks

```tsx
import { useNFT, useNFTs } from '@ts-tokens/react'

function NFTDisplay({ mint }: { mint: string }) {
  const { nft, loading, error } = useNFT(mint)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h1>{nft.name}</h1>
      <img src={nft.image} alt={nft.name} />
    </div>
  )
}

function NFTGallery({ wallet }: { wallet: string }) {
  const { nfts, loading } = useNFTs(wallet)

  return (
    <div>
      {nfts.map(nft => (
        <NFTCard key={nft.mint} nft={nft} />
      ))}
    </div>
  )
}
```

## Next Steps

- [Getting Started](/guide/getting-started) - Setup guide
- [Fungible Tokens](/guide/fungible) - Create tokens
