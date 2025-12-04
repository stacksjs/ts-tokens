# Creating a Candy Machine

Create a Candy Machine for automated NFT minting.

## Quick Start

```typescript
import { createCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const cm = await createCandyMachine({
  collection: 'CollectionMintAddress...',
  itemsAvailable: 1000,
  symbol: 'MNFT',
  sellerFeeBasisPoints: 500,
  creators: [
    { address: config.wallet.publicKey, share: 100 }
  ],
}, config)

console.log('Candy Machine:', cm.address)
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `collection` | string | Yes | Collection mint address |
| `itemsAvailable` | number | Yes | Total items available |
| `symbol` | string | Yes | NFT symbol |
| `sellerFeeBasisPoints` | number | Yes | Royalty (500 = 5%) |
| `creators` | Creator[] | Yes | Creator list |
| `configLineSettings` | object | No | Config line settings |
| `hiddenSettings` | object | No | Hidden/reveal settings |
| `isMutable` | boolean | No | Allow metadata updates |
| `maxSupply` | number | No | Max editions per NFT |

## Config Line Settings

For collections with unique metadata per NFT:

```typescript
const cm = await createCandyMachine({
  // ...
  configLineSettings: {
    prefixName: 'My NFT #',
    nameLength: 4,
    prefixUri: 'https://arweave.net/',
    uriLength: 50,
    isSequential: false,
  },
}, config)
```

| Option | Description |
|--------|-------------|
| `prefixName` | Common prefix for all names |
| `nameLength` | Max length of unique name part |
| `prefixUri` | Common prefix for all URIs |
| `uriLength` | Max length of unique URI part |
| `isSequential` | Mint in order (true) or random (false) |

## Hidden Settings

For reveal mechanics:

```typescript
const cm = await createCandyMachine({
  // ...
  hiddenSettings: {
    name: 'Unrevealed NFT',
    uri: 'https://arweave.net/placeholder.json',
    hash: hashOfFinalOrder, // 32-byte Uint8Array
  },
}, config)
```

## Return Value

```typescript
interface CreateCandyMachineResult {
  address: string      // Candy Machine address
  signature: string    // Transaction signature
}
```

## CLI Usage

```bash
tokens cm:create \
  --collection <mint> \
  --items 1000 \
  --price 1 \
  --symbol MNFT \
  --royalty 500
```

## Related

- [Adding Config Lines](./config-lines.md)
- [Guard Configuration](./guards.md)
- [Minting](./mint.md)
