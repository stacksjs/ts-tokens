# ts-tokens Architecture

## Package Structure

```
ts-tokens/
├── packages/
│   └── ts-tokens/              # Core library
│       └── src/
│           ├── index.ts         # Main entry point & barrel exports
│           ├── config.ts        # Configuration loading & defaults
│           ├── types/           # Shared type definitions
│           │   ├── config.ts    #   Config, Chain, Network types
│           │   ├── driver.ts    #   ChainDriver interface
│           │   ├── storage.ts   #   StorageAdapter interface
│           │   ├── token.ts     #   Fungible token types
│           │   ├── nft.ts       #   NFT & collection types
│           │   ├── core.ts      #   MPL Core asset types
│           │   ├── metadata.ts  #   Metadata JSON types
│           │   ├── wallet.ts    #   Wallet types
│           │   └── transaction.ts # Transaction result types
│           │
│           ├── drivers/         # Blockchain driver abstraction
│           │   ├── index.ts     #   Registry, auto-detect, factory
│           │   └── solana/      #   Solana driver implementation
│           │       ├── connection.ts
│           │       ├── wallet.ts
│           │       ├── account.ts
│           │       └── transaction.ts
│           │
│           ├── programs/        # Raw on-chain program instructions
│           │   ├── index.ts     #   Barrel exports (no external SDKs)
│           │   ├── token-metadata/  # Metaplex Token Metadata
│           │   │   ├── instructions.ts
│           │   │   ├── accounts.ts
│           │   │   ├── pda.ts
│           │   │   └── types.ts
│           │   ├── candy-machine/   # Candy Machine v3 + Guards
│           │   │   ├── instructions.ts
│           │   │   ├── guard-instructions.ts
│           │   │   ├── accounts.ts
│           │   │   ├── guards.ts
│           │   │   ├── pda.ts
│           │   │   └── types.ts
│           │   ├── bubblegum/       # Compressed NFTs
│           │   │   ├── instructions.ts
│           │   │   ├── utils.ts
│           │   │   ├── pda.ts
│           │   │   └── types.ts
│           │   ├── mpl-core/        # MPL Core (lightweight NFTs)
│           │   │   ├── instructions.ts
│           │   │   └── types.ts
│           │   ├── core/            # Core aliases (asset-centric API)
│           │   │   ├── instructions.ts
│           │   │   └── types.ts
│           │   ├── account-compression/ # Merkle tree compression
│           │   │   ├── instructions.ts
│           │   │   └── types.ts
│           │   └── token-2022/      # Token Extensions
│           │       ├── instructions.ts
│           │       ├── extensions.ts
│           │       └── types.ts
│           │
│           ├── storage/         # Decentralized storage adapters
│           │   ├── index.ts     #   Factory, fallback chain
│           │   ├── arweave.ts   #   Arweave HTTP API + bundling
│           │   ├── ipfs.ts      #   IPFS + pinning services
│           │   └── shadow-drive.ts # Shadow Drive + SHDW payments
│           │
│           ├── token/           # Fungible token operations
│           ├── nft/             # NFT creation, transfer, burn
│           ├── pnft/            # Programmable NFTs
│           ├── core/            # MPL Core high-level operations
│           ├── batch/           # Batch operations & lookup tables
│           ├── staking/         # Token staking pools
│           ├── governance/      # DAO & proposal management
│           ├── voting/          # Token/NFT weighted voting
│           ├── vesting/         # Token vesting schedules
│           ├── treasury/        # Treasury management
│           ├── fanout/          # Revenue fanout wallets
│           ├── defi/            # Jupiter, Orca, Raydium, etc.
│           ├── marketplace/     # NFT marketplace integrations
│           ├── distribution/    # Airdrop & claim links
│           ├── analytics/       # Holder analytics & volume
│           ├── indexer/         # DAS, Helius, Triton, etc.
│           ├── automation/      # Cron & mint automation
│           ├── events/          # Transaction listeners & webhooks
│           ├── security/        # Audit, checks, MEV protection
│           ├── wallets/         # Browser adapters, Ledger, etc.
│           ├── multisig/        # Multi-signature operations
│           ├── fluent/          # Fluent builder API
│           ├── cli/             # CLI commands & utilities
│           ├── utils/           # Base58, caching, errors, RPC
│           ├── debug/           # Transaction simulation & logging
│           └── i18n/            # Internationalization
│
├── test/                        # Test suites (Bun test)
└── docs/                        # Documentation
```

## Module Dependency Graph

```
                    ┌──────────────┐
                    │   config.ts  │
                    │   types/     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼──────┐  ┌─▼──────┐  ┌──▼─────────┐
     │   drivers/    │  │ utils/ │  │  storage/   │
     │  (solana)     │  │ base58 │  │ arweave     │
     │  connection   │  │ cache  │  │ ipfs        │
     │  wallet       │  │ errors │  │ shadow-drive│
     └───────┬───────┘  └────────┘  └──────┬──────┘
             │                             │
    ┌────────┼─────────────────────────────┤
    │        │                             │
    │  ┌─────▼──────────┐                  │
    │  │   programs/     │                 │
    │  │ token-metadata  │                 │
    │  │ candy-machine   │                 │
    │  │ bubblegum       │                 │
    │  │ mpl-core / core │                 │
    │  │ account-compr.  │                 │
    │  │ token-2022      │                 │
    │  └────────┬────────┘                 │
    │           │                          │
    ▼           ▼                          ▼
┌───────────────────────────────────────────────┐
│              High-Level Modules               │
│  token/ nft/ pnft/ batch/ staking/            │
│  governance/ voting/ defi/ marketplace/       │
│  distribution/ analytics/ automation/         │
│  events/ security/ treasury/ fanout/          │
└───────────────────┬───────────────────────────┘
                    │
           ┌────────▼────────┐
           │  fluent/        │
           │  builder API    │
           └────────┬────────┘
                    │
           ┌────────▼────────┐
           │  cli/           │
           │  commands       │
           └─────────────────┘
```

## Design Principles

1. **Zero SDK Dependencies** -- All on-chain program interactions use raw

   `TransactionInstruction` builders from `@solana/web3.js`. No Metaplex,
   Serum, or other external SDKs are included.

2. **Driver Abstraction** -- The `ChainDriver` interface in `types/driver.ts`

   defines a chain-agnostic API. Currently only Solana is implemented, but
   the registry pattern supports future chains.

3. **Storage Adapter Pattern** -- All storage providers implement the

   `StorageAdapter` interface. A factory function auto-selects the adapter
   from config, and a fallback chain tries providers in order.

4. **Layered Architecture** -- Types and config sit at the bottom, programs

   and drivers in the middle, high-level modules on top, and fluent/CLI at
   the surface. Dependencies flow downward only.

5. **Barrel Exports** -- Each module has an `index.ts` that re-exports its

   public API. The top-level `src/index.ts` re-exports everything for
   consumers who want a single import path.
