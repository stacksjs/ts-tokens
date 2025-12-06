# Programmable NFTs (pNFT)

NFTs with on-chain transfer rules and royalty enforcement.

## Overview

Programmable NFTs support:

- **Royalty Enforcement** - On-chain royalty payments
- **Transfer Rules** - Allow/deny lists, cooldowns, limits
- **Soulbound Tokens** - Non-transferable NFTs
- **State Management** - Lock for staking, listing

## Create pNFT

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

const { mint, signature } = await pnft.createPNFT(
  config.connection,
  config.wallet.publicKey,
  {
    name: 'My pNFT',
    symbol: 'PNFT',
    uri: 'https://example.com/metadata.json',
    rules: [
      pnft.createRoyaltyRule(500, [
        { address: creator, share: 100 },
      ]),
      pnft.createCooldownRule(86400), // 24 hours
    ],
  }
)
```

## Transfer Rules

### Royalty Enforcement

```typescript
import { pnft } from 'ts-tokens'

const rule = pnft.createRoyaltyRule(
  500, // 5% (in basis points)
  [
    { address: creator1, share: 70 },
    { address: creator2, share: 30 },
  ]
)
```

### Allow List

```typescript
import { pnft } from 'ts-tokens'

const rule = pnft.createAllowListRule([
  approvedAddress1,
  approvedAddress2,
])
```

### Deny List

```typescript
import { pnft } from 'ts-tokens'

const rule = pnft.createDenyListRule([
  blockedAddress,
])
```

### Cooldown Period

```typescript
import { pnft } from 'ts-tokens'

const rule = pnft.createCooldownRule(86400) // 24 hours
```

### Max Transfers

```typescript
import { pnft } from 'ts-tokens'

const rule = pnft.createMaxTransfersRule(5) // Max 5 transfers ever
```

### Holder Gate

```typescript
import { pnft } from 'ts-tokens'

const rule = pnft.createHolderGateRule(
  requiredTokenMint,
  1000n // Min amount
)
```

## Soulbound Tokens

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

// Create soulbound (non-transferable)
const { mint } = await pnft.createSoulbound(
  config.connection,
  config.wallet.publicKey,
  {
    name: 'Achievement Badge',
    symbol: 'BADGE',
    uri: 'https://example.com/badge.json',
    recoveryAuthority: adminPubkey, // Optional recovery
  }
)

// Check if soulbound
const isSoulbound = await pnft.isSoulbound(config.connection, mint)

// Recover (emergency only)
await pnft.recoverSoulbound(
  config.connection,
  mint,
  recoveryAuthority,
  newOwner
)
```

## Transfer Validation

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

// Check if transfer is allowed
const validation = await pnft.canTransfer(
  config.connection,
  mint,
  from,
  to
)

if (!validation.allowed) {
  console.log('Transfer blocked:', validation.reason)
  console.log('Failed rules:', validation.failedRules)
}
else {
  console.log('Transfer allowed')
  if (validation.royaltyAmount) {
    console.log('Royalty required:', validation.royaltyAmount)
  }
}
```

## Execute Transfer

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

const { signature, royaltyPaid } = await pnft.transferPNFT(
  config.connection,
  {
    mint,
    from: owner,
    to: recipient,
    payRoyalty: true,
  }
)

console.log('Transferred:', signature)
console.log('Royalty paid:', royaltyPaid)
```

## Rule Management

### Add Rule

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

await pnft.addRule(
  config.connection,
  mint,
  authority,
  pnft.createDenyListRule([scammerAddress])
)
```

### Remove Rule

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

await pnft.removeRule(
  config.connection,
  mint,
  authority,
  'deny_list'
)
```

### Freeze Rules

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

// Make rules immutable
await pnft.freezeRules(config.connection, mint, authority)
```

## Rule Sets (Collection-Level)

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

// Create shared rule set
const { address: ruleSetAddress } = await pnft.createRuleSet(
  config.connection,
  authority,
  {
    collection: collectionMint,
    rules: [
      pnft.createRoyaltyRule(500, [{ address: creator, share: 100 }]),
    ],
    isMutable: false,
  }
)

// Create pNFT using rule set
await pnft.createPNFT(config.connection, payer, {
  name: 'NFT',
  symbol: 'NFT',
  uri: '...',
  ruleSet: ruleSetAddress,
})
```

## State Management

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

// Lock for listing
await pnft.lockPNFT(config.connection, mint, owner, 'listed')

// Lock for staking
await pnft.lockPNFT(config.connection, mint, owner, 'staked')

// Unlock
await pnft.unlockPNFT(config.connection, mint, owner)

// Get current state
const state = await pnft.getPNFTState(config.connection, mint)
```

## Estimate Royalty

```typescript
import { getConfig, pnft } from 'ts-tokens'

const config = await getConfig()

const salePrice = 10_000_000_000n // 10 SOL

const { amount, recipients } = await pnft.estimateRoyalty(
  config.connection,
  mint,
  salePrice
)

console.log('Total royalty:', amount)
for (const r of recipients) {
  console.log(`  ${r.address}: ${r.amount}`)
}
```

## CLI Usage

```bash
# Create pNFT
tokens pnft create --name "My pNFT" --royalty 5

# Create soulbound
tokens sbt create --name "Badge" --recovery <authority>

# Check rules
tokens pnft rules <mint>

# Add rule
tokens pnft add-rule <mint> --type deny-list --addresses <addr1,addr2>

# Check if transfer allowed
tokens pnft can-transfer <mint> --to <recipient>

# Transfer
tokens pnft transfer <mint> --to <recipient>
```

## Related

- [NFT Operations](/api/nft/index.md)
- [Simple NFT](/api/simple-nft/index.md)
