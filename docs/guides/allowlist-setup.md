# Configure Allowlists

Set up allowlists for your Candy Machine to enable presale access.

## How Allowlists Work

Allowlists use Merkle trees for efficient on-chain verification:

1. Create a list of allowed wallet addresses
2. Generate a Merkle tree from the list
3. Store only the Merkle root on-chain
4. Users provide a Merkle proof when minting

## Step 1: Create Your Allowlist

Create a JSON file with allowed addresses:

```json
{
  "addresses": [
    "Address1...",
    "Address2...",
    "Address3...",
    "Address4..."
  ]
}
```

Or a CSV file:

```csv
address
Address1...
Address2...
Address3...
```

## Step 2: Generate Merkle Tree

```typescript
import { createMerkleTree, getConfig } from 'ts-tokens'

const addresses = [
  'Address1...',
  'Address2...',
  'Address3...',
]

const { root, proofs } = createMerkleTree(addresses)

console.log('Merkle root:', root)

// Save proofs for distribution
for (const [address, proof] of Object.entries(proofs)) {
  console.log(`${address}: ${JSON.stringify(proof)}`)
}
```

## Step 3: Add Allowlist Guard

```typescript
import { setCandyGuard, getConfig } from 'ts-tokens'

const config = await getConfig()

await setCandyGuard('CANDY_MACHINE_ADDRESS', {
  allowList: {
    merkleRoot: root, // 32-byte Uint8Array
  },
  // Optionally combine with other guards
  solPayment: {
    lamports: 500_000_000n, // 0.5 SOL presale price
    destination: 'TREASURY_ADDRESS',
  },
  startDate: {
    date: BigInt(presaleStartTime),
  },
}, config)
```

## Step 4: Mint with Proof

Users need their Merkle proof to mint:

```typescript
import { mintFromCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const proof = [
  'ProofHash1...',
  'ProofHash2...',
  'ProofHash3...',
]

const nft = await mintFromCandyMachine(
  'CANDY_MACHINE_ADDRESS',
  config,
  { allowListProof: proof }
)
```

## Using the CLI

```bash
# Generate Merkle tree from file
tokens allowlist:create --input ./allowlist.json --output ./merkle.json

# Add allowlist guard
tokens cm:guards <candy-machine> --add allowlist --file ./merkle.json

# Mint with proof
tokens cm:mint <candy-machine> --proof ./my-proof.json
```

## Multiple Allowlist Tiers

Create different tiers with guard groups:

```typescript
await setCandyGuard('CANDY_MACHINE_ADDRESS', {
  // Default (public sale)
  default: {
    solPayment: { lamports: 1_000_000_000n, destination: treasury },
    startDate: { date: publicSaleTime },
  },
  // OG tier
  groups: [
    {
      label: 'OG',
      guards: {
        allowList: { merkleRoot: ogMerkleRoot },
        solPayment: { lamports: 500_000_000n, destination: treasury },
        startDate: { date: ogSaleTime },
        mintLimit: { id: 1, limit: 2 },
      },
    },
    {
      label: 'WL',
      guards: {
        allowList: { merkleRoot: wlMerkleRoot },
        solPayment: { lamports: 750_000_000n, destination: treasury },
        startDate: { date: wlSaleTime },
        mintLimit: { id: 2, limit: 1 },
      },
    },
  ],
}, config)
```

## Distributing Proofs

### API Endpoint

Create an API to serve proofs:

```typescript
// api/proof/[address].ts
import { getProof } from './merkle-data'

export async function GET(request: Request) {
  const address = request.params.address
  const proof = getProof(address)

  if (!proof) {
    return Response.json({ error: 'Not on allowlist' }, { status: 404 })
  }

  return Response.json({ proof })
}
```

### Frontend Integration

```typescript
async function mint() {
  // Fetch proof for connected wallet
  const response = await fetch(`/api/proof/${walletAddress}`)
  const { proof } = await response.json()

  // Mint with proof
  await mintFromCandyMachine(candyMachine, config, {
    allowListProof: proof
  })
}
```

## Verifying Addresses

Check if an address is on the allowlist:

```typescript
import { verifyMerkleProof } from 'ts-tokens'

const isAllowed = verifyMerkleProof(
  address,
  proof,
  merkleRoot
)

console.log('Is allowed:', isAllowed)
```

## Best Practices

1. **Keep proofs secure** - Don't expose all proofs publicly
2. **Use multiple tiers** - Reward early supporters
3. **Set mint limits** - Prevent whales from dominating
4. **Test on devnet** - Verify proofs work before mainnet

## Next Steps

- [Understanding Royalties](./royalties.md)
- [Candy Machine Guards](/api/candy-machine/guards.md)
