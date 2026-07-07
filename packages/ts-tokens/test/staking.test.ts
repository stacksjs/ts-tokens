/**
 * Staking Module Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  STAKING_PROGRAM_ID,
  DISCRIMINATORS,
  getPoolAddress,
  getStakeEntryAddress,
  getRewardVaultAddress,
  getStakeVaultAddress,
  getNFTPoolAddress,
  getNFTStakeEntryAddress,
  getLiquidPoolAddress,
  getReceiptMintAddress,
  serializeCreatePoolData,
  serializeStakeData,
  serializeUnstakeData,
  serializeFundRewardsData,
  serializeUpdatePoolData,
  serializeCreateNFTPoolData,
  serializeLiquidStakeData,
  serializeLiquidUnstakeData,
} from '../src/staking/program'
import {
  createCreatePoolInstruction,
  createUpdatePoolInstruction,
  createPausePoolInstruction,
  createResumePoolInstruction,
  createFundRewardsInstruction,
  createWithdrawRewardsInstruction,
  createClosePoolInstruction,
  createStakeInstruction,
  createUnstakeInstruction,
  createClaimRewardsInstruction,
  createCompoundRewardsInstruction,
  createEmergencyUnstakeInstruction,
  createCreateNFTPoolInstruction,
  createStakeNFTInstruction,
  createUnstakeNFTInstruction,
  createClaimNFTRewardsInstruction,
  createCreateLiquidPoolInstruction,
  createLiquidStakeInstruction,
  createLiquidUnstakeInstruction,
} from '../src/staking/instructions'
import {
  calculatePendingRewards,
  calculateAPR,
  calculatePenalty,
  validatePoolConfig,
} from '../src/staking/pool'
import {
  validateStakeAmount,
  calculateNFTPoints,
  formatDuration,
} from '../src/staking/stake'
import {
  applyRarityMultiplier,
  applyTraitBonuses,
} from '../src/staking/nft'
import {
  calculateExchangeRate,
  calculateReceiptAmount,
  calculateRedeemAmount,
  calculateReceiptAmountExact,
  calculateRedeemAmountExact,
} from '../src/staking/liquid'
import {
  exportStakingData,
} from '../src/staking/analytics'
import type { StakingPool, CreatePoolOptions, StakingHistoryEntry } from '../src/staking/types'

// ---------------------------------------------------------------------------
// 1. Program constants
// ---------------------------------------------------------------------------

describe('Program constants', () => {
  test('STAKING_PROGRAM_ID is a valid PublicKey', () => {
    expect(STAKING_PROGRAM_ID).toBeInstanceOf(PublicKey)
    expect(STAKING_PROGRAM_ID.toBase58()).toBeTruthy()
  })

  test('discriminators are 8-byte buffers', () => {
    for (const [name, disc] of Object.entries(DISCRIMINATORS)) {
      expect(disc).toBeInstanceOf(Buffer)
      expect(disc.length).toBe(8)
    }
  })

  test('all 19 discriminators exist', () => {
    expect(Object.keys(DISCRIMINATORS).length).toBe(19)
  })

  test('discriminators have unique first byte', () => {
    const firstBytes = Object.values(DISCRIMINATORS).map(d => d[0])
    const unique = new Set(firstBytes)
    expect(unique.size).toBe(19)
  })
})

// ---------------------------------------------------------------------------
// 2. PDA derivation
// ---------------------------------------------------------------------------

describe('PDA derivation', () => {
  const authority = Keypair.generate().publicKey
  const stakeMint = Keypair.generate().publicKey
  const collection = Keypair.generate().publicKey
  const owner = Keypair.generate().publicKey
  const mint = Keypair.generate().publicKey

  test('getPoolAddress returns valid PublicKey', () => {
    const pool = getPoolAddress(authority, stakeMint)
    expect(pool).toBeInstanceOf(PublicKey)
  })

  test('getPoolAddress is deterministic', () => {
    const pool1 = getPoolAddress(authority, stakeMint)
    const pool2 = getPoolAddress(authority, stakeMint)
    expect(pool1.toBase58()).toBe(pool2.toBase58())
  })

  test('different inputs produce different PDAs', () => {
    const pool1 = getPoolAddress(authority, stakeMint)
    const pool2 = getPoolAddress(authority, collection)
    expect(pool1.toBase58()).not.toBe(pool2.toBase58())
  })

  test('getStakeEntryAddress returns valid PublicKey', () => {
    const pool = getPoolAddress(authority, stakeMint)
    const entry = getStakeEntryAddress(pool, owner)
    expect(entry).toBeInstanceOf(PublicKey)
  })

  test('getRewardVaultAddress returns valid PublicKey', () => {
    const pool = getPoolAddress(authority, stakeMint)
    const vault = getRewardVaultAddress(pool)
    expect(vault).toBeInstanceOf(PublicKey)
  })

  test('getStakeVaultAddress returns valid PublicKey', () => {
    const pool = getPoolAddress(authority, stakeMint)
    const vault = getStakeVaultAddress(pool)
    expect(vault).toBeInstanceOf(PublicKey)
  })

  test('getNFTPoolAddress returns valid PublicKey', () => {
    const nftPool = getNFTPoolAddress(authority, collection)
    expect(nftPool).toBeInstanceOf(PublicKey)
  })

  test('getNFTStakeEntryAddress returns valid PublicKey', () => {
    const nftPool = getNFTPoolAddress(authority, collection)
    const entry = getNFTStakeEntryAddress(nftPool, mint)
    expect(entry).toBeInstanceOf(PublicKey)
  })

  test('getLiquidPoolAddress returns valid PublicKey', () => {
    const lp = getLiquidPoolAddress(authority, stakeMint)
    expect(lp).toBeInstanceOf(PublicKey)
  })

  test('getReceiptMintAddress returns valid PublicKey', () => {
    const lp = getLiquidPoolAddress(authority, stakeMint)
    const receipt = getReceiptMintAddress(lp)
    expect(receipt).toBeInstanceOf(PublicKey)
  })
})

// ---------------------------------------------------------------------------
// 3. Instruction builders
// ---------------------------------------------------------------------------

describe('Instruction builders', () => {
  const authority = Keypair.generate().publicKey
  const pool = Keypair.generate().publicKey
  const stakeMint = Keypair.generate().publicKey
  const rewardMint = Keypair.generate().publicKey
  const stakeVault = Keypair.generate().publicKey
  const rewardVault = Keypair.generate().publicKey
  const owner = Keypair.generate().publicKey
  const stakeEntry = Keypair.generate().publicKey
  const tokenAccount = Keypair.generate().publicKey
  const collection = Keypair.generate().publicKey
  const nftPool = Keypair.generate().publicKey
  const nftStakeEntry = Keypair.generate().publicKey
  const nftMint = Keypair.generate().publicKey
  const ownerNFTAccount = Keypair.generate().publicKey
  const vaultNFTAccount = Keypair.generate().publicKey
  const liquidPool = Keypair.generate().publicKey
  const receiptMint = Keypair.generate().publicKey

  test('createCreatePoolInstruction has correct programId', () => {
    const ix = createCreatePoolInstruction(
      authority, pool, stakeMint, rewardMint, stakeVault, rewardVault,
      100n, 86400n, 0n, 500
    )
    expect(ix.programId.toBase58()).toBe(STAKING_PROGRAM_ID.toBase58())
  })

  test('createCreatePoolInstruction has 9 accounts', () => {
    const ix = createCreatePoolInstruction(
      authority, pool, stakeMint, rewardMint, stakeVault, rewardVault,
      100n, 86400n, 0n, 500
    )
    expect(ix.keys.length).toBe(9)
    expect(ix.keys[0].isSigner).toBe(true) // authority is signer
  })

  test('createUpdatePoolInstruction has correct data', () => {
    const ix = createUpdatePoolInstruction(authority, pool, 200n, null, null, null)
    expect(ix.programId.toBase58()).toBe(STAKING_PROGRAM_ID.toBase58())
    expect(ix.keys.length).toBe(2)
  })

  test('createPausePoolInstruction has correct discriminator', () => {
    const ix = createPausePoolInstruction(authority, pool)
    expect(ix.data[0]).toBe(DISCRIMINATORS.pausePool[0])
  })

  test('createResumePoolInstruction has correct discriminator', () => {
    const ix = createResumePoolInstruction(authority, pool)
    expect(ix.data[0]).toBe(DISCRIMINATORS.resumePool[0])
  })

  test('createFundRewardsInstruction has 5 accounts', () => {
    const ix = createFundRewardsInstruction(authority, pool, rewardVault, tokenAccount, 1000n)
    expect(ix.keys.length).toBe(5)
  })

  test('createWithdrawRewardsInstruction has 5 accounts', () => {
    const ix = createWithdrawRewardsInstruction(authority, pool, rewardVault, tokenAccount, 1000n)
    expect(ix.keys.length).toBe(5)
  })

  test('createClosePoolInstruction has 7 accounts', () => {
    const ix = createClosePoolInstruction(authority, pool, stakeVault, rewardVault, tokenAccount)
    expect(ix.keys.length).toBe(7)
  })

  test('createStakeInstruction has correct data with amount', () => {
    const ix = createStakeInstruction(owner, pool, stakeEntry, stakeVault, tokenAccount, 5000n)
    expect(ix.keys.length).toBe(7)
    expect(ix.data[0]).toBe(DISCRIMINATORS.stake[0])
    // Amount is at offset 8
    expect(ix.data.readBigUInt64LE(8)).toBe(5000n)
  })

  test('createUnstakeInstruction has correct data', () => {
    const ix = createUnstakeInstruction(owner, pool, stakeEntry, stakeVault, tokenAccount, 3000n)
    expect(ix.data.readBigUInt64LE(8)).toBe(3000n)
  })

  test('createClaimRewardsInstruction has correct accounts', () => {
    const ix = createClaimRewardsInstruction(owner, pool, stakeEntry, rewardVault, tokenAccount)
    expect(ix.keys.length).toBe(6)
    expect(ix.keys[0].isSigner).toBe(true)
  })

  test('createCompoundRewardsInstruction has correct accounts', () => {
    const ix = createCompoundRewardsInstruction(owner, pool, stakeEntry, rewardVault, stakeVault)
    expect(ix.keys.length).toBe(6)
  })

  test('createEmergencyUnstakeInstruction has correct accounts', () => {
    const ix = createEmergencyUnstakeInstruction(owner, pool, stakeEntry, stakeVault, tokenAccount)
    expect(ix.keys.length).toBe(6)
  })

  test('createCreateNFTPoolInstruction has correct accounts', () => {
    const ix = createCreateNFTPoolInstruction(authority, nftPool, collection, rewardMint, rewardVault, 100n)
    expect(ix.keys.length).toBe(6)
    expect(ix.data.readBigUInt64LE(8)).toBe(100n)
  })

  test('createStakeNFTInstruction has 8 accounts', () => {
    const ix = createStakeNFTInstruction(owner, nftPool, nftStakeEntry, nftMint, ownerNFTAccount, vaultNFTAccount)
    expect(ix.keys.length).toBe(8)
  })

  test('createUnstakeNFTInstruction has 7 accounts', () => {
    const ix = createUnstakeNFTInstruction(owner, nftPool, nftStakeEntry, nftMint, ownerNFTAccount, vaultNFTAccount)
    expect(ix.keys.length).toBe(7)
  })

  test('createClaimNFTRewardsInstruction has 6 accounts', () => {
    const ix = createClaimNFTRewardsInstruction(owner, nftPool, nftStakeEntry, rewardVault, tokenAccount)
    expect(ix.keys.length).toBe(6)
  })

  test('createCreateLiquidPoolInstruction has 7 accounts', () => {
    const ix = createCreateLiquidPoolInstruction(authority, liquidPool, stakeMint, receiptMint, stakeVault)
    expect(ix.keys.length).toBe(7)
  })

  test('createLiquidStakeInstruction has correct data', () => {
    const ix = createLiquidStakeInstruction(owner, liquidPool, stakeVault, receiptMint, tokenAccount, tokenAccount, 1000n)
    expect(ix.data.readBigUInt64LE(8)).toBe(1000n)
  })

  test('createLiquidUnstakeInstruction has correct data', () => {
    const ix = createLiquidUnstakeInstruction(owner, liquidPool, stakeVault, receiptMint, tokenAccount, tokenAccount, 500n)
    expect(ix.data.readBigUInt64LE(8)).toBe(500n)
  })
})

// ---------------------------------------------------------------------------
// 4. calculatePendingRewards
// ---------------------------------------------------------------------------

describe('calculatePendingRewards', () => {
  function makePool(overrides: Partial<StakingPool> = {}): StakingPool {
    return {
      address: Keypair.generate().publicKey,
      authority: Keypair.generate().publicKey,
      stakeMint: Keypair.generate().publicKey,
      rewardMint: Keypair.generate().publicKey,
      totalStaked: 1000n,
      rewardRate: 10n,
      rewardDuration: 86400n,
      lastUpdateTime: 1000n,
      rewardPerTokenStored: 0n,
      minStakeDuration: 0n,
      earlyUnstakePenalty: 0,
      paused: false,
      ...overrides,
    }
  }

  test('returns 0 when totalStaked is 0', () => {
    const pool = makePool({ totalStaked: 0n })
    expect(calculatePendingRewards(pool, 100n, 0n, 2000n)).toBe(0n)
  })

  test('returns rewards for normal case', () => {
    const pool = makePool({ totalStaked: 1000n, rewardRate: 10n, lastUpdateTime: 1000n })
    const rewards = calculatePendingRewards(pool, 500n, 0n, 2000n)
    // timeDelta=1000, newRewards = (10 * 1000 * 500) / 1000 = 5000
    expect(rewards).toBe(5000n)
  })

  test('subtracts rewardDebt', () => {
    const pool = makePool({ totalStaked: 1000n, rewardRate: 10n, lastUpdateTime: 1000n })
    const rewards = calculatePendingRewards(pool, 500n, 3000n, 2000n)
    // newRewards=5000, totalRewards=5000, debt=3000 => 2000
    expect(rewards).toBe(2000n)
  })

  test('returns 0 when debt exceeds rewards', () => {
    const pool = makePool({ totalStaked: 1000n, rewardRate: 10n, lastUpdateTime: 1000n })
    const rewards = calculatePendingRewards(pool, 500n, 10000n, 2000n)
    expect(rewards).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// 5. calculateAPR
// ---------------------------------------------------------------------------

describe('calculateAPR', () => {
  test('returns 0 when totalStaked is 0', () => {
    expect(calculateAPR(100n, 0n, 9, 9)).toBe(0)
  })

  test('calculates correct APR for known inputs', () => {
    // rewardRate=1, totalStaked=31536000 (1 year in seconds)
    // rewardsPerYear = 1 * 31536000 = 31536000
    // normalized = 31536000 / 1e9 = 0.031536
    // totalStakedNormalized = 31536000 / 1e9 = 0.031536
    // APR = (0.031536 / 0.031536) * 100 = 100%
    const apr = calculateAPR(1n, 31536000n, 9, 9)
    expect(apr).toBeCloseTo(100, 0)
  })

  test('handles different decimals', () => {
    const apr = calculateAPR(1n, 31536000n, 6, 9)
    // rewardsPerYear normalized = 31536000/1e6 = 31.536
    // totalStaked normalized = 31536000/1e9 = 0.031536
    // APR = (31.536/0.031536)*100 = 100000000%... very high
    expect(apr).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. calculatePenalty
// ---------------------------------------------------------------------------

describe('calculatePenalty', () => {
  test('returns 0 when past minDuration', () => {
    const penalty = calculatePenalty(1000n, 1000, 0n, 100n, 200n)
    expect(penalty).toBe(0n)
  })

  test('returns full penalty at start', () => {
    // stakedAt=0, minDuration=100, currentTime=0
    // stakeDuration=0, remainingTime=100, penaltyRatio=(100*1000)/100=1000
    // penalty = (1000 * 1000) / 10000 = 100
    const penalty = calculatePenalty(1000n, 1000, 0n, 100n, 0n)
    expect(penalty).toBe(100n)
  })

  test('returns proportional penalty mid-way', () => {
    // stakedAt=0, minDuration=100, currentTime=50
    // stakeDuration=50, remainingTime=50, penaltyRatio=(50*1000)/100=500
    // penalty = (1000 * 500) / 10000 = 50
    const penalty = calculatePenalty(1000n, 1000, 0n, 100n, 50n)
    expect(penalty).toBe(50n)
  })

  test('lock-aware: self-locked longer than minStakeDuration still penalizes', () => {
    // A stake self-locked from t=0 to t=1000 while the pool minStakeDuration is
    // only 100. At t=500 the staker has passed minStakeDuration but is still
    // inside their own lock. canUnstake now penalizes against the actual lock
    // window (lockEndTime - stakedAt = 1000), not minStakeDuration.
    const stakedAt = 0n
    const lockEndTime = 1000n
    const currentTime = 500n
    const lockDuration = lockEndTime - stakedAt

    // Against minStakeDuration (the OLD, buggy behavior) the penalty is 0
    // because 500 >= 100.
    expect(calculatePenalty(1000n, 1000, stakedAt, 100n, currentTime)).toBe(0n)

    // Against the real lock window it is proportional to remaining lock time.
    // remainingTime=500, penaltyRatio=(500*1000)/1000=500, penalty=1000*500/10000=50
    expect(calculatePenalty(1000n, 1000, stakedAt, lockDuration, currentTime)).toBe(50n)
  })
})

// ---------------------------------------------------------------------------
// 7. validatePoolConfig
// ---------------------------------------------------------------------------

describe('validatePoolConfig', () => {
  test('returns no errors for valid config', () => {
    const options: CreatePoolOptions = {
      stakeMint: Keypair.generate().publicKey,
      rewardMint: Keypair.generate().publicKey,
      rewardRate: 100n,
      rewardDuration: 86400n,
    }
    expect(validatePoolConfig(options)).toEqual([])
  })

  test('returns error for negative reward rate', () => {
    const options: CreatePoolOptions = {
      stakeMint: Keypair.generate().publicKey,
      rewardMint: Keypair.generate().publicKey,
      rewardRate: -1n,
      rewardDuration: 86400n,
    }
    const errors = validatePoolConfig(options)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Reward rate')
  })

  test('returns error for penalty > 10000', () => {
    const options: CreatePoolOptions = {
      stakeMint: Keypair.generate().publicKey,
      rewardMint: Keypair.generate().publicKey,
      rewardRate: 100n,
      rewardDuration: 86400n,
      earlyUnstakePenalty: 15000,
    }
    const errors = validatePoolConfig(options)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('penalty')
  })
})

// ---------------------------------------------------------------------------
// 8. validateStakeAmount
// ---------------------------------------------------------------------------

describe('validateStakeAmount', () => {
  test('valid for normal amount', () => {
    const result = validateStakeAmount(100n, 1000n)
    expect(result.valid).toBe(true)
  })

  test('invalid for zero amount', () => {
    const result = validateStakeAmount(0n, 1000n)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('greater than 0')
  })

  test('invalid when exceeding balance', () => {
    const result = validateStakeAmount(2000n, 1000n)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Insufficient')
  })

  test('invalid when below minimum', () => {
    const result = validateStakeAmount(5n, 1000n, 10n)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Minimum')
  })
})

// ---------------------------------------------------------------------------
// 9. NFT points & rarity
// ---------------------------------------------------------------------------

describe('NFT points calculation', () => {
  test('returns 0 for same timestamp', () => {
    const points = calculateNFTPoints(1000n, 1000n, 100n, 1000n)
    expect(points).toBe(0n)
  })

  test('calculates daily points correctly', () => {
    const secondsPerDay = 86400n
    const points = calculateNFTPoints(0n, 0n, 100n, secondsPerDay)
    expect(points).toBe(100n)
  })

  test('calculates partial day points', () => {
    const halfDay = 43200n
    const points = calculateNFTPoints(0n, 0n, 100n, halfDay)
    expect(points).toBe(50n)
  })

  test('uses lastClaimTime when greater than stakedAt', () => {
    const secondsPerDay = 86400n
    const points = calculateNFTPoints(0n, secondsPerDay, 100n, secondsPerDay * 2n)
    expect(points).toBe(100n) // 1 day from lastClaim
  })
})

describe('Rarity multiplier', () => {
  test('applies matching multiplier', () => {
    const result = applyRarityMultiplier(
      100n,
      [{ trait: 'rarity', value: 'legendary' }],
      [{ trait: 'rarity', value: 'legendary', multiplier: 3.0 }]
    )
    expect(result).toBe(300n)
  })

  test('returns base when no match', () => {
    const result = applyRarityMultiplier(
      100n,
      [{ trait: 'rarity', value: 'common' }],
      [{ trait: 'rarity', value: 'legendary', multiplier: 3.0 }]
    )
    expect(result).toBe(100n)
  })
})

describe('Trait bonuses', () => {
  test('applies bonus when all traits match', () => {
    const result = applyTraitBonuses(
      100n,
      [
        { trait: 'hat', value: 'crown' },
        { trait: 'weapon', value: 'sword' },
      ],
      [{ traits: ['hat:crown', 'weapon:sword'], bonusMultiplier: 1.5 }]
    )
    expect(result).toBe(150n)
  })

  test('does not apply when traits do not match', () => {
    const result = applyTraitBonuses(
      100n,
      [{ trait: 'hat', value: 'cap' }],
      [{ traits: ['hat:crown', 'weapon:sword'], bonusMultiplier: 1.5 }]
    )
    expect(result).toBe(100n)
  })
})

// ---------------------------------------------------------------------------
// 10. Liquid staking calculations
// ---------------------------------------------------------------------------

describe('Liquid staking', () => {
  test('exchange rate is 1.0 when no receipt supply', () => {
    expect(calculateExchangeRate(1000n, 0n)).toBe(1.0)
  })

  test('exchange rate increases with rewards', () => {
    // 1100 staked, 1000 receipt => 1.1 exchange rate
    expect(calculateExchangeRate(1100n, 1000n)).toBeCloseTo(1.1, 5)
  })

  test('calculateReceiptAmount converts correctly', () => {
    const receipt = calculateReceiptAmount(1000n, 1.1)
    // 1000 / 1.1 = ~909
    expect(receipt).toBe(909n)
  })

  test('calculateRedeemAmount converts correctly', () => {
    const redeem = calculateRedeemAmount(909n, 1.1)
    // 909 * 1.1 = ~999
    expect(redeem).toBe(999n)
  })

  test('calculateReceiptAmount returns 0 for zero rate', () => {
    expect(calculateReceiptAmount(1000n, 0)).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// 10b. Liquid staking — exact bigint conversions
// ---------------------------------------------------------------------------

describe('Liquid staking (exact bigint)', () => {
  test('mints receipts 1:1 when receipt supply is 0', () => {
    expect(calculateReceiptAmountExact(1000n, 0n, 0n)).toBe(1000n)
    // Also 1:1 when the pool has never accrued (totalStaked 0)
    expect(calculateReceiptAmountExact(1000n, 0n, 500n)).toBe(1000n)
  })

  test('receipt = stakeAmount * totalReceiptSupply / totalStaked', () => {
    // 1100 staked backing 1000 receipts => depositing 1100 mints 1000
    expect(calculateReceiptAmountExact(1100n, 1100n, 1000n)).toBe(1000n)
    // depositing 550 into that pool mints 500
    expect(calculateReceiptAmountExact(550n, 1100n, 1000n)).toBe(500n)
  })

  test('redeem = receiptAmount * totalStaked / totalReceiptSupply', () => {
    expect(calculateRedeemAmountExact(1000n, 1100n, 1000n)).toBe(1100n)
    expect(calculateRedeemAmountExact(500n, 1100n, 1000n)).toBe(550n)
  })

  test('redeem returns 0 when receipt supply is 0', () => {
    expect(calculateRedeemAmountExact(1000n, 0n, 0n)).toBe(0n)
  })

  test('receipt/redeem round-trips at a 1:1 rate', () => {
    const staked = 1_000_000n
    const supply = 1_000_000n
    const receipt = calculateReceiptAmountExact(12345n, staked, supply)
    expect(calculateRedeemAmountExact(receipt, staked, supply)).toBe(12345n)
  })

  test('exact variant is correct for u64 base units above 2^53 that the float version loses', () => {
    // Base units well beyond Number.MAX_SAFE_INTEGER (2^53 - 1).
    const totalStaked = 9_000_000_000_000_000_001n
    const totalReceiptSupply = 9_000_000_000_000_000_000n
    const stakeAmount = 9_000_000_000_000_000_000n

    // Exact bigint math: 9e18 * 9e18 / (9e18 + 1) = 8999999999999999999
    const exact = calculateReceiptAmountExact(stakeAmount, totalStaked, totalReceiptSupply)
    expect(exact).toBe(8_999_999_999_999_999_999n)

    // The float variant rounds the exchange rate to 1 and returns the input
    // unchanged, disagreeing with the exact (correct) result.
    const rate = calculateExchangeRate(totalStaked, totalReceiptSupply)
    const floaty = calculateReceiptAmount(stakeAmount, rate)
    expect(floaty).not.toBe(exact)
    expect(floaty).toBe(9_000_000_000_000_000_000n)
  })
})

// ---------------------------------------------------------------------------
// 10c. Decimal-aware APR
// ---------------------------------------------------------------------------

describe('calculateAPR (decimal-aware)', () => {
  test('equal decimals divide out to a plain base-unit ratio', () => {
    // rewardsPerYear = 2 * 31536000; stake normalized identically => same as
    // using raw base units when decimals match.
    const apr = calculateAPR(2n, 31536000n, 6, 6)
    expect(apr).toBeCloseTo(200, 0)
  })

  test('reward decimals smaller than stake decimals inflates APR by 10^delta', () => {
    // reward has 6 decimals, stake has 9 => reward base units are worth 10^3
    // more per whole token, so the APR is 1000x the equal-decimals case.
    const equal = calculateAPR(1n, 31536000n, 9, 9)
    const skewed = calculateAPR(1n, 31536000n, 6, 9)
    expect(skewed).toBeCloseTo(equal * 1000, 5)
  })

  test('reward decimals larger than stake decimals deflates APR by 10^delta', () => {
    const equal = calculateAPR(1n, 31536000n, 9, 9)
    const skewed = calculateAPR(1n, 31536000n, 9, 6)
    expect(skewed).toBeCloseTo(equal / 1000, 10)
  })
})

// ---------------------------------------------------------------------------
// 11. formatDuration
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  test('formats days and hours', () => {
    const result = formatDuration(90000n) // 1d 1h
    expect(result).toBe('1d 1h')
  })

  test('formats hours and minutes', () => {
    const result = formatDuration(3660n) // 1h 1m
    expect(result).toBe('1h 1m')
  })

  test('formats minutes only', () => {
    const result = formatDuration(300n) // 5m
    expect(result).toBe('5m')
  })

  test('formats 0 as 0m', () => {
    const result = formatDuration(0n)
    expect(result).toBe('0m')
  })
})

// ---------------------------------------------------------------------------
// 12. Analytics export
// ---------------------------------------------------------------------------

describe('Analytics export', () => {
  const history: StakingHistoryEntry[] = [
    { timestamp: 1700000000, action: 'stake', amount: 1000n, signature: 'sig1', pool: 'pool1' },
    { timestamp: 1700086400, action: 'claim', amount: 50n, signature: 'sig2', pool: 'pool1' },
  ]

  test('exports CSV with header and rows', () => {
    const csv = exportStakingData(history, 'csv')
    const lines = csv.split('\n')
    expect(lines[0]).toBe('timestamp,action,amount,signature,pool')
    expect(lines.length).toBe(3) // header + 2 rows
    expect(lines[1]).toContain('1700000000')
    expect(lines[1]).toContain('stake')
  })

  test('exports JSON with stringified bigints', () => {
    const json = exportStakingData(history, 'json')
    const parsed = JSON.parse(json)
    expect(parsed.length).toBe(2)
    expect(parsed[0].amount).toBe('1000')
    expect(parsed[1].action).toBe('claim')
  })
})

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

describe('Serializers', () => {
  test('serializeCreatePoolData produces correct buffer', () => {
    const data = serializeCreatePoolData(100n, 86400n, 3600n, 500)
    // 8 (disc) + 8 + 8 + 8 + 2 = 34
    expect(data.length).toBe(34)
    expect(data.readBigUInt64LE(8)).toBe(100n)
    expect(data.readBigUInt64LE(16)).toBe(86400n)
    expect(data.readBigUInt64LE(24)).toBe(3600n)
    expect(data.readUInt16LE(32)).toBe(500)
  })

  test('serializeStakeData produces correct buffer', () => {
    const data = serializeStakeData(5000n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(5000n)
  })

  test('serializeUnstakeData produces correct buffer', () => {
    const data = serializeUnstakeData(3000n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(3000n)
  })

  test('serializeFundRewardsData produces correct buffer', () => {
    const data = serializeFundRewardsData(10000n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(10000n)
  })

  test('serializeUpdatePoolData with all null options', () => {
    const data = serializeUpdatePoolData(null, null, null, null)
    // 8 (disc) + 4 * 1 (None bytes) = 12
    expect(data.length).toBe(12)
  })

  test('serializeUpdatePoolData with some options set', () => {
    const data = serializeUpdatePoolData(200n, null, null, 1000)
    // 8 (disc) + (1+8) + 1 + 1 + (1+2) = 22
    expect(data.length).toBe(22)
  })

  test('serializeCreateNFTPoolData produces correct buffer', () => {
    const data = serializeCreateNFTPoolData(100n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(100n)
  })

  test('serializeLiquidStakeData produces correct buffer', () => {
    const data = serializeLiquidStakeData(5000n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(5000n)
  })

  test('serializeLiquidUnstakeData produces correct buffer', () => {
    const data = serializeLiquidUnstakeData(2500n)
    expect(data.length).toBe(16)
    expect(data.readBigUInt64LE(8)).toBe(2500n)
  })
})
