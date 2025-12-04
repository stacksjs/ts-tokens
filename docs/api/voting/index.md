# Voting Mechanisms

Different voting strategies for DAOs.

## Overview

ts-tokens supports multiple voting mechanisms:

- **Token-Weighted** - 1 token = 1 vote
- **Quadratic** - Vote weight = √(tokens)
- **NFT-Based** - 1 NFT = 1 vote or trait-weighted
- **Time-Weighted** - Longer holders get more weight

## Token-Weighted Voting

Standard 1 token = 1 vote mechanism.

```typescript
import { voting, getConfig } from 'ts-tokens'

const config = await getConfig()

const power = await voting.calculateTokenWeightedPower(
  config.connection,
  voterAddress,
  {
    token: governanceToken,
    snapshotAtProposalCreation: true,
    preventDoubleVoting: true,
  }
)

console.log('Own:', power.own)
console.log('Delegated:', power.delegated)
console.log('Total:', power.total)
```

### Snapshots

```typescript
import { voting, getConfig } from 'ts-tokens'

const config = await getConfig()

// Create snapshot at proposal creation
const snapshot = await voting.createSnapshot(
  config.connection,
  proposalAddress,
  governanceToken
)

// Use snapshot for voting
const power = await voting.calculateTokenWeightedPower(
  config.connection,
  voter,
  config,
  snapshot
)
```

## Quadratic Voting

Reduces whale influence: vote weight = √(tokens).

```typescript
import { voting } from 'ts-tokens'

// Calculate quadratic power
const tokens = 10000n
const votes = voting.calculateQuadraticPower(tokens)
// 10000 tokens = 100 votes

// Compare with linear
// Linear: 10000 tokens = 10000 votes
// Quadratic: 10000 tokens = 100 votes
```

### Cost Calculation

```typescript
import { voting } from 'ts-tokens'

// Cost to cast N votes = N² tokens
const voteCost = voting.calculateVoteCost(10n) // 100 tokens

// Votes from token amount
const votes = voting.calculateVotesFromTokens(10000n) // 100 votes

// Tokens needed for N votes
const tokensNeeded = voting.calculateTokensNeeded(100n) // 10000 tokens
```

### Distribution Analysis

```typescript
import { voting } from 'ts-tokens'

const balances = [1000000n, 100000n, 10000n, 1000n, 100n]

const comparison = voting.compareVotingMechanisms(balances)

console.log('Linear Gini:', comparison.linear.gini)
console.log('Linear Top 10%:', comparison.linear.top10Percentage)
console.log('Quadratic Gini:', comparison.quadratic.gini)
console.log('Quadratic Top 10%:', comparison.quadratic.top10Percentage)
```

## NFT-Based Voting

### 1 NFT = 1 Vote

```typescript
import { voting, getConfig } from 'ts-tokens'

const config = await getConfig()

const power = await voting.calculateNFTVotingPower(
  config.connection,
  voterAddress,
  {
    collection: collectionMint,
    oneNftOneVote: true,
  }
)

console.log('NFTs owned:', power.own)
```

### Trait-Weighted Voting

```typescript
import { voting, getConfig } from 'ts-tokens'

const config = await getConfig()

// Create trait weights
const weights = voting.createTraitWeights([
  {
    traitType: 'Rarity',
    values: [
      { value: 'Common', weight: 1 },
      { value: 'Uncommon', weight: 2 },
      { value: 'Rare', weight: 5 },
      { value: 'Epic', weight: 10 },
      { value: 'Legendary', weight: 25 },
    ],
  },
])

const power = await voting.calculateNFTVotingPower(
  config.connection,
  voterAddress,
  {
    collection: collectionMint,
    oneNftOneVote: false,
    traitWeights: weights,
  }
)
```

### Rarity Weights Preset

```typescript
import { voting } from 'ts-tokens'

// Use preset rarity weights
const weights = voting.createRarityWeights()
```

## Vote Breakdown

```typescript
const breakdown = {
  forVotes: 7000n,
  againstVotes: 2000n,
  abstainVotes: 1000n,
  totalVotes: 10000n,
  quorumReached: true,
  passingThreshold: true,
  uniqueVoters: 150,
}

// Calculate percentages
const forPct = Number((breakdown.forVotes * 100n) / breakdown.totalVotes)
// 70%
```

## Validation

```typescript
import { voting } from 'ts-tokens'

// Validate token-weighted vote
const result = voting.validateTokenWeightedVote(power, 1000n)
if (!result.valid) {
  console.log('Invalid:', result.reason)
}

// Validate NFT vote
const nftResult = await voting.validateNFTVote(
  connection,
  voter,
  nftConfig
)
if (!nftResult.valid) {
  console.log('Invalid:', nftResult.reason)
}
```

## CLI Usage

```bash
# Get voting power
tokens voting power <dao> --voter <address>

# Compare mechanisms
tokens voting compare <token> --mechanism quadratic

# Check eligibility
tokens voting eligible <dao> --voter <address>
```

## Related

- [Governance](/api/governance/index.md)
- [Treasury](/api/treasury/index.md)
