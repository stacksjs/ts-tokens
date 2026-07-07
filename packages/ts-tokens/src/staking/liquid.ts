/**
 * Liquid Staking
 *
 * Create liquid staking pools, stake/unstake with receipt tokens, exchange rate management.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  LiquidStakingPool,
  CreateLiquidPoolOptions,
  LiquidStakeOptions,
  LiquidUnstakeOptions,
  StakingResult,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import {
  getLiquidPoolAddress,
  getReceiptMintAddress,
  getStakeVaultAddress,
  programNotDeployedError,
} from './program'
import {
  createCreateLiquidPoolInstruction,
  createLiquidStakeInstruction,
  createLiquidUnstakeInstruction,
} from './instructions'

/**
 * Create a liquid staking pool with receipt tokens
 */
export async function createLiquidStakePool(
  options: CreateLiquidPoolOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  programNotDeployedError()

  const liquidPool = getLiquidPoolAddress(payer.publicKey, options.stakeMint)
  const receiptMint = getReceiptMintAddress(liquidPool)
  const stakeVault = getStakeVaultAddress(liquidPool)

  const instruction = createCreateLiquidPoolInstruction(
    payer.publicKey,
    liquidPool,
    options.stakeMint,
    receiptMint,
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
    pool: liquidPool.toBase58(),
  }
}

/**
 * Deposit tokens and receive receipt tokens
 */
export async function liquidStake(
  options: LiquidStakeOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const liquidPool = await getLiquidPool(connection, options.pool)
  if (!liquidPool) {
    throw new Error('Liquid pool not found')
  }

  const stakeVault = getStakeVaultAddress(options.pool)
  const ownerStakeAccount = await getAssociatedTokenAddress(
    liquidPool.stakeMint,
    payer.publicKey
  )
  const ownerReceiptAccount = await getAssociatedTokenAddress(
    liquidPool.receiptMint,
    payer.publicKey
  )

  const instruction = createLiquidStakeInstruction(
    payer.publicKey,
    options.pool,
    stakeVault,
    liquidPool.receiptMint,
    ownerStakeAccount,
    ownerReceiptAccount,
    options.amount
  )

  // Refuse before submitting: the staking program is undeployed.
  programNotDeployedError()

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
 * Burn receipt tokens and withdraw underlying tokens
 */
export async function liquidUnstake(
  options: LiquidUnstakeOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<StakingResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const liquidPool = await getLiquidPool(connection, options.pool)
  if (!liquidPool) {
    throw new Error('Liquid pool not found')
  }

  const stakeVault = getStakeVaultAddress(options.pool)
  const ownerStakeAccount = await getAssociatedTokenAddress(
    liquidPool.stakeMint,
    payer.publicKey
  )
  const ownerReceiptAccount = await getAssociatedTokenAddress(
    liquidPool.receiptMint,
    payer.publicKey
  )

  const instruction = createLiquidUnstakeInstruction(
    payer.publicKey,
    options.pool,
    stakeVault,
    liquidPool.receiptMint,
    ownerStakeAccount,
    ownerReceiptAccount,
    options.receiptAmount
  )

  // Refuse before submitting: the staking program is undeployed.
  programNotDeployedError()

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
    amount: options.receiptAmount,
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Get liquid staking pool info
 */
export async function getLiquidPool(
  connection: Connection,
  poolAddress: PublicKey
): Promise<LiquidStakingPool | null> {
  const accountInfo = await connection.getAccountInfo(poolAddress)
  if (!accountInfo) return null

  const data = accountInfo.data
  return {
    address: poolAddress,
    authority: new PublicKey(data.subarray(8, 40)),
    stakeMint: new PublicKey(data.subarray(40, 72)),
    receiptMint: new PublicKey(data.subarray(72, 104)),
    totalStaked: data.readBigUInt64LE(104),
    totalReceiptSupply: data.readBigUInt64LE(112),
    exchangeRate: Number(data.readBigUInt64LE(120)) / 1e9,
    paused: data[128] === 1,
  }
}

// ---------------------------------------------------------------------------
// Pure calculation helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the exchange rate between staked tokens and receipt tokens.
 *
 * APPROXIMATE — this rounds u64 base units through float and is only safe for
 * display. For any on-chain-amount path use the bigint variants
 * ({@link calculateReceiptAmountExact} / {@link calculateRedeemAmountExact}),
 * which compute against totalStaked/totalReceiptSupply without float loss.
 */
export function calculateExchangeRate(
  totalStaked: bigint,
  totalReceiptSupply: bigint
): number {
  if (totalReceiptSupply === 0n) return 1.0
  return Number(totalStaked) / Number(totalReceiptSupply)
}

/**
 * Calculate receipt tokens received for a stake amount.
 *
 * APPROXIMATE — rounds through float; for display only. Prefer
 * {@link calculateReceiptAmountExact} in on-chain-amount paths.
 */
export function calculateReceiptAmount(
  stakeAmount: bigint,
  exchangeRate: number
): bigint {
  if (exchangeRate === 0) return 0n
  return BigInt(Math.floor(Number(stakeAmount) / exchangeRate))
}

/**
 * Calculate underlying tokens redeemed for receipt tokens.
 *
 * APPROXIMATE — rounds through float; for display only. Prefer
 * {@link calculateRedeemAmountExact} in on-chain-amount paths.
 */
export function calculateRedeemAmount(
  receiptAmount: bigint,
  exchangeRate: number
): bigint {
  return BigInt(Math.floor(Number(receiptAmount) * exchangeRate))
}

/**
 * Exact bigint receipt-amount conversion.
 *
 * receipt = stakeAmount * totalReceiptSupply / totalStaked, minting 1:1 when
 * the pool is empty (totalReceiptSupply === 0n). Computes entirely in bigint so
 * it stays correct for u64 base units above 2^53 that the float variant loses.
 */
export function calculateReceiptAmountExact(
  stakeAmount: bigint,
  totalStaked: bigint,
  totalReceiptSupply: bigint
): bigint {
  // Empty pool: mint receipts 1:1 with the deposited amount.
  if (totalReceiptSupply === 0n || totalStaked === 0n) {
    return stakeAmount
  }
  return (stakeAmount * totalReceiptSupply) / totalStaked
}

/**
 * Exact bigint redeem-amount conversion.
 *
 * redeem = receiptAmount * totalStaked / totalReceiptSupply. Computes entirely
 * in bigint so it stays correct for u64 base units above 2^53 that the float
 * variant loses.
 */
export function calculateRedeemAmountExact(
  receiptAmount: bigint,
  totalStaked: bigint,
  totalReceiptSupply: bigint
): bigint {
  if (totalReceiptSupply === 0n) {
    return 0n
  }
  return (receiptAmount * totalStaked) / totalReceiptSupply
}

/**
 * Get receipt token balance for a user
 */
export async function getReceiptTokenBalance(
  connection: Connection,
  owner: PublicKey,
  receiptMint: PublicKey
): Promise<bigint> {
  try {
    const ata = await getAssociatedTokenAddress(receiptMint, owner)
    const account = await getAccount(connection, ata)
    return account.amount
  } catch {
    return 0n
  }
}
