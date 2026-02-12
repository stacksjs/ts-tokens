# DAO Management

## Creating a DAO

DAOs are created with PDA-derived addresses for deterministic addressing.

```typescript
import { dao } from 'ts-governance'

const result = await dao.createDAO(connection, payer, {
  name: 'My DAO',
  governanceToken: tokenMint,
  config: {
    votingPeriod: '5 days',
    quorum: 10,
    approvalThreshold: 66,
    executionDelay: '1 day',
    minProposalThreshold: 1000n,
    voteWeightType: 'token', // 'token' | 'quadratic' | 'nft' | 'time-weighted'
    allowEarlyExecution: false,
    allowVoteChange: false,
  },
})
```

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `votingPeriod` | string/bigint | Duration of voting (e.g., '5 days') |
| `quorum` | number | Minimum participation % (1-100) |
| `approvalThreshold` | number | Required approval % (1-100) |
| `executionDelay` | string/bigint | Delay before execution |
| `minProposalThreshold` | bigint | Min tokens to create proposal |
| `voteWeightType` | string | Voting power calculation method |
| `allowEarlyExecution` | boolean | Execute before voting ends |
| `allowVoteChange` | boolean | Allow changing votes |

## Updating Configuration

```typescript
await dao.updateDAOConfig(connection, daoAddress, authority, {
  quorum: 15,
  approvalThreshold: 75,
})
```

## Validation

```typescript
const errors = dao.validateDAOConfig(config)
if (errors.length > 0) {
  console.error('Invalid config:', errors)
}
```
