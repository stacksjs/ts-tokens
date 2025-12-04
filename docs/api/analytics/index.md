# Analytics

Token and NFT analytics utilities.

## Overview

ts-tokens provides comprehensive analytics:

- **Holder Distribution** - Token holder analysis
- **Volume Analytics** - Trading volume tracking
- **Price History** - Historical price data
- **Whale Watching** - Large holder monitoring

## Holder Distribution

```typescript
import { analytics, getConfig } from 'ts-tokens'

const config = await getConfig()

const distribution = await analytics.getHolderDistribution(
  config.connection,
  tokenMint,
  { limit: 100 }
)

console.log('Total Holders:', distribution.totalHolders)
console.log('Top 10 Hold:', distribution.top10Percentage, '%')
console.log('Gini Coefficient:', distribution.giniCoefficient)

// Top holders
for (const holder of distribution.holders.slice(0, 10)) {
  console.log(`${holder.rank}. ${holder.address}: ${holder.percentage}%`)
}
```

## Holder Snapshots

```typescript
import { analytics, getConfig } from 'ts-tokens'

const config = await getConfig()

// Take snapshot
const snapshot = await analytics.getHolderSnapshot(config.connection, tokenMint)

// Compare snapshots
const before = previousSnapshot
const after = snapshot
const comparison = analytics.compareSnapshots(before, after)

console.log('Holder Change:', comparison.holderChange)
console.log('Change %:', comparison.holderChangePercentage)
```

## Identify Whales

```typescript
import { analytics, getConfig } from 'ts-tokens'

const config = await getConfig()

const distribution = await analytics.getHolderDistribution(
  config.connection,
  tokenMint
)

// Wallets holding > 1%
const whales = analytics.identifyWhales(distribution, 1)

for (const whale of whales) {
  console.log(`Whale: ${whale.address} holds ${whale.percentage}%`)
}
```

## Trading Volume

```typescript
import { analytics, getConfig } from 'ts-tokens'

const config = await getConfig()

const volume = await analytics.getTradingVolume(
  config.connection,
  tokenMint,
  '24h'
)

console.log('Volume:', volume.volume)
console.log('Trades:', volume.trades)
console.log('Unique Buyers:', volume.uniqueBuyers)
console.log('Avg Trade Size:', volume.avgTradeSize)
```

## Volume Breakdown

```typescript
import { analytics, getConfig } from 'ts-tokens'

const config = await getConfig()

const breakdown = await analytics.getVolumeBreakdown(
  config.connection,
  tokenMint,
  24 // 24 intervals
)

for (const interval of breakdown) {
  console.log(`${new Date(interval.timestamp).toISOString()}: ${interval.volume}`)
}
```

## Price History

```typescript
import { analytics } from 'ts-tokens'

const history = await analytics.getPriceHistory(tokenMint, '7d')

console.log('Price Change:', history.priceChangePercentage, '%')
console.log('High:', history.high)
console.log('Low:', history.low)
console.log('Avg:', history.avgPrice)
```

## Technical Indicators

```typescript
import { analytics } from 'ts-tokens'

const history = await analytics.getPriceHistory(tokenMint, '30d')

// Moving averages
const ma7 = analytics.calculateMovingAverage(history.dataPoints, 7)
const ma30 = analytics.calculateMovingAverage(history.dataPoints, 30)

// RSI
const rsi = analytics.calculateRSI(history.dataPoints, 14)

// Trend detection
const trend = analytics.detectTrend(history.dataPoints)
console.log('Trend:', trend) // 'bullish', 'bearish', or 'neutral'
```

## Whale Watching

```typescript
import { analytics, getConfig } from 'ts-tokens'

const config = await getConfig()

// Get recent whale activity
const activity = await analytics.getWhaleActivity(
  config.connection,
  tokenMint,
  1000000n, // Min 1M tokens
  20 // Last 20 activities
)

for (const a of activity) {
  console.log(`${a.type}: ${a.amount} at ${new Date(a.timestamp * 1000)}`)
}
```

## Real-time Whale Alerts

```typescript
import { analytics, getConfig } from 'ts-tokens'

const config = await getConfig()

const watcher = analytics.createWhaleWatcher(config.connection, {
  mint: tokenMint,
  minAmount: 1000000n,
  alertCallback: (activity) => {
    console.log(`WHALE ALERT: ${activity.type} ${activity.amount}`)
  },
})

watcher.start()
// ... later
watcher.stop()
```

## Export Data

```typescript
import { analytics } from 'ts-tokens'

// Export holders to CSV
const csv = analytics.exportHoldersToCSV(distribution)
fs.writeFileSync('holders.csv', csv)

// Export price history
const priceCSV = analytics.exportPriceHistoryToCSV(history)
fs.writeFileSync('prices.csv', priceCSV)

// Generic export
const json = analytics.exportData(data, { format: 'json' })
```

## CLI Usage

```bash
# Holder distribution
tokens analytics holders <mint> --limit 100

# Trading volume
tokens analytics volume <mint> --period 24h

# Price history
tokens analytics history <mint> --period 7d

# Whale watch
tokens analytics whale-watch <mint> --min 1000000

# Export
tokens analytics holders <mint> --export csv --output holders.csv
```

## Related

- [DAS API](/api/indexer/index.md)
- [Token Operations](/api/tokens/index.md)
