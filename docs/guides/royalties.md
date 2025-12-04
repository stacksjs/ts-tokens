# Understanding Royalties

Learn how royalties work on Solana NFTs.

## What Are Royalties?

Royalties are fees paid to creators when NFTs are resold on secondary markets. On Solana, royalties are:

- Set in **basis points** (1/100 of a percent)
- Split among **creators** based on shares
- **Optional** for marketplaces to enforce

## Setting Royalties

### Basis Points

| Basis Points | Percentage |
|--------------|------------|
| 100 | 1% |
| 250 | 2.5% |
| 500 | 5% |
| 1000 | 10% |

### Single Creator

```typescript
const nft = await createNFT({
  name: 'My NFT',
  symbol: 'MNFT',
  uri: 'https://...',
  sellerFeeBasisPoints: 500, // 5% royalty
  creators: [
    { address: 'CreatorAddress...', share: 100 }
  ],
}, config)
```

### Multiple Creators

Shares must total 100:

```typescript
const nft = await createNFT({
  name: 'My NFT',
  symbol: 'MNFT',
  uri: 'https://...',
  sellerFeeBasisPoints: 1000, // 10% total royalty
  creators: [
    { address: 'Artist...', share: 70 },      // Gets 7%
    { address: 'Developer...', share: 20 },   // Gets 2%
    { address: 'Marketer...', share: 10 },    // Gets 1%
  ],
}, config)
```

## Royalty Calculation

For a 10,000 SOL sale with 5% royalty:

- Total royalty: 500 SOL
- If creator shares are 70/30:
  - Creator 1: 350 SOL
  - Creator 2: 150 SOL

```typescript
function calculateRoyalty(
  salePrice: number,
  basisPoints: number,
  creatorShare: number
): number {
  const totalRoyalty = (salePrice * basisPoints) / 10000
  return (totalRoyalty * creatorShare) / 100
}
```

## Creator Verification

Creators must verify their address to receive royalties:

```typescript
import { verifyCreator, getConfig } from 'ts-tokens'

const config = await getConfig()

// Creator signs to verify
await verifyCreator('NFT_MINT_ADDRESS', config)
```

Using CLI:

```bash
tokens nft:verify-creator <mint>
```

## Updating Royalties

If the NFT is mutable, you can update royalties:

```typescript
import { updateNFTMetadata, getConfig } from 'ts-tokens'

const config = await getConfig()

await updateNFTMetadata('NFT_MINT_ADDRESS', {
  sellerFeeBasisPoints: 750, // Change to 7.5%
}, config)
```

## Collection-Wide Royalties

Set default royalties for a collection:

```typescript
const collection = await createCollection({
  name: 'My Collection',
  symbol: 'MCOL',
  uri: 'https://...',
  sellerFeeBasisPoints: 500, // Default 5%
}, config)

// NFTs inherit collection royalties
const nft = await createNFT({
  name: 'NFT #1',
  symbol: 'MCOL',
  uri: 'https://...',
  collection: collection.mint,
  // sellerFeeBasisPoints inherited from collection
}, config)
```

## Royalty Enforcement

### Standard NFTs

Royalties are **optional** - marketplaces choose whether to enforce them.

### Programmable NFTs (pNFTs)

pNFTs can enforce royalties through rule sets:

```typescript
const nft = await createProgrammableNFT({
  name: 'My pNFT',
  symbol: 'PNFT',
  uri: 'https://...',
  sellerFeeBasisPoints: 500,
  ruleSet: 'RULE_SET_ADDRESS', // Enforces royalties
}, config)
```

## Best Practices

1. **Set reasonable royalties** - 5-10% is standard
2. **Verify all creators** - Unverified creators don't receive royalties
3. **Consider pNFTs** - For enforced royalties
4. **Document royalty splits** - Be transparent with your community
5. **Plan for the future** - Consider if you need to update royalties

## Marketplace Support

Major marketplaces and their royalty policies:

| Marketplace | Enforced | Optional |
|-------------|----------|----------|
| Magic Eden | ✓ | - |
| Tensor | - | ✓ |
| OpenSea | ✓ | - |

## Tax Considerations

Royalty income may be taxable. Consult a tax professional for guidance on:

- Income reporting
- Business structure
- International considerations

## Next Steps

- [Metadata Standards](./metadata-standards.md)
- [Programmable NFTs](/api/nft/programmable.md)
