# Minting from Candy Machine

Mint NFTs from a Candy Machine.

## Quick Start

```typescript
import { mintFromCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const nft = await mintFromCandyMachine(
  'CANDY_MACHINE_ADDRESS',
  config
)

console.log('Minted NFT:', nft.mint)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `candyMachine` | string | Candy Machine address |
| `config` | TokenConfig | Configuration object |
| `options` | MintOptions | Optional mint options |

## Mint Options

```typescript
interface MintOptions {
  // For allowlist minting
  allowListProof?: string[]

  // For group minting
  group?: string

  // Custom NFT mint keypair
  nftMint?: Keypair
}
```

## Examples

### Basic Mint

```typescript
const nft = await mintFromCandyMachine(candyMachine, config)
```

### Mint with Allowlist Proof

```typescript
const proof = ['hash1...', 'hash2...', 'hash3...']

const nft = await mintFromCandyMachine(candyMachine, config, {
  allowListProof: proof,
})
```

### Mint from Specific Group

```typescript
const nft = await mintFromCandyMachine(candyMachine, config, {
  group: 'OG',
  allowListProof: ogProof,
})
```

### Batch Minting

```typescript
const count = 5
const nfts = []

for (let i = 0; i < count; i++) {
  const nft = await mintFromCandyMachine(candyMachine, config)
  nfts.push(nft)
  console.log(`Minted ${i + 1}/${count}:`, nft.mint)
}
```

## Return Value

```typescript
interface MintResult {
  mint: string           // NFT mint address
  metadata: string       // Metadata account address
  masterEdition: string  // Master edition address
  tokenAccount: string   // Token account address
  signature: string      // Transaction signature
}
```

## Error Handling

```typescript
try {
  const nft = await mintFromCandyMachine(candyMachine, config)
} catch (error) {
  if (error.message.includes('NotLiveYet')) {
    console.log('Minting has not started yet')
  } else if (error.message.includes('SoldOut')) {
    console.log('Candy Machine is sold out')
  } else if (error.message.includes('MintLimitReached')) {
    console.log('You have reached your mint limit')
  } else if (error.message.includes('NotAllowed')) {
    console.log('You are not on the allowlist')
  } else {
    console.error('Mint failed:', error.message)
  }
}
```

## Checking Eligibility

Before minting, check if the user can mint:

```typescript
import { canMint, getConfig } from 'ts-tokens'

const config = await getConfig()

const eligibility = await canMint(candyMachine, config)

if (eligibility.canMint) {
  console.log('Ready to mint!')
  console.log('Price:', eligibility.price, 'SOL')
} else {
  console.log('Cannot mint:', eligibility.reason)
}
```

## CLI Usage

```bash
# Mint one NFT
tokens cm:mint <candy-machine>

# Mint multiple
tokens cm:mint <candy-machine> --count 5

# Mint with group
tokens cm:mint <candy-machine> --group OG --proof ./proof.json
```

## Related

- [Creating Candy Machine](./create.md)
- [Guard Configuration](./guards.md)
- [Managing Candy Machine](./manage.md)
