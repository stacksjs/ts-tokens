# Staking

Stake tokens and NFTs to earn rewards.

## Overview

ts-tokens provides comprehensive staking functionality:

- **Token Staking** - Stake fungible tokens for rewards
- **NFT Staking** - Stake NFTs to earn points/tokens
- **Flexible Lock Periods** - No lock, fixed, or variable
- **Multiple Reward Tokens** - Earn different tokens
- **Early Unstake Penalties** - Configurable penalties

## Token Staking

### Create a Staking Pool

```typescript
import { createStakingPool, getConfig } from 'ts-tokens'

const config = await getConfig()

const pool = await createStakingPool({
  stakeMint: tokenMint,
  rewardMint: rewardTokenMint,
  rewardRate: 1_000_000n, // rewards per second
  rewardDuration: 30n * 24n * 60n * 60n, // 30 days
  minStakeDuration: 7n * 24n * 60n * 60n, // 7 day lock
  earlyUnstakePenalty: 1000, // 10% penalty
}, config)
```

### Stake Tokens

```typescript
import { getConfig, stake } from 'ts-tokens'

const config = await getConfig()

await stake({
  pool: poolAddress,
  amount: 1000_000_000_000n, // 1000 tokens
  lockDuration: 30n * 24n * 60n * 60n, // 30 days
}, config)
```

### Check Rewards

```typescript
import { getConfig, getStakeRewards } from 'ts-tokens'

const config = await getConfig()

const rewards = await getStakeRewards(stakeAccount, config)

console.log('Pending:', rewards.pendingRewards)
console.log('Claimable:', rewards.claimableRewards)
console.log('APR:', rewards.apr, '%')
```

### Claim Rewards

```typescript
import { claimRewards, getConfig } from 'ts-tokens'

const config = await getConfig()

await claimRewards({ pool: poolAddress }, config)
```

### Unstake

```typescript
import { getConfig, unstake } from 'ts-tokens'

const config = await getConfig()

await unstake({
  pool: poolAddress,
  amount: 500_000_000_000n, // 500 tokens
}, config)
```

## NFT Staking

### Create NFT Staking Pool

```typescript
import { createNFTStakingPool, getConfig } from 'ts-tokens'

const config = await getConfig()

const pool = await createNFTStakingPool({
  collection: collectionMint,
  rewardMint: rewardTokenMint,
  pointsPerDay: 100n,
}, config)
```

### Stake NFT

```typescript
import { getConfig, stakeNFT } from 'ts-tokens'

const config = await getConfig()

await stakeNFT({
  pool: poolAddress,
  mint: nftMint,
}, config)
```

### Check NFT Staking Points

```typescript
import { getConfig, getNFTStakeInfo } from 'ts-tokens'

const config = await getConfig()

const info = await getNFTStakeInfo(stakeAccount, config)

console.log('Points earned:', info.pointsEarned)
console.log('Staked at:', new Date(Number(info.stakedAt) * 1000))
```

### Unstake NFT

```typescript
import { getConfig, unstakeNFT } from 'ts-tokens'

const config = await getConfig()

await unstakeNFT({
  pool: poolAddress,
  mint: nftMint,
}, config)
```

## Pool Statistics

```typescript
import { getConfig, getPoolStats } from 'ts-tokens'

const config = await getConfig()

const stats = await getPoolStats(poolAddress, config)

console.log('Total staked:', stats.totalStaked)
console.log('Total stakers:', stats.totalStakers)
console.log('Current APR:', stats.currentApr, '%')
console.log('Remaining rewards:', stats.remainingRewards)
```

## CLI Usage

```bash
# Create staking pool
tokens staking:create-pool \
  --stake-mint <mint> \
  --reward-mint <mint> \
  --rate 1000000 \
  --duration 2592000

# Stake tokens
tokens staking:stake <pool> --amount 1000

# Check rewards
tokens staking:rewards <pool>

# Claim rewards
tokens staking:claim <pool>

# Unstake
tokens staking:unstake <pool> --amount 500

# Pool info
tokens staking:info <pool>
```

## Reward Calculation

Rewards are calculated using a checkpoint system:

```
rewardPerToken = rewardPerTokenStored + (
  (currentTime - lastUpdateTime) * rewardRate / totalStaked
)

earned = (stakedAmount * (rewardPerToken - userRewardPerTokenPaid)) + rewardsEarned
```

## Early Unstake Penalty

If unstaking before lock period ends:

```
penalty = amount * (remainingLockTime / totalLockTime) * penaltyBps / 10000
```

## Related

- [Token Creation](/api/tokens/create.md)
- [NFT Staking](/api/staking/nft.md)
