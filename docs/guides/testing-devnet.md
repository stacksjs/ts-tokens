# Testing on Devnet

Learn how to test your tokens and NFTs on Solana devnet.

## Why Devnet?

- **Free SOL** - Get test SOL via airdrop
- **No real money** - Safe to experiment
- **Same features** - Identical to mainnet
- **Fast iteration** - Test without consequences

## Setup

### 1. Configure for Devnet

```typescript
// tokens.config.ts
import { defineConfig } from 'ts-tokens'

export default defineConfig({
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  wallet: {
    path: '~/.config/solana/devnet.json',
  },
})
```

### 2. Create a Devnet Wallet

```bash
# Generate new keypair
solana-keygen new -o ~/.config/solana/devnet.json

# Or use ts-tokens CLI
tokens wallet:generate --output ~/.config/solana/devnet.json
```

### 3. Get Devnet SOL

```bash
# Using Solana CLI
solana airdrop 2 --url devnet

# Using ts-tokens CLI
tokens wallet:airdrop --amount 2

# Or programmatically
import { requestAirdrop, getConfig } from 'ts-tokens'

const config = await getConfig()
await requestAirdrop(2, config)
```

## Testing Tokens

### Create Test Token

```typescript
import { createToken, getConfig } from 'ts-tokens'

const config = await getConfig()

const token = await createToken({
  name: 'Test Token',
  symbol: 'TEST',
  decimals: 9,
  initialSupply: 1_000_000_000_000,
}, config)

console.log('Test token:', token.mint)
```

### Verify on Explorer

```bash
# Open in browser
open https://explorer.solana.com/address/${token.mint}?cluster=devnet
```

## Testing NFTs

### Create Test Collection

```typescript
import { createCollection, createNFT, getConfig } from 'ts-tokens'

const config = await getConfig()

// Use placeholder metadata for testing
const collection = await createCollection({
  name: 'Test Collection',
  symbol: 'TEST',
  uri: 'https://arweave.net/placeholder',
}, config)

const nft = await createNFT({
  name: 'Test NFT #1',
  symbol: 'TEST',
  uri: 'https://arweave.net/placeholder',
  collection: collection.mint,
}, config)
```

## Testing Candy Machine

### Create Test Candy Machine

```typescript
import { createCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const cm = await createCandyMachine({
  collection: collectionMint,
  itemsAvailable: 10, // Small number for testing
  symbol: 'TEST',
  sellerFeeBasisPoints: 500,
  creators: [{ address: config.wallet.publicKey, share: 100 }],
  configLineSettings: {
    prefixName: 'Test #',
    nameLength: 4,
    prefixUri: 'https://example.com/',
    uriLength: 50,
    isSequential: true,
  },
}, config)
```

### Test Minting

```typescript
import { getConfig, mintFromCandyMachine } from 'ts-tokens'

const config = await getConfig()

// Mint a few test NFTs
for (let i = 0; i < 3; i++) {
  const nft = await mintFromCandyMachine(candyMachineAddress, config)
  console.log(`Minted test NFT ${i + 1}:`, nft.mint)
}
```

## Debugging

### Check Transaction Status

```typescript
import { getConfig, getTransactionStatus } from 'ts-tokens'

const config = await getConfig()

const status = await getTransactionStatus(signature, config)
console.log('Status:', status)
```

### View Transaction Logs

```bash
# Using Solana CLI
solana confirm -v <signature> --url devnet

# Or check Explorer
open https://explorer.solana.com/tx/${signature}?cluster=devnet
```

### Common Errors

| Error                   | Cause                 | Solution                         |
| ----------------------- | --------------------- | -------------------------------- |
| `Insufficient funds`    | Not enough SOL        | Request airdrop                  |
| `Account not found`     | Wrong address         | Verify mint/account address      |
| `Invalid owner`         | Wrong authority       | Check wallet configuration       |
| `Transaction too large` | Too many instructions | Split into multiple transactions |

## Automated Testing

### Unit Tests

```typescript
import { beforeAll, describe, expect, test } from 'bun:test'
import { createToken, getConfig } from 'ts-tokens'

describe('Token Creation', () => {
  let config: TokenConfig

  beforeAll(async () => {
    config = await getConfig()
  })

  test('should create token', async () => {
    const token = await createToken({
      name: 'Test',
      symbol: 'TST',
      decimals: 9,
    }, config)

    expect(token.mint).toBeDefined()
    expect(token.signature).toBeDefined()
  })
})
```

### Integration Tests

```typescript
import { describe, test, expect } from 'bun:test'

describe('Full Token Lifecycle', () => {
  test('create -> mint -> transfer -> burn', async () => {
    const config = await getConfig()

    // Create
    const token = await createToken({ ... }, config)

    // Mint
    const mintResult = await mintTokens(token.mint, 1000, recipient, config)

    // Transfer
    const transferResult = await transferTokens(token.mint, 500, other, config)

    // Burn
    const burnResult = await burnTokens(token.mint, 250, config)

    // Verify
    const balance = await getTokenBalance(token.mint, recipient, config)
    expect(balance).toBe(250n)
  })
})
```

## Best Practices

1. **Use separate wallets** - Don't mix devnet and mainnet keys
2. **Test edge cases** - Try invalid inputs, large amounts
3. **Verify on Explorer** - Always check transactions succeeded
4. **Clean up** - Close test accounts to reclaim rent
5. **Document issues** - Note any bugs found during testing

## Moving to Mainnet

When ready for mainnet:

1. Update config to `mainnet-beta`
2. Use real SOL for transactions
3. Use permanent storage (Arweave)
4. Double-check all parameters
5. Start with small amounts

```typescript
// tokens.config.ts
export default defineConfig({
  network: 'mainnet-beta',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  // Or use a dedicated RPC provider
  // rpcUrl: 'https://your-rpc-provider.com',
})
```

## Next Steps

- [Getting Started](./getting-started.md)
- [Create Your First Token](./create-fungible-token.md)
