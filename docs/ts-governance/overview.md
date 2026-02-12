# ts-governance

DAO governance, proposals, voting, delegation, and treasury management for Solana.

## Features

- **DAO Creation** - Create and manage DAOs with configurable governance parameters
- **Proposals** - Create, vote on, and execute governance proposals
- **Voting** - Token-weighted, quadratic, NFT-based, and time-weighted voting
- **Delegation** - Delegate and manage voting power
- **Treasury** - DAO-controlled treasury management
- **Program Layer** - PDA-based on-chain program architecture

## Architecture

ts-governance follows the same program layer pattern as other ts-tokens modules (staking, multisig, pNFT):

- `programs/` - Program ID, PDA derivation, discriminators, instruction builders
- `dao/` - DAO creation, management, and queries
- `proposals/` - Proposal lifecycle management
- `voting/` - Vote casting, power calculations, time-weighted voting
- `delegation/` - Voting power delegation
- `treasury/` - Treasury creation and operations

## Installation

```bash
bun add ts-governance
```
