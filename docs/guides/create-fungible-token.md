# Create Your First Fungible Token

Learn how to create a fungible token on Solana using ts-tokens.

## Prerequisites

- Node.js 18+ or Bun installed
- Solana CLI configured with a wallet
- Some devnet SOL for testing

## Step 1: Install ts-tokens

```bash
bun add ts-tokens
# or
npm install ts-tokens
```

## Step 2: Configure Your Project

Create a `tokens.config.ts` file:

```typescript
import { defineConfig } from 'ts-tokens'

export default defineConfig({
  network: 'devnet',
  wallet: {
    path: '~/.config/solana/id.json',
  },
})
```

## Step 3: Create the Token

```typescript
import { createToken, getConfig } from 'ts-tokens'

async function main() {
  const config = await getConfig()

  const token = await createToken({
    name: 'My Awesome Token',
    symbol: 'MAT',
    decimals: 9,
    initialSupply: 1_000_000_000_000, // 1000 tokens
  }, config)

  console.log('Token created!')
  console.log('Mint address:', token.mint)
  console.log('Signature:', token.signature)
}

main()
```

## Step 4: Mint More Tokens

```typescript
import { mintTokens, getConfig } from 'ts-tokens'

async function mintMore() {
  const config = await getConfig()

  const result = await mintTokens(
    'YOUR_MINT_ADDRESS',
    500_000_000_000, // 500 more tokens
    'RECIPIENT_ADDRESS',
    config
  )

  console.log('Minted! Signature:', result.signature)
}
```

## Step 5: Transfer Tokens

```typescript
import { transferTokens, getConfig } from 'ts-tokens'

async function transfer() {
  const config = await getConfig()

  const result = await transferTokens(
    'YOUR_MINT_ADDRESS',
    100_000_000_000, // 100 tokens
    'RECIPIENT_ADDRESS',
    config
  )

  console.log('Transferred! Signature:', result.signature)
}
```

## Using the CLI

You can also use the CLI for quick operations:

```bash
# Create token
tokens token:create --name "My Token" --symbol MAT --decimals 9 --supply 1000000000000

# Mint more
tokens token:mint <mint> --amount 500000000000 --to <recipient>

# Transfer
tokens token:transfer <mint> --amount 100000000000 --to <recipient>

# Check balance
tokens token:balance <mint>
```

## Understanding Decimals

Solana tokens use base units. With 9 decimals:

- 1 token = 1,000,000,000 base units
- 0.5 tokens = 500,000,000 base units

```typescript
// Helper to convert
const toBaseUnits = (amount: number, decimals: number) =>
  BigInt(amount * Math.pow(10, decimals))

const supply = toBaseUnits(1000, 9) // 1000 tokens
```

## Adding Token Metadata

For tokens to display properly in wallets, add metadata:

```typescript
const token = await createToken({
  name: 'My Awesome Token',
  symbol: 'MAT',
  decimals: 9,
  initialSupply: 1_000_000_000_000,
  metadata: {
    uri: 'https://arweave.net/your-metadata.json',
    sellerFeeBasisPoints: 0,
  },
}, config)
```

Metadata JSON format:

```json
{
  "name": "My Awesome Token",
  "symbol": "MAT",
  "description": "An awesome token on Solana",
  "image": "https://arweave.net/your-logo.png"
}
```

## Next Steps

- [Create an NFT Collection](./create-nft-collection.md)
- [Set up a Candy Machine](./candy-machine-drop.md)
- [Token API Reference](/api/tokens/create.md)
