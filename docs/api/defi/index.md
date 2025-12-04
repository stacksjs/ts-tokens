# DeFi Integrations

Integrate with Solana DeFi protocols.

## Overview

ts-tokens provides helpers for:

- **Jupiter** - Token swaps and price data
- **Raydium** - AMM pools and liquidity
- **Orca** - Concentrated liquidity
- **Marinade** - SOL staking

## Jupiter Swaps

### Get Swap Quote

```typescript
import { getSwapQuote, getConfig } from 'ts-tokens'

const config = await getConfig()

const quote = await getSwapQuote({
  inputMint: USDC_MINT,
  outputMint: SOL_MINT,
  amount: 100_000_000n, // 100 USDC
  slippageBps: 50, // 0.5%
})

console.log('Output:', quote.outputAmount)
console.log('Price Impact:', quote.priceImpact)
console.log('Route:', quote.route.map(r => r.protocol).join(' → '))
```

### Execute Swap

```typescript
import { executeSwap, getConfig } from 'ts-tokens'

const config = await getConfig()

const { quote, transaction } = await executeSwap({
  inputMint: USDC_MINT,
  outputMint: SOL_MINT,
  amount: 100_000_000n,
}, config.wallet.publicKey)

// Sign and send transaction
```

### Get Token Price

```typescript
import { getTokenPrice, getTokenPrices } from 'ts-tokens'

// Single token
const price = await getTokenPrice(tokenMint)
console.log('Price:', price.priceUsd)

// Multiple tokens
const prices = await getTokenPrices([mint1, mint2, mint3])
```

## Raydium Pools

### Get Pool Info

```typescript
import { getPoolInfo, getConfig } from 'ts-tokens'

const config = await getConfig()

const pool = await getPoolInfo(poolAddress, config)

console.log('Reserve A:', pool.reserveA)
console.log('Reserve B:', pool.reserveB)
console.log('Fee:', pool.fee)
console.log('APY:', pool.apy)
```

### Calculate Swap Output

```typescript
import { calculateSwapOutput } from 'ts-tokens'

const outputAmount = calculateSwapOutput(
  inputAmount,
  pool.reserveA,
  pool.reserveB,
  25 // 0.25% fee in bps
)
```

### Calculate LP Tokens

```typescript
import { calculateLPTokens, calculateRemoveLiquidity } from 'ts-tokens'

// Adding liquidity
const lpTokens = calculateLPTokens(pool, amountA, amountB)

// Removing liquidity
const { amountA, amountB } = calculateRemoveLiquidity(pool, lpAmount)
```

## Price Impact

```typescript
import { calculatePriceImpact } from 'ts-tokens'

const impact = calculatePriceImpact(
  inputAmount,
  outputAmount,
  pool.reserveA,
  pool.reserveB
)

if (impact > 0.01) {
  console.warn('High price impact:', (impact * 100).toFixed(2), '%')
}
```

## CLI Usage

```bash
# Get swap quote
tokens swap:quote --from USDC --to SOL --amount 100

# Execute swap
tokens swap --from USDC --to SOL --amount 100 --slippage 0.5

# Get token price
tokens price <mint>

# Get pool info
tokens pool:info <pool-address>
```

## Best Practices

1. **Always check price impact** before large swaps
2. **Use appropriate slippage** - 0.5% for stable pairs, 1-2% for volatile
3. **Compare routes** - Jupiter aggregates multiple DEXes
4. **Monitor gas** - Complex routes cost more

## Related

- [Token Transfers](/api/tokens/transfer.md)
- [Batch Operations](/api/batch/index.md)
