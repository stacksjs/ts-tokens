# Delegation

## Delegating Voting Power

```typescript
import { delegation } from 'ts-governance'

await delegation.delegateVotingPower(connection, delegator, {
  dao: daoAddress,
  delegate: delegateAddress,
  amount: 1000n, // optional, defaults to all
  expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30), // optional
})
```

## Removing Delegation

```typescript
await delegation.undelegateVotingPower(connection, delegator, {
  dao: daoAddress,
})
```

## Queries

```typescript
const del = await delegation.getDelegation(connection, dao, delegator)
const received = await delegation.getDelegationsForDelegate(connection, dao, delegate)
const given = await delegation.getDelegationsFromDelegator(connection, dao, delegator)
const totalPower = await delegation.getTotalDelegatedPower(connection, dao, delegate)
```
