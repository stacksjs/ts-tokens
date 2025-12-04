# Batch Operations

Efficiently process multiple token operations in batches.

## Overview

Batch operations allow you to:

- Transfer tokens to many recipients (airdrops)
- Mint tokens to multiple addresses
- Mint multiple NFTs
- Update metadata in bulk

## Batch Token Transfer

### Basic Usage

```typescript
import { batchTransfer, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await batchTransfer({
  mint: tokenMint,
  recipients: [
    { address: 'Address1...', amount: 1000n },
    { address: 'Address2...', amount: 2000n },
    { address: 'Address3...', amount: 1500n },
  ],
}, config)

console.log('Successful:', result.successful)
console.log('Failed:', result.failed)
```

### With Progress Tracking

```typescript
const result = await batchTransfer({
  mint: tokenMint,
  recipients,
  batchSize: 10,
  delayMs: 500,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`)
  },
  onError: (error, recipient) => {
    console.error(`Failed for ${recipient.address}:`, error.message)
  },
}, config)
```

### From CSV File

```typescript
import { readFileSync } from 'fs'
import { batchTransfer, getConfig } from 'ts-tokens'

const config = await getConfig()

// Parse CSV
const csv = readFileSync('./recipients.csv', 'utf-8')
const recipients = csv.split('\n').slice(1).map(line => {
  const [address, amount] = line.split(',')
  return { address, amount: BigInt(amount) }
})

const result = await batchTransfer({
  mint: tokenMint,
  recipients,
}, config)
```

## Batch Token Minting

```typescript
import { batchMint, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await batchMint({
  mint: tokenMint,
  recipients: [
    { address: 'Address1...', amount: 10000n },
    { address: 'Address2...', amount: 20000n },
  ],
}, config)
```

## Batch NFT Minting

```typescript
import { batchMintNFTs, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await batchMintNFTs({
  collection: collectionMint,
  items: [
    { name: 'NFT #1', symbol: 'MNFT', uri: 'https://...' },
    { name: 'NFT #2', symbol: 'MNFT', uri: 'https://...' },
    { name: 'NFT #3', symbol: 'MNFT', uri: 'https://...' },
  ],
  sellerFeeBasisPoints: 500,
  onProgress: (completed, total, mint) => {
    console.log(`Minted ${completed}/${total}: ${mint}`)
  },
}, config)

console.log('Minted NFTs:', result.mints)
```

## Cost Estimation

```typescript
import { estimateBatchTransferCost, getConfig } from 'ts-tokens'

const config = await getConfig()

const cost = await estimateBatchTransferCost(
  config.connection,
  100, // recipient count
  50   // recipients needing ATA creation
)

console.log('Estimated cost:', cost.sol, 'SOL')
```

## Validation

```typescript
import { validateBatchRecipients } from 'ts-tokens'

const { valid, errors } = validateBatchRecipients(recipients)

if (!valid) {
  console.error('Validation errors:', errors)
}
```

## CLI Usage

```bash
# Batch transfer from CSV
tokens batch:transfer <mint> --file ./recipients.csv

# Batch mint
tokens batch:mint <mint> --file ./recipients.csv

# Batch NFT mint
tokens batch:nft <collection> --assets ./assets/

# Estimate cost
tokens batch:estimate --file ./recipients.csv
```

## Best Practices

1. **Start small** - Test with a few recipients first
2. **Use delays** - Add delays between batches to avoid rate limits
3. **Handle errors** - Use `onError` callback to track failures
4. **Validate first** - Validate recipients before processing
5. **Monitor progress** - Use `onProgress` for long operations

## Batch Size Guidelines

| Operation | Recommended Batch Size |
|-----------|------------------------|
| Token transfers | 5-10 per transaction |
| Token mints | 10-20 per transaction |
| NFT mints | 1 per transaction |
| Metadata updates | 5-10 per transaction |

## Error Recovery

```typescript
// Save progress for recovery
const checkpoint = {
  completed: [],
  failed: [],
}

const result = await batchTransfer({
  mint,
  recipients,
  onProgress: (completed, total) => {
    // Save checkpoint
    saveCheckpoint(checkpoint)
  },
  onError: (error, recipient) => {
    checkpoint.failed.push({ recipient, error: error.message })
  },
}, config)

// Retry failed
if (checkpoint.failed.length > 0) {
  const retryRecipients = checkpoint.failed.map(f => f.recipient)
  await batchTransfer({ mint, recipients: retryRecipients }, config)
}
```

## Related

- [Token Transfers](/api/tokens/transfer.md)
- [Token Minting](/api/tokens/mint.md)
- [Airdrop Example](/examples/token-airdrop/)
