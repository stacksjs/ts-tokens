# Burning Tokens

Permanently destroy tokens from circulation.

## Quick Start

```typescript
import { burnTokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await burnTokens(
  'TokenMintAddress...',
  1000000, // amount to burn
  config
)

console.log('Burned:', result.signature)
```

## Parameters

| Parameter | Type               | Description                    |
| --------- | ------------------ | ------------------------------ |
| `mint`    | string             | Token mint address             |
| `amount`  | number             | Amount to burn (in base units) |
| `config`  | TokenConfig        | Configuration object           |
| `options` | TransactionOptions | Optional transaction settings  |

## Examples

### Burn from Own Wallet

```typescript
const result = await burnTokens(
  mintAddress,
  500_000_000, // 0.5 tokens with 9 decimals
  config
)
```

### Burn and Close Account

```typescript
import { burnTokens, closeTokenAccount } from 'ts-tokens'

// Burn all tokens
await burnTokens(mintAddress, fullBalance, config)

// Close the empty account to reclaim rent
await closeTokenAccount(mintAddress, config)
```

## CLI Usage

```bash
# Burn tokens
tokens token:burn <mint> --amount 1000000

# Burn all tokens
tokens token:burn <mint> --all
```

## Notes

- Burning is irreversible
- Only burns from your own token account
- Reduces total supply permanently

## Related

- [Token Creation](./create.md)
- [Token Transfers](./transfer.md)
- [Authority Management](./authority.md)
