# Token Transfers

Transfer tokens between wallets.

## Quick Start

```typescript
import { getConfig, transferTokens } from 'ts-tokens'

const config = await getConfig()

const result = await transferTokens(
  'TokenMintAddress...',
  1000000, // amount
  'RecipientAddress...',
  config
)

console.log('Transferred:', result.signature)
```

## Parameters

| Parameter   | Type               | Description                        |
| ----------- | ------------------ | ---------------------------------- |
| `mint`      | string             | Token mint address                 |
| `amount`    | number             | Amount to transfer (in base units) |
| `recipient` | string             | Recipient wallet address           |
| `config`    | TokenConfig        | Configuration object               |
| `options`   | TransactionOptions | Optional transaction settings      |

## Examples

### Simple Transfer

```typescript
const result = await transferTokens(
  mintAddress,
  1_000_000_000, // 1 token with 9 decimals
  recipientAddress,
  config
)
```

### Transfer with Memo

```typescript
const result = await transferTokens(
  mintAddress,
  amount,
  recipientAddress,
  config,
  { memo: 'Payment for services' }
)
```

### Batch Transfers

```typescript
import { batchTransferTokens } from 'ts-tokens'

const transfers = [
  { recipient: 'Address1...', amount: 1000 },
  { recipient: 'Address2...', amount: 2000 },
  { recipient: 'Address3...', amount: 3000 },
]

const results = await batchTransferTokens(mintAddress, transfers, config)
```

## CLI Usage

```bash
# Transfer tokens
tokens token:transfer <mint> --amount 1000000 --to <recipient>

# Transfer with memo
tokens token:transfer <mint> --amount 1000000 --to <recipient> --memo "Payment"
```

## Notes

- Sender must have sufficient balance
- Creates ATA for recipient if it doesn't exist
- Transaction fees apply

## Related

- [Token Creation](./create.md)
- [Minting Tokens](./mint.md)
- [Burning Tokens](./burn.md)
