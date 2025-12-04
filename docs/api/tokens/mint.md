# Minting Tokens

Mint additional tokens to any address.

## Quick Start

```typescript
import { mintTokens, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await mintTokens(
  'TokenMintAddress...',
  1000000,  // amount
  'RecipientAddress...',
  config
)

console.log('Minted:', result.signature)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `mint` | string | Token mint address |
| `amount` | number | Amount to mint (in base units) |
| `recipient` | string | Recipient wallet address |
| `config` | TokenConfig | Configuration object |
| `options` | TransactionOptions | Optional transaction settings |

## Examples

### Mint to Self

```typescript
const result = await mintTokens(
  mintAddress,
  1_000_000_000, // 1 token with 9 decimals
  myWalletAddress,
  config
)
```

### Mint to Another Address

```typescript
const result = await mintTokens(
  mintAddress,
  500_000_000, // 0.5 tokens with 9 decimals
  recipientAddress,
  config
)
```

### Batch Minting

```typescript
const recipients = [
  { address: 'Address1...', amount: 1000 },
  { address: 'Address2...', amount: 2000 },
  { address: 'Address3...', amount: 3000 },
]

for (const { address, amount } of recipients) {
  await mintTokens(mintAddress, amount, address, config)
}
```

## CLI Usage

```bash
# Mint tokens
tokens token:mint <mint> --amount 1000000 --to <recipient>

# Mint to self
tokens token:mint <mint> --amount 1000000
```

## Notes

- Only the mint authority can mint tokens
- Amount is in base units (consider decimals)
- Creates ATA for recipient if it doesn't exist

## Related

- [Token Creation](./create.md)
- [Token Transfers](./transfer.md)
- [Authority Management](./authority.md)
