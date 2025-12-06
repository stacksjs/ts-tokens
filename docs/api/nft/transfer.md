# Transferring NFTs

Transfer NFTs between wallets.

## Quick Start

```typescript
import { getConfig, transferNFT } from 'ts-tokens'

const config = await getConfig()

const result = await transferNFT(
  'NFT_MINT_ADDRESS',
  'RECIPIENT_ADDRESS',
  config
)

console.log('Transferred! Signature:', result.signature)
```

## Parameters

| Parameter   | Type        | Description              |
| ----------- | ----------- | ------------------------ |
| `mint`      | string      | NFT mint address         |
| `recipient` | string      | Recipient wallet address |
| `config`    | TokenConfig | Configuration object     |

## Return Value

```typescript
interface TransferResult {
  signature: string // Transaction signature
  fromAta: string // Source token account
  toAta: string // Destination token account
}
```

## Examples

### Basic Transfer

```typescript
const result = await transferNFT(nftMint, recipient, config)
```

### Batch Transfer

```typescript
const nfts = ['mint1...', 'mint2...', 'mint3...']
const recipient = 'RECIPIENT_ADDRESS'

for (const mint of nfts) {
  const result = await transferNFT(mint, recipient, config)
  console.log(`Transferred ${mint}: ${result.signature}`)
}
```

### Transfer with Memo

```typescript
const result = await transferNFT(nftMint, recipient, config, {
  memo: 'Gift for you!',
})
```

## Error Handling

```typescript
try {
  await transferNFT(nftMint, recipient, config)
}
catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.log('Not enough SOL for transaction fee')
  }
  else if (error.message.includes('not owned')) {
    console.log('You do not own this NFT')
  }
  else {
    console.error('Transfer failed:', error.message)
  }
}
```

## CLI Usage

```bash
tokens nft:transfer <mint> --to <recipient>
```

## Programmable NFTs (pNFTs)

For pNFTs, additional accounts may be required:

```typescript
const result = await transferProgrammableNFT(
  nftMint,
  recipient,
  config,
  {
    authorizationRules: 'RULE_SET_ADDRESS',
  }
)
```

## Related

- [Creating NFTs](./create.md)
- [NFT Metadata](./metadata.md)
- [Collections](./collection.md)
