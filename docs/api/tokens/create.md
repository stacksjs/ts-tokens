# Token Creation

Create fungible tokens on Solana using ts-tokens.

## Quick Start

```typescript
import { createToken, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1000000,
}, config)

console.log('Token created:', result.mint)
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | Token name |
| `symbol` | string | Yes | Token symbol (max 10 chars) |
| `decimals` | number | Yes | Decimal places (0-9) |
| `initialSupply` | number | No | Initial tokens to mint |
| `mintAuthority` | string | No | Custom mint authority |
| `freezeAuthority` | string | No | Custom freeze authority |

## Return Value

```typescript
interface CreateTokenResult {
  mint: string           // Token mint address
  signature: string      // Transaction signature
  ata?: string          // Associated token account (if initialSupply > 0)
}
```

## Examples

### Create Token with Initial Supply

```typescript
const result = await createToken({
  name: 'Governance Token',
  symbol: 'GOV',
  decimals: 6,
  initialSupply: 10_000_000, // 10 million tokens
}, config)
```

### Create Token without Initial Supply

```typescript
const result = await createToken({
  name: 'Reward Token',
  symbol: 'RWD',
  decimals: 9,
}, config)

// Mint later
await mintTokens(result.mint, 1000, recipientAddress, config)
```

### Create Token with Custom Authorities

```typescript
const result = await createToken({
  name: 'Managed Token',
  symbol: 'MGD',
  decimals: 9,
  mintAuthority: 'CustomMintAuthority...',
  freezeAuthority: 'CustomFreezeAuthority...',
}, config)
```

## CLI Usage

```bash
# Create a new token
tokens token:create --name "My Token" --symbol MTK --decimals 9

# Create with initial supply
tokens token:create --name "My Token" --symbol MTK --decimals 9 --supply 1000000
```

## Related

- [Minting Tokens](./mint.md)
- [Token Metadata](./metadata.md)
- [Authority Management](./authority.md)
