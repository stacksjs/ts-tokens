/**
 * Marinade Finance Integration
 *
 * Liquid staking (mSOL) helpers.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

const MARINADE_PROGRAM_ID = new PublicKey('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD')
const MSOL_MINT = new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So')
const MARINADE_STATE = new PublicKey('8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC')
const MARINADE_API = 'https://api.marinade.finance/v1'

export interface MarinadeStakeInfo {
  totalStaked: bigint
  msolPrice: number
  apy: number
  totalMsolSupply: bigint
  stakingCap?: bigint
}

export interface MarinadeUserPosition {
  stakedSol: bigint
  msolBalance: bigint
  estimatedValue: bigint
}

/**
 * Get Marinade staking information
 */
export async function getMarinadeInfo(): Promise<MarinadeStakeInfo> {
  const response = await fetch(`${MARINADE_API}/state`)

  if (!response.ok) {
    throw new Error(`Marinade API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    totalStaked: BigInt(Math.floor((data.tvl?.totalSol ?? 0) * LAMPORTS_PER_SOL)),
    msolPrice: data.msol_price ?? 1,
    apy: data.staking_apy ?? 0,
    totalMsolSupply: BigInt(Math.floor((data.tvl?.totalMsol ?? 0) * LAMPORTS_PER_SOL)),
    stakingCap: data.staking_cap ? BigInt(Math.floor(data.staking_cap * LAMPORTS_PER_SOL)) : undefined,
  }
}

/**
 * Get user's Marinade position
 */
export async function getMarinadePosition(
  connection: Connection,
  owner: PublicKey,
): Promise<MarinadeUserPosition> {
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

  const [msolAta] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), MSOL_MINT.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  let msolBalance = BigInt(0)
  try {
    const account = await connection.getTokenAccountBalance(msolAta)
    msolBalance = BigInt(account.value.amount)
  } catch {
    // No mSOL account
  }

  const info = await getMarinadeInfo()
  const estimatedValue = BigInt(Math.floor(Number(msolBalance) * info.msolPrice))

  return {
    stakedSol: estimatedValue,
    msolBalance,
    estimatedValue,
  }
}

/**
 * Build stake SOL transaction (deposit SOL to receive mSOL)
 */
export async function buildStakeTransaction(
  connection: Connection,
  owner: PublicKey,
  amountLamports: bigint,
): Promise<Transaction> {
  const transaction = new Transaction()

  // Simplified instruction — real impl uses Marinade SDK instructions
  // This builds a system transfer to the Marinade state account
  // The actual Marinade program instruction would be more complex
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: MARINADE_STATE,
      lamports: amountLamports,
    })
  )

  transaction.feePayer = owner
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

  return transaction
}

/**
 * Calculate staking rewards estimate
 */
export async function estimateStakingRewards(
  amountSol: number,
  durationDays: number,
): Promise<{ estimatedRewardSol: number; estimatedApy: number; msolReceived: number }> {
  const info = await getMarinadeInfo()
  const dailyRate = info.apy / 365
  const estimatedRewardSol = amountSol * dailyRate * durationDays
  const msolReceived = amountSol / info.msolPrice

  return {
    estimatedRewardSol,
    estimatedApy: info.apy,
    msolReceived,
  }
}

export { MARINADE_PROGRAM_ID, MSOL_MINT, MARINADE_STATE }
