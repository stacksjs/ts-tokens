# Wallet Integrations

Connect to Solana wallets.

## Overview

ts-tokens provides adapters for popular wallets:

- **Phantom** - Most popular Solana wallet
- **Solflare** - Feature-rich wallet
- **Backpack** - xNFT-enabled wallet
- **Ledger** - Hardware wallet
- **And more** - Coinbase, Trust, Exodus, Brave, Glow

## Check Available Wallets

```typescript
import { wallets } from 'ts-tokens'

const available = wallets.getAvailableWallets()
console.log('Installed wallets:', available)
// ['phantom', 'solflare', 'backpack']
```

## Get Wallet Metadata

```typescript
import { wallets } from 'ts-tokens'

const phantom = wallets.getWalletMetadata('phantom')

console.log('Name:', phantom.name)
console.log('Icon:', phantom.icon)
console.log('Download:', phantom.downloadUrl)
console.log('Capabilities:', phantom.capabilities)
```

## Create Wallet Adapter

```typescript
import { wallets } from 'ts-tokens'

const adapter = wallets.createWalletAdapter('phantom')

if (adapter) {
  await adapter.connect()
  console.log('Connected:', adapter.publicKey?.toBase58())
}
```

## Connect to Wallet

```typescript
import { wallets } from 'ts-tokens'

const adapter = wallets.createWalletAdapter('phantom')

try {
  await adapter?.connect()
  console.log('Connected!')
}
catch (error) {
  console.error('Connection failed:', error)
}
```

## Sign Transaction

```typescript
import { wallets } from 'ts-tokens'

const adapter = wallets.createWalletAdapter('phantom')
await adapter?.connect()

const signedTx = await adapter?.signTransaction(transaction)
```

## Sign Message

```typescript
import { wallets } from 'ts-tokens'

const adapter = wallets.createWalletAdapter('phantom')
await adapter?.connect()

const message = new TextEncoder().encode('Hello, Solana!')
const signature = await adapter?.signMessage(message)
```

## Mobile Deep Links

### Phantom

```typescript
import { wallets } from 'ts-tokens'

// Connect
const connectLink = wallets.phantomConnectLink({
  appUrl: 'https://myapp.com',
  redirectUrl: 'https://myapp.com/callback',
  cluster: 'mainnet-beta',
})

// Sign transaction
const signLink = wallets.phantomSignTransactionLink(transaction, {
  appUrl: 'https://myapp.com',
  redirectUrl: 'https://myapp.com/callback',
})
```

### Solflare

```typescript
import { wallets } from 'ts-tokens'

const connectLink = wallets.solflareConnectLink({
  appUrl: 'https://myapp.com',
  cluster: 'mainnet-beta',
})
```

### Universal Deep Link

```typescript
import { wallets } from 'ts-tokens'

const link = wallets.generateDeepLink(
  'phantom',
  'signAndSend',
  { appUrl: 'https://myapp.com' },
  transaction
)
```

## Check Mobile

```typescript
import { wallets } from 'ts-tokens'

if (wallets.isMobile()) {
  // Use deep links
  const link = wallets.generateDeepLink('phantom', 'connect', config)
  wallets.openWallet('phantom', link)
}
else {
  // Use browser extension
  const adapter = wallets.createWalletAdapter('phantom')
  await adapter?.connect()
}
```

## Get App Store Links

```typescript
import { wallets } from 'ts-tokens'

const iosLink = wallets.getAppStoreLink('phantom', 'ios')
const androidLink = wallets.getAppStoreLink('phantom', 'android')
```

## Recommended Wallet

```typescript
import { wallets } from 'ts-tokens'

const recommended = wallets.getRecommendedWallet()
// Returns first available from: phantom, solflare, backpack
```

## Wallet Registry

All supported wallets with metadata:

| Wallet   | Extension | Mobile | Hardware |
| -------- | --------- | ------ | -------- |
| Phantom  | ✅        | ✅     | ❌       |
| Solflare | ✅        | ✅     | ❌       |
| Backpack | ✅        | ✅     | ❌       |
| Ledger   | ❌        | ❌     | ✅       |
| Trezor   | ❌        | ❌     | ✅       |
| Coinbase | ✅        | ✅     | ❌       |
| Trust    | ✅        | ✅     | ❌       |
| Exodus   | ✅        | ✅     | ❌       |
| Brave    | ✅        | ✅     | ❌       |
| Glow     | ✅        | ✅     | ❌       |

## Related

- [Configuration](/api/config.md)
- [Transactions](/api/transactions.md)
