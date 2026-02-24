/**
 * NFT Staking
 *
 * Create NFT staking pools, stake/unstake NFTs, rarity multipliers, trait bonuses.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  NFTStakingPool,
  NFTStakeInfo,
  NFTPoolConfig,
  StakeNFTOptions,
  UnstakeNFTOptions,
  ClaimNFTRewardsOptions,
  StakingResult,
  ClaimResult,
  RarityMultiplier,
  TraitBonus,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import {
  STAKING_PROGRAM_ID,
  getNFTPoolAddress,
  getNFTStakeEntryAddress,
  getRewardVaultAddress,
} from './program'
import {
  createCreateNFTPoolInstruction,
  createStakeNFTInstruction,
  createUnstakeNFTInstruction,
  createClaimNFTRewardsInstruction,
} from './instructions'

/**
 * Create an NFT staking pool for a collection
 */
export async function createNFTStakePool(
  options: NFTPoolConfig,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const nftPool = getNFTPoolAddress(payer.publicKey, options.collection)
  const rewardVault = getRewardVaultAddress(nftPool)

  const instruction = createCreateNFTPoolInstruction(
    payer.publicKey,
    nftPool,
    options.collection,
    options.rewardMint,
    rewardVault,
    options.pointsPerDay
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    pool: nftPool.toBase58(),
  }
}

/**
 * Stake an NFT into a pool
 */
export async function stakeNFT(
  options: StakeNFTOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const nftStakeEntry = getNFTStakeEntryAddress(options.pool, options.mint)
  const ownerNFTAccount = await getAssociatedTokenAddress(options.mint, payer.publicKey)
  const vaultNFTAccount = await getAssociatedTokenAddress(options.mint, options.pool, true)

  const instruction = createStakeNFTInstruction(
    payer.publicKey,
    options.pool,
    nftStakeEntry,
    options.mint,
    ownerNFTAccount,
    vaultNFTAccount
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    pool: options.pool.toBase58(),
    stakeEntry: nftStakeEntry.toBase58(),
  }
}

/**
 * Unstake an NFT from a pool
 */
export async function unstakeNFT(
  options: UnstakeNFTOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const nftStakeEntry = getNFTStakeEntryAddress(options.pool, options.mint)
  const ownerNFTAccount = await getAssociatedTokenAddress(options.mint, payer.publicKey)
  const vaultNFTAccount = await getAssociatedTokenAddress(options.mint, options.pool, true)

  const instruction = createUnstakeNFTInstruction(
    payer.publicKey,
    options.pool,
    nftStakeEntry,
    options.mint,
    ownerNFTAccount,
    vaultNFTAccount
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    pool: options.pool.toBase58(),
    stakeEntry: nftStakeEntry.toBase58(),
  }
}

/**
 * Claim rewards for a staked NFT
 */
export async function claimNFTRewards(
  options: ClaimNFTRewardsOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<ClaimResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const nftStakeEntry = getNFTStakeEntryAddress(options.pool, options.mint)
  const rewardVault = getRewardVaultAddress(options.pool)

  const nftPool = await getNFTPool(connection, options.pool)
  if (!nftPool) {
    throw new Error('NFT pool not found')
  }

  const ownerRewardAccount = await getAssociatedTokenAddress(
    nftPool.rewardMint,
    payer.publicKey
  )

  const instruction = createClaimNFTRewardsInstruction(
    payer.publicKey,
    options.pool,
    nftStakeEntry,
    rewardVault,
    ownerRewardAccount
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    rewardsClaimed: 0n, // Actual amount determined by on-chain program
  }
}

// ---------------------------------------------------------------------------
// Pure calculation helpers
// ---------------------------------------------------------------------------

/**
 * Apply rarity multiplier to base points
 */
export function applyRarityMultiplier(
  basePoints: bigint,
  nftTraits: Array<{ trait: string; value: string }>,
  multipliers: RarityMultiplier[]
): bigint {
  for (const multiplier of multipliers) {
    const match = nftTraits.find(
      t => t.trait === multiplier.trait && t.value === multiplier.value
    )
    if (match) {
      return BigInt(Math.floor(Number(basePoints) * multiplier.multiplier))
    }
  }
  return basePoints
}

/**
 * Apply trait bonuses to base points
 */
export function applyTraitBonuses(
  basePoints: bigint,
  nftTraits: Array<{ trait: string; value: string }>,
  bonuses: TraitBonus[]
): bigint {
  let totalBonus = 1.0
  const traitValues = nftTraits.map(t => `${t.trait}:${t.value}`)

  for (const bonus of bonuses) {
    const hasAll = bonus.traits.every(t => traitValues.includes(t))
    if (hasAll) {
      totalBonus *= bonus.bonusMultiplier
    }
  }

  return BigInt(Math.floor(Number(basePoints) * totalBonus))
}

/**
 * Calculate NFT rewards with rarity multipliers and trait bonuses
 */
export function calculateNFTRewardsWithMultipliers(
  pointsPerDay: bigint,
  stakedAt: bigint,
  lastClaimTime: bigint,
  nftTraits: Array<{ trait: string; value: string }>,
  multipliers: RarityMultiplier[],
  bonuses: TraitBonus[],
  currentTime: bigint
): bigint {
  const { calculateNFTPoints } = require('./stake')
  const basePoints = calculateNFTPoints(stakedAt, lastClaimTime, pointsPerDay, currentTime)

  let adjusted = applyRarityMultiplier(basePoints, nftTraits, multipliers)
  adjusted = applyTraitBonuses(adjusted, nftTraits, bonuses)

  return adjusted
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Get NFT staking pool info
 */
export async function getNFTPool(
  connection: Connection,
  poolAddress: PublicKey
): Promise<NFTStakingPool | null> {
  const accountInfo = await connection.getAccountInfo(poolAddress)
  if (!accountInfo) return null

  const data = accountInfo.data
  return {
    address: poolAddress,
    authority: new PublicKey(data.subarray(8, 40)),
    collection: new PublicKey(data.subarray(40, 72)),
    rewardMint: new PublicKey(data.subarray(72, 104)),
    pointsPerDay: data.readBigUInt64LE(104),
    totalStaked: data.readBigUInt64LE(112),
    paused: data[120] === 1,
  }
}

/**
 * Get all staked NFTs in a pool
 */
export async function getAllStakedNFTs(
  connection: Connection,
  pool: PublicKey
): Promise<NFTStakeInfo[]> {
  const accounts = await connection.getProgramAccounts(STAKING_PROGRAM_ID, {
    filters: [
      { dataSize: 136 },
      { memcmp: { offset: 40, bytes: pool.toBase58() } },
    ],
  })

  return accounts.map(({ _pubkey, account }) => ({
    owner: new PublicKey(account.data.subarray(8, 40)),
    pool: new PublicKey(account.data.subarray(40, 72)),
    mint: new PublicKey(account.data.subarray(72, 104)),
    stakedAt: account.data.readBigUInt64LE(104),
    lastClaimTime: account.data.readBigUInt64LE(112),
    lockEndTime: account.data.readBigUInt64LE(120),
    pointsEarned: account.data.readBigUInt64LE(128),
  }))
}
