# ts-governance

DAO governance, proposals, voting, delegation, and treasury management for Solana.

## Installation

```bash
bun add ts-governance
# or
npm install ts-governance
```

## Usage

```ts
import { dao, proposals, voting, treasury, delegation, createVotes } from 'ts-governance'

// Create a DAO
const myDao = await dao.create({ name: 'My DAO', ... })

// Create and manage proposals
const proposal = await proposals.create({ title: 'Fund Project X', ... })

// Cast votes
const votes = createVotes({ ... })
await voting.castVote(proposal.id, { choice: 'yes' })

// Treasury operations
await treasury.deposit({ amount: 1000, mint: tokenMint })

// Delegation
await delegation.delegate({ to: delegateAddress, amount: 500 })
```

You can also import specific modules directly:

```ts
import { create } from 'ts-governance/dao'
import { castVote } from 'ts-governance/voting'
import { deposit } from 'ts-governance/treasury'
```

## Features

- DAO creation and management
- Proposal lifecycle (create, vote, execute, cancel)
- On-chain voting with multiple strategies
- Token delegation
- Treasury management (deposits, withdrawals, transfers)
- Solana program integration via `@solana/web3.js` and `@solana/spl-token`
- CLI support via the `governance` binary

## License

MIT
