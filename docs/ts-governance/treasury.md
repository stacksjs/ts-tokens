# Treasury

## Creating a Treasury

Treasuries use PDA-derived addresses tied to the DAO.

```typescript
import { treasury } from 'ts-governance'

const { treasury: t } = await treasury.createTreasury(connection, authority, {
  dao: daoAddress,
})
```

## Deposits

```typescript
await treasury.depositToTreasury(connection, depositor, {
  dao: daoAddress,
  amount: 1_000_000_000n, // 1 SOL
})
```

## Withdrawals (Governance Only)

Withdrawals require an executed governance proposal.

```typescript
await treasury.withdrawFromTreasury(connection, authority, {
  dao: daoAddress,
  recipient: recipientAddress,
  amount: 500_000_000n,
})
```

## Querying Balance

```typescript
const balance = await treasury.getTreasuryBalance(connection, daoAddress)
console.log(`SOL: ${balance.sol}`)
console.log(`Tokens: ${balance.tokens.length}`)
```
