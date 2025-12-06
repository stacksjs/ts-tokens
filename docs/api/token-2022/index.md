# Token-2022 (SPL Token Extensions)

Create tokens with advanced features using Token-2022.

## Overview

Token-2022 is the next-generation SPL Token program with powerful extensions:

| Extension              | Description                           |
| ---------------------- | ------------------------------------- |
| Transfer Fees          | Automatic fee collection on transfers |
| Interest-Bearing       | Tokens that accrue interest over time |
| Non-Transferable       | Soulbound tokens                      |
| Permanent Delegate     | Delegate that can't be revoked        |
| Transfer Hook          | Custom logic on transfers             |
| Metadata Pointer       | On-chain metadata                     |
| Confidential Transfers | Private balances                      |
| Default Account State  | Frozen by default                     |

## Quick Start

```typescript
import { createToken2022, getConfig } from 'ts-tokens'

const config = await getConfig()

// Create token with transfer fees
const token = await createToken2022({
  name: 'Fee Token',
  symbol: 'FEE',
  decimals: 9,
  extensions: [
    {
      type: 'transferFee',
      feeBasisPoints: 100, // 1%
      maxFee: 1_000_000_000n, // 1 token max
      feeAuthority: config.wallet.publicKey,
      withdrawAuthority: config.wallet.publicKey,
    },
  ],
}, config)
```

## Available Extensions

### Transfer Fees

Automatically collect fees on every transfer:

```typescript
const token = await createToken2022({
  // ...
  extensions: [
    {
      type: 'transferFee',
      feeBasisPoints: 250, // 2.5%
      maxFee: 10_000_000_000n,
      feeAuthority: authority,
      withdrawAuthority: treasury,
    },
  ],
})
```

### Interest-Bearing

Tokens that grow over time:

```typescript
const token = await createToken2022({
  // ...
  extensions: [
    {
      type: 'interestBearing',
      rate: 500, // 5% APY (in basis points)
      rateAuthority: authority,
    },
  ],
})
```

### Non-Transferable (Soulbound)

Tokens that can't be transferred:

```typescript
const token = await createToken2022({
  // ...
  extensions: [
    { type: 'nonTransferable' },
  ],
})
```

### Permanent Delegate

A delegate that can always transfer:

```typescript
const token = await createToken2022({
  // ...
  extensions: [
    {
      type: 'permanentDelegate',
      delegate: delegateAddress,
    },
  ],
})
```

### Transfer Hook

Custom program called on transfers:

```typescript
const token = await createToken2022({
  // ...
  extensions: [
    {
      type: 'transferHook',
      programId: hookProgramId,
      authority,
    },
  ],
})
```

### Metadata Pointer

Point to on-chain metadata:

```typescript
const token = await createToken2022({
  // ...
  extensions: [
    {
      type: 'metadataPointer',
      metadataAddress: metadataAccount,
      authority,
    },
  ],
})
```

## CLI Usage

```bash
# Create with transfer fee
tokens create --token-2022 --transfer-fee 100 --name "Fee Token" --symbol FEE

# Create interest-bearing
tokens create --token-2022 --interest-rate 500 --name "Yield Token" --symbol YIELD

# Create soulbound
tokens create --token-2022 --soulbound --name "Badge" --symbol BADGE

# Collect fees
tokens fees collect <mint>

# Withdraw fees
tokens fees withdraw <mint> --to <treasury>
```

## Combining Extensions

You can combine multiple extensions:

```typescript
const token = await createToken2022({
  name: 'Advanced Token',
  symbol: 'ADV',
  decimals: 9,
  extensions: [
    { type: 'transferFee', feeBasisPoints: 100, ... },
    { type: 'metadataPointer', metadataAddress: metadata },
    { type: 'mintCloseAuthority', closeAuthority: authority },
  ],
})
```

## Migration from SPL Token

Token-2022 is backwards compatible. Existing tools work, but:

1. Use `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` program ID
2. Account sizes are larger (extensions add space)
3. Some wallets may not support all extensions yet

## Related

- [Transfer Fees](./transfer-fees.md)
- [Interest-Bearing](./interest-bearing.md)
- [Soulbound Tokens](./soulbound.md)
