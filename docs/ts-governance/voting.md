# Voting

## Vote Types

- `'for'` - Vote in favor
- `'against'` - Vote against
- `'abstain'` - Abstain from voting

## Casting Votes

```typescript
import { voting } from 'ts-governance'

await voting.castVote(connection, voter, {
  proposal: proposalAddress,
  voteType: 'for',
})
```

## Voting Power Calculations

### Token-Weighted (default)
1 token = 1 vote

### Quadratic
```typescript
const power = voting.calculateQuadraticPower(tokenBalance)
// 100 tokens = 10 votes, 10000 tokens = 100 votes
```

### NFT-Based
```typescript
const power = voting.calculateNFTVotingPower(nftCount)
// 1 NFT = 1 vote
```

### Time-Weighted
```typescript
const power = voting.calculateTimeWeightedPower(baseVotingPower, holdDuration, {
  curve: 'linear', // or 'exponential'
  maxMultiplier: 3.0,
  maxDurationSeconds: 31536000n, // 1 year
})
```

## Queries

```typescript
const breakdown = voting.calculateVoteBreakdown(proposal)
const isOpen = voting.isVotingOpen(proposal)
const remaining = voting.getVotingTimeRemaining(proposal)
```
