# Managing Candy Machine

Update, withdraw, and manage your Candy Machine.

## Get Candy Machine Info

```typescript
import { getCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const cm = await getCandyMachine('CANDY_MACHINE_ADDRESS', config)

console.log('Items Available:', cm.itemsAvailable)
console.log('Items Redeemed:', cm.itemsRedeemed)
console.log('Items Remaining:', cm.itemsAvailable - cm.itemsRedeemed)
```

## Update Candy Machine

```typescript
import { updateCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

await updateCandyMachine('CANDY_MACHINE_ADDRESS', {
  symbol: 'NEWMINT',
  sellerFeeBasisPoints: 750,
  isMutable: false,
}, config)
```

### Updatable Fields

| Field | Description |
|-------|-------------|
| `symbol` | NFT symbol |
| `sellerFeeBasisPoints` | Royalty percentage |
| `isMutable` | Allow metadata updates |
| `creators` | Creator list |
| `hiddenSettings` | Hidden/reveal settings |

## Add Config Lines

```typescript
import { addConfigLines, getConfig } from 'ts-tokens'

const config = await getConfig()

const items = [
  { name: '1', uri: 'abc123' },
  { name: '2', uri: 'def456' },
  { name: '3', uri: 'ghi789' },
]

await addConfigLines(
  'CANDY_MACHINE_ADDRESS',
  0, // Starting index
  items,
  config
)
```

## Withdraw Funds

Withdraw SOL from the Candy Machine:

```typescript
import { withdrawFromCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await withdrawFromCandyMachine(
  'CANDY_MACHINE_ADDRESS',
  config
)

console.log('Withdrawn! Signature:', result.signature)
```

## Transfer Authority

Transfer Candy Machine authority to another wallet:

```typescript
import { setCandyMachineAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

await setCandyMachineAuthority(
  'CANDY_MACHINE_ADDRESS',
  'NEW_AUTHORITY_ADDRESS',
  config
)
```

## Delete Candy Machine

Close the Candy Machine and reclaim rent:

```typescript
import { deleteCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

await deleteCandyMachine('CANDY_MACHINE_ADDRESS', config)
```

**Warning**: This is irreversible. Ensure all minting is complete.

## Reveal Hidden NFTs

After minting completes, reveal the NFTs:

```typescript
import { revealCandyMachine, getConfig } from 'ts-tokens'

const config = await getConfig()

// Update all NFT metadata to revealed versions
await revealCandyMachine('CANDY_MACHINE_ADDRESS', {
  baseUri: 'https://arweave.net/revealed/',
}, config)
```

## CLI Usage

```bash
# Get info
tokens cm:info <candy-machine>

# Update
tokens cm:update <candy-machine> --royalty 750

# Add config lines
tokens cm:upload <candy-machine> --assets ./assets/

# Withdraw
tokens cm:withdraw <candy-machine>

# Transfer authority
tokens cm:authority <candy-machine> --new-authority <address>
```

## Monitoring

### Check Mint Progress

```typescript
const cm = await getCandyMachine(address, config)

const progress = {
  total: Number(cm.itemsAvailable),
  minted: Number(cm.itemsRedeemed),
  remaining: Number(cm.itemsAvailable - cm.itemsRedeemed),
  percentage: Number((cm.itemsRedeemed * 100n) / cm.itemsAvailable),
}

console.log(`Progress: ${progress.minted}/${progress.total} (${progress.percentage}%)`)
```

### Check Revenue

```typescript
const cm = await getCandyMachine(address, config)
const price = 1_000_000_000n // 1 SOL

const revenue = {
  total: Number(cm.itemsRedeemed) * Number(price) / 1e9,
  currency: 'SOL',
}

console.log(`Revenue: ${revenue.total} ${revenue.currency}`)
```

## Related

- [Creating Candy Machine](./create.md)
- [Guard Configuration](./guards.md)
- [Minting](./mint.md)
