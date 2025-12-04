# Debugging Tools

Transaction analysis and account inspection.

## Overview

ts-tokens provides comprehensive debugging tools:

- **Transaction Analysis** - Detailed tx breakdown
- **Account Inspection** - Account state viewer
- **Simulation** - Test transactions before sending
- **Comparison** - Diff transactions and accounts

## Transaction Analysis

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const analysis = await debug.analyzeTransaction(
  config.connection,
  'signature...'
)

console.log('Status:', analysis.status)
console.log('Fee:', analysis.fee / 1e9, 'SOL')
console.log('Compute Units:', analysis.computeUnits)

// Account changes
for (const acc of analysis.accounts) {
  if (acc.change !== 0n) {
    console.log(`${acc.address}: ${Number(acc.change) / 1e9} SOL`)
  }
}

// Instructions
for (const ix of analysis.instructions) {
  console.log(`${ix.programName}: ${ix.instructionName}`)
}

// Logs
for (const log of analysis.logs) {
  console.log(log)
}
```

### Format for Display

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const analysis = await debug.analyzeTransaction(
  config.connection,
  'signature...'
)

console.log(debug.formatTransactionAnalysis(analysis))
```

## Account Inspection

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const inspection = await debug.inspectAccount(
  config.connection,
  accountAddress
)

console.log('Type:', inspection.accountType)
console.log('Balance:', Number(inspection.lamports) / 1e9, 'SOL')
console.log('Owner:', inspection.owner.toBase58())
console.log('Data Length:', inspection.dataLength)

// Parsed data (for known account types)
if (inspection.parsedData) {
  console.log('Parsed:', inspection.parsedData)
}
```

### Format for Display

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const inspection = await debug.inspectAccount(
  config.connection,
  accountAddress
)

console.log(debug.formatAccountInspection(inspection))
```

## Transaction Simulation

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

// Simulate transaction
const result = await debug.simulateTransaction(
  config.connection,
  transaction
)

console.log('Success:', result.success)
console.log('Compute Units:', result.unitsConsumed)

if (result.error) {
  console.log('Error:', result.error)
}
```

### Simulate Instructions

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await debug.simulateInstructions(
  config.connection,
  instructions,
  payer
)
```

### Estimate Compute Units

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const units = await debug.estimateComputeUnits(
  config.connection,
  transaction
)

console.log('Estimated compute units:', units)
```

### Check if Transaction Will Succeed

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const { success, error } = await debug.willSucceed(
  config.connection,
  transaction
)

if (!success) {
  console.log('Transaction will fail:', error)
}
```

## Parse Simulation Logs

```typescript
import { debug } from 'ts-tokens'

const { programLogs, errors, warnings } = debug.parseSimulationLogs(logs)

// Logs by program
for (const [program, logs] of programLogs) {
  console.log(`${program}:`)
  for (const log of logs) {
    console.log(`  ${log}`)
  }
}

// Errors
for (const error of errors) {
  console.error('Error:', error)
}
```

## Dry Run

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const result = await debug.dryRun(
  config.connection,
  transaction,
  {
    showLogs: true,
    showAccounts: true,
  }
)

console.log('Success:', result.success)
console.log('Compute:', result.computeUnits)

if (result.parsedLogs) {
  console.log('Errors:', result.parsedLogs.errors)
}
```

## Compare Transactions

```typescript
import { debug, getConfig } from 'ts-tokens'

const config = await getConfig()

const tx1 = await debug.analyzeTransaction(config.connection, sig1)
const tx2 = await debug.analyzeTransaction(config.connection, sig2)

const diff = debug.compareTransactions(tx1, tx2)

console.log('Fee diff:', diff.feeDiff)
console.log('Compute diff:', diff.computeDiff)
console.log('Account diffs:', diff.accountDiffs)
```

## CLI Usage

```bash
# Analyze transaction
tokens debug tx <signature>

# Inspect account
tokens debug account <address>

# Simulate transaction
tokens debug simulate --instruction <base64>

# Compare transactions
tokens debug compare <sig1> <sig2>
```

## Related

- [Errors](/api/errors/index.md)
- [Transactions](/api/transactions/index.md)
