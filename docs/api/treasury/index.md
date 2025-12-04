# Treasury Management

DAO treasury operations and multi-token management.

## Overview

ts-tokens provides comprehensive treasury management:

- **Multi-token support** - Hold any SPL token
- **Governance-controlled** - Withdrawals require proposals
- **Spending limits** - Daily/weekly/monthly limits
- **Transaction history** - Full audit trail

## Create Treasury

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

const { address, signature } = await treasury.createTreasury(
  config.connection,
  config.wallet.publicKey,
  {
    dao: daoAddress,
    authority: daoAddress, // DAO controls treasury
  }
)
```

## Deposit Tokens

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

// Anyone can deposit
await treasury.deposit(config.connection, {
  treasury: treasuryAddress,
  mint: tokenMint,
  amount: 1000000n,
  from: config.wallet.publicKey,
})
```

## Get Treasury Info

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

const info = await treasury.getTreasury(config.connection, treasuryAddress)

console.log('DAO:', info.dao.toBase58())
console.log('Total Value:', info.totalValueUsd)

for (const balance of info.balances) {
  console.log(`${balance.mint}: ${balance.amount}`)
}
```

## Get Balances

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

// All balances
const balances = await treasury.getTreasuryBalances(
  config.connection,
  treasuryAddress
)

// Specific token
const usdcBalance = await treasury.getTreasuryBalance(
  config.connection,
  treasuryAddress,
  usdcMint
)
```

## Spending Proposals

### Create Proposal

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

const { proposalId } = await treasury.createSpendingProposal(
  config.connection,
  treasuryAddress,
  recipientAddress,
  tokenMint,
  1000000n,
  'Marketing budget Q1'
)
```

### Execute Approved Proposal

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

// After governance approval
await treasury.executeSpendingProposal(config.connection, proposalId)
```

## Spending Limits

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

// Set limits
await treasury.setSpendingLimits(
  config.connection,
  treasuryAddress,
  authority,
  {
    mint: usdcMint,
    dailyLimit: 10000_000000n, // 10k USDC
    weeklyLimit: 50000_000000n,
    monthlyLimit: 100000_000000n,
  }
)

// Check limits before withdrawal
const check = await treasury.checkWithdrawalLimits(
  config.connection,
  treasuryAddress,
  usdcMint,
  5000_000000n
)

if (!check.allowed) {
  console.log('Blocked:', check.reason)
}
```

## Transaction History

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

const history = await treasury.getTransactionHistory(
  config.connection,
  treasuryAddress,
  { limit: 20 }
)

for (const tx of history) {
  console.log(treasury.formatTransaction(tx))
}
```

## Treasury Stats

```typescript
import { treasury, getConfig } from 'ts-tokens'

const config = await getConfig()

const stats = await treasury.getTreasuryStats(
  config.connection,
  treasuryAddress
)

console.log('Total Deposits:', stats.totalDeposits)
console.log('Total Withdrawals:', stats.totalWithdrawals)
console.log('Unique Depositors:', stats.uniqueDepositors)
```

## CLI Usage

```bash
# Create treasury
tokens treasury create --dao <dao-address>

# Get info
tokens treasury info <treasury-address>

# Deposit
tokens treasury deposit <treasury> --mint <token> --amount 1000

# Create spending proposal
tokens treasury propose <treasury> --to <recipient> --amount 1000

# View history
tokens treasury history <treasury>
```

## Related

- [Governance](/api/governance/index.md)
- [Voting](/api/voting/index.md)
