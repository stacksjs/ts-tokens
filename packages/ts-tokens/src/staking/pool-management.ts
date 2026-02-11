/**
 * Staking Pool Management
 *
 * High-level pool CRUD operations: create, update, pause, fund, close.
 */

import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  CreatePoolOptions,
  UpdatePoolOptions,
  FundRewardsOptions,
  WithdrawRewardsOptions,
  ClosePoolOptions,
  StakingResult,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import {
  getPoolAddress,
  getStakeVaultAddress,
  getRewardVaultAddress,
} from './program'
import {
  createCreatePoolInstruction,
  createUpdatePoolInstruction,
  createPausePoolInstruction,
  createResumePoolInstruction,
  createFundRewardsInstruction,
  createWithdrawRewardsInstruction,
  createClosePoolInstruction,
} from './instructions'
import { validatePoolConfig } from './pool'

/**
 * Create a new staking pool
 */
export async function createStakePool(
  options: CreatePoolOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const errors = validatePoolConfig(options)
  if (errors.length > 0) {
    throw new Error(`Invalid pool config: ${errors.join(', ')}`)
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)

  const pool = getPoolAddress(payer.publicKey, options.stakeMint)
  const stakeVault = getStakeVaultAddress(pool)
  const rewardVault = getRewardVaultAddress(pool)

  const instruction = createCreatePoolInstruction(
    payer.publicKey,
    pool,
    options.stakeMint,
    options.rewardMint,
    stakeVault,
    rewardVault,
    options.rewardRate,
    options.rewardDuration,
    options.minStakeDuration ?? 0n,
    options.earlyUnstakePenalty ?? 0
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
    pool: pool.toBase58(),
  }
}

/**
 * Update staking pool parameters
 */
export async function updateStakePool(
  options: UpdatePoolOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = createUpdatePoolInstruction(
    payer.publicKey,
    options.pool,
    options.rewardRate ?? null,
    options.rewardDuration ?? null,
    options.minStakeDuration ?? null,
    options.earlyUnstakePenalty ?? null
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
  }
}

/**
 * Pause a staking pool
 */
export async function pauseStakePool(
  pool: PublicKey,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = createPausePoolInstruction(payer.publicKey, pool)

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
    pool: pool.toBase58(),
  }
}

/**
 * Resume a paused staking pool
 */
export async function resumeStakePool(
  pool: PublicKey,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const instruction = createResumePoolInstruction(payer.publicKey, pool)

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
    pool: pool.toBase58(),
  }
}

/**
 * Fund a pool's reward vault
 */
export async function fundRewards(
  options: FundRewardsOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const rewardVault = getRewardVaultAddress(options.pool)
  const { getPool } = await import('./pool')
  const pool = await getPool(connection, options.pool)

  if (!pool) {
    throw new Error('Pool not found')
  }

  const authorityTokenAccount = await getAssociatedTokenAddress(
    pool.rewardMint,
    payer.publicKey
  )

  const instruction = createFundRewardsInstruction(
    payer.publicKey,
    options.pool,
    rewardVault,
    authorityTokenAccount,
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
    amount: options.amount,
  }
}

/**
 * Withdraw unfunded rewards from a pool
 */
export async function withdrawRewards(
  options: WithdrawRewardsOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const rewardVault = getRewardVaultAddress(options.pool)
  const { getPool } = await import('./pool')
  const pool = await getPool(connection, options.pool)

  if (!pool) {
    throw new Error('Pool not found')
  }

  const authorityTokenAccount = await getAssociatedTokenAddress(
    pool.rewardMint,
    payer.publicKey
  )

  const instruction = createWithdrawRewardsInstruction(
    payer.publicKey,
    options.pool,
    rewardVault,
    authorityTokenAccount,
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
    amount: options.amount,
  }
}

/**
 * Close a staking pool and return all funds
 */
export async function closeStakePool(
  options: ClosePoolOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const stakeVault = getStakeVaultAddress(options.pool)
  const rewardVault = getRewardVaultAddress(options.pool)

  const instruction = createClosePoolInstruction(
    payer.publicKey,
    options.pool,
    stakeVault,
    rewardVault,
    payer.publicKey
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
  }
}
