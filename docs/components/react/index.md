# React Components

React components for building Solana token applications.

## Installation

```bash
bun add react-tokens
# or
npm install react-tokens
```

## Setup

Wrap your app with `TokensProvider`:

```tsx
import { TokensProvider } from 'react-tokens'

function App() {
  return (
    <TokensProvider endpoint="https://api.devnet.solana.com">
      <YourApp />
    </TokensProvider>
  )
}
```

## Components

### Wallet Components

- **[WalletButton](./wallet.md)** - Connect/disconnect wallet
- **[WalletAddress](./wallet.md#walletaddress)** - Display wallet address
- **[WalletBalance](./wallet.md#walletbalance)** - Display SOL balance

### Token Components

- **[TokenBalance](./tokens.md)** - Display token balance
- **[TokenInfo](./tokens.md#tokeninfo)** - Display token information
- **[TokenList](./tokens.md#tokenlist)** - List all tokens

### NFT Components

- **[NFTCard](./nft.md)** - Display NFT card
- **[NFTGrid](./nft.md#nftgrid)** - Grid of NFTs
- **[NFTDetails](./nft.md#nftdetails)** - Full NFT details

### Candy Machine Components

- **[MintButton](./candy-machine.md)** - Mint from Candy Machine
- **[MintCounter](./candy-machine.md#mintcounter)** - Minted/total counter
- **[MintProgress](./candy-machine.md#mintprogress)** - Progress bar

### Utility Components

- **[TransactionToast](./utility.md)** - Transaction notifications
- **[ExplorerLink](./utility.md#explorerlink)** - Solana Explorer links
- **[AddressDisplay](./utility.md#addressdisplay)** - Copyable addresses
- **[SolAmount](./utility.md#solamount)** - Formatted SOL amounts

## Hooks

All components are backed by hooks you can use directly:

```tsx
import { useTokenBalance, useNFT, useTransaction } from 'react-tokens'

function MyComponent() {
  const { balance, loading } = useTokenBalance(mint, owner)
  const { nft } = useNFT(mintAddress)
  const { send, pending } = useTransaction()

  // ...
}
```

### Available Hooks

| Hook | Description |
|------|-------------|
| `useConnection()` | Get Solana connection |
| `useTokenBalance(mint, owner)` | Token balance |
| `useTokenAccounts(owner)` | All token accounts |
| `useNFT(mint)` | Single NFT data |
| `useNFTs(owner)` | All NFTs for owner |
| `useCandyMachine(address)` | Candy Machine state |
| `useTransaction()` | Send transactions |

## Styling

Components are unstyled by default. Add your own styles or use the included CSS:

```tsx
import 'react-tokens/styles.css'
```

Or style with Tailwind:

```tsx
<TokenBalance
  mint={mint}
  owner={owner}
  className="text-lg font-bold"
/>
```

## TypeScript

Full TypeScript support included:

```tsx
import type { TokenDisplayInfo, NFTDisplayInfo } from 'react-tokens'
```
