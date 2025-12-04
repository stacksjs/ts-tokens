# Set Up a Candy Machine NFT Drop

Learn how to create a Candy Machine for automated NFT minting.

## What is a Candy Machine?

A Candy Machine is a Solana program that automates NFT minting. It handles:

- Sequential or random minting
- Payment collection
- Mint limits and allowlists
- Reveal mechanics

## Prerequisites

- Collection created (see [Create NFT Collection](./create-nft-collection.md))
- NFT metadata uploaded
- Wallet with SOL for deployment

## Step 1: Prepare Assets

Create an assets directory:

```text
assets/
├── 0.json    # Metadata for NFT #0
├── 0.png     # Image for NFT #0
├── 1.json
├── 1.png
├── 2.json
├── 2.png
└── ...
```

Metadata format:

```json
{
  "name": "My NFT #0",
  "symbol": "MNFT",
  "description": "NFT from my collection",
  "image": "0.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" }
  ]
}
```

## Step 2: Upload Assets

```typescript
import { uploadAssets, getConfig } from 'ts-tokens'

const config = await getConfig()

const { items, collectionUri } = await uploadAssets({
  assetsPath: './assets',
  storage: 'arweave',
}, config)

console.log('Uploaded', items.length, 'items')
```

## Step 3: Create the Candy Machine

```typescript
import { createCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const cm = await createCandyMachine({
  collection: 'COLLECTION_MINT_ADDRESS',
  itemsAvailable: 1000,
  symbol: 'MNFT',
  sellerFeeBasisPoints: 500,
  maxSupply: 0, // 0 = unlimited editions per NFT
  isMutable: true,
  creators: [
    { address: config.wallet.publicKey, share: 100 }
  ],
  configLineSettings: {
    prefixName: 'My NFT #',
    nameLength: 4,
    prefixUri: 'https://arweave.net/',
    uriLength: 50,
    isSequential: false,
  },
}, config)

console.log('Candy Machine:', cm.address)
```

## Step 4: Add Config Lines

```typescript
import { addConfigLines, getConfig } from 'ts-tokens'

const config = await getConfig()

// Add items in batches
const items = [
  { name: '0', uri: 'abc123' },
  { name: '1', uri: 'def456' },
  { name: '2', uri: 'ghi789' },
  // ...
]

await addConfigLines(
  'CANDY_MACHINE_ADDRESS',
  0, // starting index
  items,
  config
)
```

## Step 5: Add Guards

Guards control who can mint and when:

```typescript
import { setCandyGuard, getConfig } from 'ts-tokens'

const config = await getConfig()

await setCandyGuard('CANDY_MACHINE_ADDRESS', {
  // SOL payment
  solPayment: {
    lamports: 1_000_000_000n, // 1 SOL
    destination: 'TREASURY_ADDRESS',
  },

  // Start date
  startDate: {
    date: BigInt(Date.now() / 1000 + 86400), // Tomorrow
  },

  // Mint limit per wallet
  mintLimit: {
    id: 0,
    limit: 3,
  },
}, config)
```

## Step 6: Mint from Candy Machine

```typescript
import { mintFromCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const nft = await mintFromCandyMachine(
  'CANDY_MACHINE_ADDRESS',
  config
)

console.log('Minted NFT:', nft.mint)
```

## Using the CLI

```bash
# Create candy machine
tokens cm:create \
  --collection <collection-mint> \
  --items 1000 \
  --price 1 \
  --symbol MNFT

# Upload assets
tokens cm:upload <candy-machine> --assets ./assets/

# Add guards
tokens cm:guards <candy-machine> \
  --add sol-payment --amount 1 --destination <treasury>

# Mint
tokens cm:mint <candy-machine>
```

## Guard Types

| Guard | Description |
|-------|-------------|
| `solPayment` | Require SOL payment |
| `tokenPayment` | Require SPL token payment |
| `startDate` | Minting starts at date |
| `endDate` | Minting ends at date |
| `mintLimit` | Max mints per wallet |
| `allowList` | Merkle tree allowlist |
| `nftGate` | Require NFT ownership |
| `tokenGate` | Require token ownership |
| `redeemedAmount` | Max total mints |

## Hidden Settings (Reveal)

For reveal mechanics:

```typescript
const cm = await createCandyMachine({
  // ...
  hiddenSettings: {
    name: 'Unrevealed NFT',
    uri: 'https://arweave.net/placeholder.json',
    hash: hashOfFinalOrder, // 32-byte hash
  },
}, config)
```

After mint completes, reveal by updating metadata.

## Withdraw Funds

```typescript
import { withdrawFromCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

await withdrawFromCandyMachine('CANDY_MACHINE_ADDRESS', config)
```

## Next Steps

- [Configure Allowlists](./allowlist-setup.md)
- [Understanding Royalties](./royalties.md)
- [Candy Machine API](/api/candy-machine/create.md)
