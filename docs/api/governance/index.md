# Governance & DAOs

Create and manage DAOs with token-based voting.

## Overview

ts-tokens provides comprehensive governance functionality:

- **DAO Creation** - Create token-governed organizations
- **Proposals** - Create and manage proposals
- **Voting** - Token-weighted voting system
- **Delegation** - Delegate voting power
- **Treasury** - Manage DAO treasury

## Create a DAO

```typescript
import { createDAO, getConfig } from 'ts-tokens'

const config = await getConfig()

const { dao } = await createDAO({
  name: 'My Project DAO',
  governanceToken: tokenMint,
  config: {
    votingPeriod: '5 days',
    quorum: 10, // 10% of tokens must vote
    approvalThreshold: 66, // 66% must vote yes
    executionDelay: '1 day',
    minProposalThreshold: 1000n, // Min tokens to create proposal
  },
}, config)

console.log('DAO created:', dao.address)
console.log('Treasury:', dao.treasury)
```

## Create a Proposal

```typescript
import { createProposal, getConfig, treasuryActions } from 'ts-tokens'

const config = await getConfig()

const { proposal } = await createProposal({
  dao: daoAddress,
  title: 'Fund Marketing Campaign',
  description: 'Allocate 10,000 tokens for Q1 marketing',
  actions: [
    treasuryActions.transferToken(
      tokenMint,
      marketingWallet,
      10000_000_000_000n // 10,000 tokens
    ),
  ],
}, config)

console.log('Proposal created:', proposal.address)
```

## Vote on a Proposal

```typescript
import { castVote, getConfig } from 'ts-tokens'

const config = await getConfig()

await castVote({
  proposal: proposalAddress,
  voteType: 'for', // 'for', 'against', or 'abstain'
}, config)
```

## Delegate Voting Power

```typescript
import { delegateVotingPower, getConfig } from 'ts-tokens'

const config = await getConfig()

await delegateVotingPower(
  delegateAddress,
  1000_000_000_000n, // Optional: specific amount
  config
)
```

## Execute a Proposal

```typescript
import { executeProposal, getConfig } from 'ts-tokens'

const config = await getConfig()

// After voting period ends and proposal passes
await executeProposal({
  proposal: proposalAddress,
}, config)
```

## Get DAO Info

```typescript
import { getConfig, getDAO, getTreasuryBalance } from 'ts-tokens'

const config = await getConfig()

const dao = await getDAO(daoAddress, config)
const treasury = await getTreasuryBalance(dao, config)

console.log('Total voting power:', dao.totalVotingPower)
console.log('Treasury SOL:', treasury.sol)
console.log('Treasury tokens:', treasury.tokens)
```

## Get Proposal Status

```typescript
import { calculateVoteBreakdown, getConfig, getProposal } from 'ts-tokens'

const config = await getConfig()

const proposal = await getProposal(proposalAddress, config)
const breakdown = calculateVoteBreakdown(proposal)

console.log('Status:', proposal.status)
console.log('For:', breakdown.forPercentage, '%')
console.log('Against:', breakdown.againstPercentage, '%')
console.log('Abstain:', breakdown.abstainPercentage, '%')
```

## Action Builders

### Treasury Actions

```typescript
import { treasuryActions } from 'ts-tokens'

// Transfer SOL
treasuryActions.transferSOL(recipient, 1_000_000_000n) // 1 SOL

// Transfer tokens
treasuryActions.transferToken(mint, recipient, amount)

// Transfer NFT
treasuryActions.transferNFT(nftMint, recipient)
```

### Governance Actions

```typescript
import { governanceActions } from 'ts-tokens'

// Update DAO config
governanceActions.updateConfig({
  votingPeriod: 604800n, // 7 days
  quorum: 15,
})

// Add veto authority
governanceActions.addVetoAuthority(vetoWallet)
```

### Token Actions

```typescript
import { tokenActions } from 'ts-tokens'

// Mint tokens (if DAO has authority)
tokenActions.mint(mint, recipient, amount)

// Burn tokens
tokenActions.burn(mint, amount)

// Transfer authority
tokenActions.transferAuthority(mint, newAuthority)
```

## CLI Usage

```bash
# Create DAO
tokens dao:create \
  --name "My DAO" \
  --token <governance-token> \
  --quorum 10 \
  --threshold 66

# Create proposal
tokens dao:propose <dao> \
  --title "Fund Development" \
  --description "ipfs://..." \
  --action transfer-sol --to <recipient> --amount 10

# Vote
tokens dao:vote <proposal> --for
tokens dao:vote <proposal> --against

# Execute
tokens dao:execute <proposal>

# Delegate
tokens dao:delegate <delegate-address>

# Get info
tokens dao:info <dao>
tokens dao:proposal <proposal>
```

## Governance Parameters

| Parameter              | Description                    | Recommended      |
| ---------------------- | ------------------------------ | ---------------- |
| `votingPeriod`         | How long voting lasts          | 3-7 days         |
| `quorum`               | Min % of tokens that must vote | 5-15%            |
| `approvalThreshold`    | % of votes needed to pass      | 50-66%           |
| `executionDelay`       | Delay after passing            | 1-3 days         |
| `minProposalThreshold` | Min tokens to propose          | 0.1-1% of supply |

## Related

- [Token Creation](/api/tokens/create.md)
- [Multi-sig](/api/multisig/index.md)
- [Staking](/api/staking/index.md)
