/**
 * Staking User Operations
 *
 * High-level user staking operations: stake, unstake, claim, compound.
 */

import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  StakeOptions,
  UnstakeOptions,
  ClaimOptions,
  CompoundOptions,
  EmergencyUnstakeOptions,
  StakingResult,
  ClaimResult,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import {
  getStakeEntryAddress,
  getStakeVaultAddress,
  getRewardVaultAddress,
} from './program'
import {
  createStakeInstruction,
  createUnstakeInstruction,
  createClaimRewardsInstruction,
  createCompoundRewardsInstruction,
  createEmergencyUnstakeInstruction,
} from './instructions'

/**
 * Stake tokens into a pool
 */
export async function stake(
  options: StakeOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const stakeEntry = getStakeEntryAddress(options.pool, payer.publicKey)
  const stakeVault = getStakeVaultAddress(options.pool)

  const { getPool } = await import('./pool')
  const pool = await getPool(connection, options.pool)

  if (!pool) {
    throw new Error('Pool not found')
  }

  if (pool.paused) {
    throw new Error('Pool is paused')
  }

  const ownerTokenAccount = await getAssociatedTokenAddress(
    pool.stakeMint,
    payer.publicKey
  )

  const instruction = createStakeInstruction(
    payer.publicKey,
    options.pool,
    stakeEntry,
    stakeVault,
    ownerTokenAccount,
    options.amount
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
    stakeEntry: stakeEntry.toBase58(),
    amount: options.amount,
  }
}

/**
 * Unstake tokens from a pool
 */
export async function unstake(
  options: UnstakeOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const stakeEntry = getStakeEntryAddress(options.pool, payer.publicKey)
  const stakeVault = getStakeVaultAddress(options.pool)

  const { getPool } = await import('./pool')
  const pool = await getPool(connection, options.pool)

  if (!pool) {
    throw new Error('Pool not found')
  }

  const ownerTokenAccount = await getAssociatedTokenAddress(
    pool.stakeMint,
    payer.publicKey
  )

  const instruction = createUnstakeInstruction(
    payer.publicKey,
    options.pool,
    stakeEntry,
    stakeVault,
    ownerTokenAccount,
    options.amount
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
    stakeEntry: stakeEntry.toBase58(),
    amount: options.amount,
  }
}

/**
 * Claim accumulated rewards
 */
export async function claimRewards(
  options: ClaimOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<ClaimResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const stakeEntry = getStakeEntryAddress(options.pool, payer.publicKey)
  const rewardVault = getRewardVaultAddress(options.pool)

  const { getPool } = await import('./pool')
  const pool = await getPool(connection, options.pool)

  if (!pool) {
    throw new Error('Pool not found')
  }

  const ownerRewardAccount = await getAssociatedTokenAddress(
    pool.rewardMint,
    payer.publicKey
  )

  const instruction = createClaimRewardsInstruction(
    payer.publicKey,
    options.pool,
    stakeEntry,
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

/**
 * Compound rewards back into the stake
 */
export async function compoundRewards(
  options: CompoundOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const stakeEntry = getStakeEntryAddress(options.pool, payer.publicKey)
  const rewardVault = getRewardVaultAddress(options.pool)
  const stakeVault = getStakeVaultAddress(options.pool)

  const instruction = createCompoundRewardsInstruction(
    payer.publicKey,
    options.pool,
    stakeEntry,
    rewardVault,
    stakeVault
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
    stakeEntry: stakeEntry.toBase58(),
  }
}

/**
 * Emergency unstake with maximum penalty
 */
export async function emergencyUnstake(
  options: EmergencyUnstakeOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const stakeEntry = getStakeEntryAddress(options.pool, payer.publicKey)
  const stakeVault = getStakeVaultAddress(options.pool)

  const { getPool } = await import('./pool')
  const pool = await getPool(connection, options.pool)

  if (!pool) {
    throw new Error('Pool not found')
  }

  const ownerTokenAccount = await getAssociatedTokenAddress(
    pool.stakeMint,
    payer.publicKey
  )

  const instruction = createEmergencyUnstakeInstruction(
    payer.publicKey,
    options.pool,
    stakeEntry,
    stakeVault,
    ownerTokenAccount
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
    stakeEntry: stakeEntry.toBase58(),
  }
}
