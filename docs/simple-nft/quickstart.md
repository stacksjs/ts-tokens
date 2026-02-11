# Simple NFT Quickstart

Create your first NFT in 5 minutes.

## Setup

```ts
import { simpleNFT } from 'ts-tokens'
import { getConfig } from 'ts-tokens/config'
import { createConnection } from 'ts-tokens/drivers/solana/connection'
import { loadWallet } from 'ts-tokens/drivers/solana/wallet'

const config = await getConfig()
const connection = createConnection(config)
const wallet = loadWallet(config)
```

## Create an NFT

```ts
const nft = await simpleNFT.createSimpleNFT(connection, wallet.publicKey, {
  name: 'My First NFT',
  image: 'https://example.com/image.png',
  description: 'Created with ts-tokens Simple NFT',
  royalty: 5, // 5% royalty
}, config)

console.log('Mint:', nft.mint)
console.log('Signature:', nft.signature)
```

## Read NFT Data

```ts
import { PublicKey } from '@solana/web3.js'

const data = await simpleNFT.getSimpleNFT(
  connection,
  new PublicKey(nft.mint),
  config
)

console.log('Name:', data.name)
console.log('Royalty:', data.royalty + '%')
console.log('Creators:', data.creators)
```

## Create a Collection

```ts
const collection = await simpleNFT.createSimpleCollection(
  connection,
  wallet.publicKey,
  {
    name: 'My Collection',
    image: 'https://example.com/collection.png',
    description: 'A collection of amazing NFTs',
    royalty: 5,
  },
  config
)

console.log('Collection mint:', collection.mint)
```

## Add NFT to Collection

```ts
await simpleNFT.addToCollection(
  connection,
  new PublicKey(nft.mint),
  new PublicKey(collection.mint),
  wallet.publicKey,
  config
)
```

## Transfer an NFT

```ts
const result = await simpleNFT.transferSimpleNFT(
  connection,
  new PublicKey(nft.mint),
  wallet.publicKey,
  new PublicKey('RecipientAddress...'),
  config
)
```

## CLI Usage

```bash
# Create an NFT
tokens simple-nft create --name "My NFT" --image "https://..." --royalty 5

# Get NFT info
tokens simple-nft info <mint-address>

# Transfer
tokens simple-nft transfer <mint-address> <recipient>

# Create a collection
tokens simple-nft collection create --name "My Collection" --image "https://..."

# Add to collection
tokens simple-nft collection add <nft-mint> <collection-mint>
```
