# react-tokens

> React components and hooks for Solana tokens and NFTs.

Ready-to-use wallet, token, NFT, candy-machine, and governance UI for React apps, built on top of [`ts-tokens`](https://github.com/stacksjs/ts-tokens).

## Install

```sh
# Using bun (recommended)
bun add react-tokens ts-tokens

# Using npm
npm install react-tokens ts-tokens
```

Peer dependencies you'll also want in your app:

```sh
bun add react react-dom @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
```

## Provider Setup

Wrap your app in `TokensProvider`. It creates a Solana `Connection` and a token config and shares them with every component and hook in the tree:

```tsx
import { TokensProvider } from 'react-tokens'

export default function App() {
  return (
    <TokensProvider endpoint="https://api.devnet.solana.com">
      <YourApp />
    </TokensProvider>
  )
}
```

`TokensProvider` props:

| Prop | Type | Description |
|------|------|-------------|
| `endpoint` | `string` | Solana RPC endpoint |
| `config` | `Partial<TokenConfig>` | Optional overrides for the default token config |

## Example: Wallet + Token Balance

```tsx
import { TokenBalance, useTokenBalance, WalletConnectButton } from 'react-tokens'

export function AccountPanel() {
  // Components come with their own fetching and rendering…
  return (
    <div>
      <WalletConnectButton />
      <TokenBalance mint="So11111111111111111111111111111111111111112" owner={walletAddress} />
    </div>
  )
}

export function BalanceText({ mint, owner }: { mint: string, owner?: string }) {
  // …and the same data is available through hooks for custom UIs
  const { uiBalance, loading, error, refetch } = useTokenBalance(mint, owner)

  if (loading) return <span>Loading…</span>
  if (error) return <span>Failed to load balance</span>

  return (
    <button onClick={() => refetch()}>
      Balance: {uiBalance}
    </button>
  )
}
```

## What's Inside

- **Wallet components** — `WalletConnectButton`, `WalletDisconnectButton`, `WalletMultiButton`, `WalletAddress`, `WalletBalance`
- **Token components** — `TokenBalance`, `TokenInfo`, `TokenList`, `TokenAmount`, `TokenTransferForm`, `TokenMintForm`
- **NFT components** — `NFTCard`, `NFTGrid`, `NFTGallery`, `NFTDetails`, `NFTTransferButton`, `NFTBurnButton`
- **Candy Machine components** — `MintButton`, `MintCounter`, `MintProgress`, `MintPrice`, `CandyMachineProvider`, `AllowlistChecker`, `CountdownTimer`
- **Governance components** — `DAOProvider`, `ProposalList`, `ProposalCard`, `ProposalDetails`, `VoteButton`, `VotingPower`, `DelegateForm`, `TreasuryBalance`
- **Hooks** — `useTokenBalance`, `useTokenAccounts`, `useNFT`, `useNFTs`, `useTransaction`, `useCandyMachine`, `useWallet`, `useDAO`, `useProposals`, `useVotingPower`, `useTreasury`

Subpath imports are available if you prefer narrower entry points:

```ts
import { TokenBalance } from 'react-tokens/components'
import { useTokenBalance } from 'react-tokens/hooks'
```

## Documentation

- [ts-tokens documentation](https://ts-tokens.dev)
- [Core library](https://github.com/stacksjs/ts-tokens/tree/main/packages/ts-tokens)

## Changelog

Please see the [releases](https://github.com/stacksjs/ts-tokens/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](https://github.com/stacksjs/ts-tokens/blob/main/.github/CONTRIBUTING.md) for details.

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/ts-tokens/blob/main/LICENSE.md) for more information.
