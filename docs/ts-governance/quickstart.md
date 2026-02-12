# Quick Start

## Create a DAO

```typescript
import { dao } from 'ts-governance'

const { dao: myDAO } = await dao.createDAO(connection, payer, {
  name: 'My DAO',
  governanceToken: tokenMint,
  config: {
    votingPeriod: '5 days',
    quorum: 10,
    approvalThreshold: 66,
  },
})
```

## Create a Proposal

```typescript
import { proposals } from 'ts-governance'

const { proposal } = await proposals.createProposal(connection, proposer, {
  dao: myDAO.address,
  title: 'Fund Development',
  description: 'Allocate 100 SOL for development',
  actions: [proposals.treasuryActions.transferSOL(recipient, 100_000_000_000n)],
})
```

## Cast a Vote

```typescript
import { voting } from 'ts-governance'

await voting.castVote(connection, voter, {
  proposal: proposal.address,
  voteType: 'for',
})
```

## Delegate Voting Power

```typescript
import { delegation } from 'ts-governance'

await delegation.delegateVotingPower(connection, delegator, {
  dao: myDAO.address,
  delegate: delegateAddress,
})
```
