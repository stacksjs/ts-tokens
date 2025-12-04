# Fluent API

Chainable API for token and NFT operations.

## Overview

The fluent API provides a builder pattern for:

- **Token operations** - Create, mint, transfer, burn
- **NFT operations** - Collections, minting, transfers
- **Candy Machine** - Configure and deploy

## Token Builder

### Basic Usage

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await tokens()
  .createToken({
    name: 'MyToken',
    symbol: 'MTK',
    decimals: 9,
    initialSupply: 1000000000n,
  })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()

console.log('Success:', result.success)
console.log('Signatures:', result.signatures)
```

### Chained Operations

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await tokens()
  .createToken({ name: 'MyToken', symbol: 'MTK' })
  .mint({ amount: 1000000n })
  .transfer({ to: recipient, amount: 500000n })
  .transfer({ to: recipient2, amount: 250000n })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

### Using Existing Token

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await tokens()
  .useToken(existingMint)
  .mint({ amount: 1000000n, to: recipient })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

### Batch Transfers

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await tokens()
  .useToken(mint)
  .transferToMany([
    { to: recipient1, amount: 100n },
    { to: recipient2, amount: 200n },
    { to: recipient3, amount: 300n },
  ])
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

### Authority Management

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await tokens()
  .useToken(mint)
  .setMintAuthority(newAuthority)
  .setFreezeAuthority(null) // Revoke
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

## NFT Builder

### Create Collection and Mint

```typescript
import { nfts, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await nfts()
  .createCollection({
    name: 'My Collection',
    symbol: 'MCOL',
    uri: 'https://example.com/collection.json',
  })
  .mintNFT({
    name: 'NFT #1',
    symbol: 'NFT',
    uri: 'https://example.com/1.json',
  })
  .mintNFT({
    name: 'NFT #2',
    symbol: 'NFT',
    uri: 'https://example.com/2.json',
  })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

### Batch Minting

```typescript
import { nfts, getConfig } from 'ts-tokens'

const config = await getConfig()

const items = Array.from({ length: 100 }, (_, i) => ({
  name: `NFT #${i + 1}`,
  symbol: 'NFT',
  uri: `https://example.com/${i + 1}.json`,
}))

const result = await nfts()
  .useCollection(collectionMint)
  .mintNFTs(items)
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

### Transfer NFTs

```typescript
import { nfts, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await nfts()
  .transfer(nft1, recipient)
  .transfer(nft2, recipient)
  .transfer(nft3, recipient2)
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

### Update Metadata

```typescript
import { nfts, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await nfts()
  .updateMetadata(nftMint, {
    name: 'Updated Name',
    uri: 'https://example.com/updated.json',
  })
  .verifyCreator(nftMint, creatorPubkey)
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

## Candy Machine Builder

```typescript
import { candyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await candyMachine()
  .name('My Collection')
  .symbol('MCOL')
  .items(10000)
  .price(1.5) // SOL
  .sellerFeeBasisPoints(500) // 5%
  .creators([
    { address: creator1, share: 70 },
    { address: creator2, share: 30 },
  ])
  .startDate(new Date('2024-01-01'))
  .addGuard('solPayment', { amount: 1.5 })
  .addGuard('startDate', { date: new Date('2024-01-01') })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()
```

## Dry Run

Preview operations without executing:

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const preview = await tokens()
  .createToken({ name: 'Test', symbol: 'TST' })
  .mint({ amount: 1000000n })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .dryRun()

console.log('Operations:', preview.operations)
console.log('Estimated Fee:', preview.estimatedFee, 'SOL')
console.log('Warnings:', preview.warnings)
```

## Options

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await tokens()
  .createToken({ name: 'Test', symbol: 'TST' })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .withOptions({
    priorityLevel: 'high',
    maxRetries: 3,
    skipPreflight: false,
  })
  .execute()
```

## Error Handling

```typescript
import { tokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await tokens()
  .createToken({ name: 'Test', symbol: 'TST' })
  .mint({ amount: 1000000n })
  .withConnection(config.connection)
  .withPayer(config.wallet.publicKey)
  .execute()

if (!result.success) {
  for (const error of result.errors) {
    console.error(`${error.operation}: ${error.error}`)
  }
}
```

## Related

- [Token Operations](/api/tokens/index.md)
- [NFT Operations](/api/nft/index.md)
- [Batch Operations](/api/batch/index.md)
