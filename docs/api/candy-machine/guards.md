# Candy Machine Guards

Configure guards to control minting access and payments.

## Overview

Guards are modular conditions that must be satisfied to mint from a Candy Machine. Multiple guards can be combined.

## Setting Guards

```typescript
import { getConfig, setCandyGuard } from 'ts-tokens'

const config = await getConfig()

await setCandyGuard('CANDY_MACHINE_ADDRESS', {
  solPayment: {
    lamports: 1_000_000_000n,
    destination: 'TREASURY_ADDRESS',
  },
  startDate: {
    date: BigInt(Math.floor(Date.now() / 1000) + 86400),
  },
  mintLimit: {
    id: 0,
    limit: 3,
  },
}, config)
```

## Available Guards

### Payment Guards

#### SOL Payment

```typescript
solPayment: {
  lamports: 1_000_000_000n, // 1 SOL
  destination: 'TREASURY_ADDRESS',
}
```

#### Token Payment

```typescript
tokenPayment: {
  amount: 100n,
  mint: 'TOKEN_MINT_ADDRESS',
  destinationAta: 'DESTINATION_ATA',
}
```

#### NFT Payment

```typescript
nftPayment: {
  requiredCollection: 'COLLECTION_MINT',
  destination: 'NFT_DESTINATION',
}
```

### Time Guards

#### Start Date

```typescript
startDate: {
  date: BigInt(1704067200), // Unix timestamp
}
```

#### End Date

```typescript
endDate: {
  date: BigInt(1706745600),
}
```

### Limit Guards

#### Mint Limit

```typescript
mintLimit: {
  id: 0,        // Unique ID for this limit
  limit: 3,     // Max mints per wallet
}
```

#### Redeemed Amount

```typescript
redeemedAmount: {
  maximum: 500n, // Max total mints
}
```

### Access Guards

#### Allowlist

```typescript
allowList: {
  merkleRoot: merkleRootBytes, // 32-byte Uint8Array
}
```

#### Address Gate

```typescript
addressGate: {
  address: 'ALLOWED_ADDRESS',
}
```

#### NFT Gate

```typescript
nftGate: {
  requiredCollection: 'COLLECTION_MINT',
}
```

#### Token Gate

```typescript
tokenGate: {
  amount: 1n,
  mint: 'TOKEN_MINT',
}
```

### Burn Guards

#### NFT Burn

```typescript
nftBurn: {
  requiredCollection: 'COLLECTION_MINT',
}
```

#### Token Burn

```typescript
tokenBurn: {
  amount: 100n,
  mint: 'TOKEN_MINT',
}
```

### Freeze Guards

#### Freeze SOL Payment

```typescript
freezeSolPayment: {
  lamports: 1_000_000_000n,
  destination: 'TREASURY_ADDRESS',
}
```

#### Freeze Token Payment

```typescript
freezeTokenPayment: {
  amount: 100n,
  mint: 'TOKEN_MINT',
  destinationAta: 'DESTINATION_ATA',
}
```

### Other Guards

#### Bot Tax

```typescript
botTax: {
  lamports: 10_000_000n, // 0.01 SOL penalty
  lastInstruction: true,
}
```

#### Third Party Signer

```typescript
thirdPartySigner: {
  signerKey: 'SIGNER_PUBLIC_KEY',
}
```

#### Gatekeeper

```typescript
gatekeeper: {
  gatekeeperNetwork: 'NETWORK_ADDRESS',
  expireOnUse: true,
}
```

#### Program Gate

```typescript
programGate: {
  additional: ['PROGRAM_ID_1', 'PROGRAM_ID_2'],
}
```

#### Allocation

```typescript
allocation: {
  id: 0,
  limit: 100,
}
```

## Guard Groups

Create multiple tiers with different guards:

```typescript
await setCandyGuard('CANDY_MACHINE_ADDRESS', {
  default: {
    solPayment: { lamports: 1_000_000_000n, destination: treasury },
    startDate: { date: publicSaleTime },
  },
  groups: [
    {
      label: 'OG',
      guards: {
        allowList: { merkleRoot: ogRoot },
        solPayment: { lamports: 500_000_000n, destination: treasury },
        startDate: { date: ogSaleTime },
      },
    },
    {
      label: 'WL',
      guards: {
        allowList: { merkleRoot: wlRoot },
        solPayment: { lamports: 750_000_000n, destination: treasury },
        startDate: { date: wlSaleTime },
      },
    },
  ],
}, config)
```

## CLI Usage

```bash
# Add SOL payment
tokens cm:guards <cm> --add sol-payment --amount 1 --destination <treasury>

# Add start date
tokens cm:guards <cm> --add start-date --date "2024-01-01T00:00:00Z"

# Add mint limit
tokens cm:guards <cm> --add mint-limit --limit 3

# Add allowlist
tokens cm:guards <cm> --add allowlist --file ./merkle.json
```

## Related

- [Creating Candy Machine](./create.md)
- [Minting](./mint.md)
- [Allowlist Setup](/guides/allowlist-setup.md)
