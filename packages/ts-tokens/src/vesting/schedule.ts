/**
 * Vesting Schedule Management
 *
 * Create vesting schedules, query vested amounts, and claim vested tokens.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import type { TokenConfig } from '../types'
import type {
  VestingConfig,
  VestingSchedule,
  VestingStatusReport,
  VestingState,
  SerializedVestingSchedule,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'

/**
 * Get vesting state file path
 */
export function getVestingStatePath(): string {
  return path.join(os.homedir(), '.ts-tokens', 'vesting-state.json')
}

/**
 * Load vesting state
 */
function loadVestingState(storePath?: string): VestingState {
  const filePath = storePath ?? getVestingStatePath()
  if (!fs.existsSync(filePath)) return { schedules: {} }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/**
 * Save vesting state
 */
function saveVestingState(state: VestingState, storePath?: string): void {
  const filePath = storePath ?? getVestingStatePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), { mode: 0o600 })
}

/**
 * Generate a unique vesting ID
 */
function generateId(): string {
  return `vesting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Calculate the cliff date from start date and cliff months
 */
function addMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp)
  date.setMonth(date.getMonth() + months)
  return date.getTime()
}

/**
 * Create a vesting schedule
 */
export async function createVestingSchedule(
  vestingConfig: VestingConfig,
  config: TokenConfig
): Promise<VestingSchedule> {
  const startDate = vestingConfig.startDate || Date.now()
  const cliffDate = addMonths(startDate, vestingConfig.cliffMonths)
  const endDate = addMonths(startDate, vestingConfig.cliffMonths + vestingConfig.vestingMonths)

  const schedule: VestingSchedule = {
    id: generateId(),
    recipient: vestingConfig.recipient,
    mint: vestingConfig.mint,
    totalAmount: vestingConfig.totalAmount,
    vestedAmount: 0n,
    claimedAmount: 0n,
    cliffMonths: vestingConfig.cliffMonths,
    vestingMonths: vestingConfig.vestingMonths,
    cliffPercentage: vestingConfig.cliffPercentage ?? 0,
    startDate,
    cliffDate,
    endDate,
    status: 'pending',
    claimSignatures: [],
    createdAt: Date.now(),
  }

  // Persist
  const state = loadVestingState()
  state.schedules[schedule.id] = serializeSchedule(schedule)
  saveVestingState(state)

  return schedule
}

/**
 * Fund a vesting schedule by transferring tokens to an escrow
 */
export async function fundVestingSchedule(
  vestingId: string,
  config: TokenConfig
): Promise<{ signature: string }> {
  const state = loadVestingState()
  const serialized = state.schedules[vestingId]
  if (!serialized) throw new Error(`Vesting schedule not found: ${vestingId}`)
  if (serialized.status !== 'pending') {
    throw new Error(`Vesting schedule is already ${serialized.status}`)
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(serialized.mint)
  const escrowKeypair = Keypair.generate()

  // Create and fund escrow ATA
  const escrowAta = await getAssociatedTokenAddress(mintPubkey, escrowKeypair.publicKey)
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  const instructions = [
    // Fund escrow with SOL for rent
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: escrowKeypair.publicKey,
      lamports: BigInt(LAMPORTS_PER_SOL / 50), // 0.02 SOL
    }),
    // Create escrow ATA
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      escrowAta,
      escrowKeypair.publicKey,
      mintPubkey
    ),
    // Transfer tokens to escrow
    createTransferInstruction(
      sourceAta,
      escrowAta,
      payer.publicKey,
      BigInt(serialized.totalAmount)
    ),
  ]

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  // Update state
  serialized.status = 'active'
  serialized.escrowAccount = escrowKeypair.publicKey.toBase58()
  serialized.fundSignature = result.signature
  saveVestingState(state)

  return { signature: result.signature }
}

/**
 * Calculate how much has vested at a given time
 */
export function calculateVestedAmount(schedule: VestingSchedule, atTime?: number): bigint {
  const now = atTime ?? Date.now()

  // Before cliff: nothing vested
  if (now < schedule.cliffDate) {
    return 0n
  }

  // At or past end: everything vested
  if (now >= schedule.endDate) {
    return schedule.totalAmount
  }

  // At cliff: cliff percentage unlocks
  const cliffAmount = (schedule.totalAmount * BigInt(Math.floor(schedule.cliffPercentage * 100))) / 10000n
  const remainingAmount = schedule.totalAmount - cliffAmount

  // Linear vesting after cliff
  const vestingStart = schedule.cliffDate
  const vestingDuration = schedule.endDate - vestingStart
  const elapsed = now - vestingStart

  if (vestingDuration <= 0) return schedule.totalAmount

  const linearVested = (remainingAmount * BigInt(elapsed)) / BigInt(vestingDuration)

  return cliffAmount + linearVested
}

/**
 * Claim vested tokens (transfer unlocked tokens to recipient)
 */
export async function claimVestedTokens(
  vestingId: string,
  config: TokenConfig
): Promise<{ signature: string; amount: bigint }> {
  const state = loadVestingState()
  const serialized = state.schedules[vestingId]
  if (!serialized) throw new Error(`Vesting schedule not found: ${vestingId}`)
  if (serialized.status !== 'active') {
    throw new Error(`Vesting schedule is ${serialized.status}, not active`)
  }

  const schedule = deserializeSchedule(serialized)
  const vestedNow = calculateVestedAmount(schedule)
  const claimable = vestedNow - schedule.claimedAmount

  if (claimable <= 0n) {
    throw new Error('No tokens available to claim')
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(schedule.mint)
  const recipientPubkey = new PublicKey(schedule.recipient)

  // Transfer from escrow to recipient
  const escrowPubkey = new PublicKey(schedule.escrowAccount!)
  const escrowAta = await getAssociatedTokenAddress(mintPubkey, escrowPubkey)
  const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey)

  const instructions = []

  // Create recipient ATA if needed
  const recipientAccount = await connection.getAccountInfo(recipientAta)
  if (!recipientAccount) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        recipientAta,
        recipientPubkey,
        mintPubkey
      )
    )
  }

  instructions.push(
    createTransferInstruction(
      escrowAta,
      recipientAta,
      payer.publicKey, // Authority over escrow
      claimable
    )
  )

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  // Update state
  serialized.claimedAmount = (BigInt(serialized.claimedAmount) + claimable).toString()
  serialized.vestedAmount = vestedNow.toString()
  serialized.claimSignatures.push(result.signature)

  if (BigInt(serialized.claimedAmount) >= BigInt(serialized.totalAmount)) {
    serialized.status = 'completed'
  }

  saveVestingState(state)

  return { signature: result.signature, amount: claimable }
}

/**
 * Get vesting status for a schedule
 */
export function getVestingStatus(vestingId: string): VestingStatusReport | null {
  const state = loadVestingState()
  const serialized = state.schedules[vestingId]
  if (!serialized) return null

  const schedule = deserializeSchedule(serialized)
  const vestedAmount = calculateVestedAmount(schedule)
  const claimableAmount = vestedAmount - schedule.claimedAmount
  const unvestedAmount = schedule.totalAmount - vestedAmount
  const isCliffReached = Date.now() >= schedule.cliffDate

  // Calculate next vesting date
  let nextVestingDate: number | undefined
  if (schedule.status === 'active' && Date.now() < schedule.endDate) {
    if (!isCliffReached) {
      nextVestingDate = schedule.cliffDate
    } else {
      // Next month from now
      const next = new Date()
      next.setMonth(next.getMonth() + 1)
      next.setDate(1)
      nextVestingDate = Math.min(next.getTime(), schedule.endDate)
    }
  }

  return {
    id: schedule.id,
    recipient: schedule.recipient,
    mint: schedule.mint,
    totalAmount: schedule.totalAmount,
    vestedAmount,
    claimedAmount: schedule.claimedAmount,
    unvestedAmount,
    claimableAmount: claimableAmount > 0n ? claimableAmount : 0n,
    percentageVested: schedule.totalAmount > 0n
      ? Number(vestedAmount * 10000n / schedule.totalAmount) / 100
      : 0,
    percentageClaimed: schedule.totalAmount > 0n
      ? Number(schedule.claimedAmount * 10000n / schedule.totalAmount) / 100
      : 0,
    nextVestingDate,
    isCliffReached,
    status: schedule.status,
  }
}

/**
 * List all vesting schedules
 */
export function listVestingSchedules(filter?: { recipient?: string; status?: string }): VestingSchedule[] {
  const state = loadVestingState()
  let schedules = Object.values(state.schedules).map(deserializeSchedule)

  if (filter?.recipient) {
    schedules = schedules.filter(s => s.recipient === filter.recipient)
  }
  if (filter?.status) {
    schedules = schedules.filter(s => s.status === filter.status)
  }

  return schedules
}

/**
 * Serialize vesting schedule for storage
 */
function serializeSchedule(s: VestingSchedule): SerializedVestingSchedule {
  return {
    id: s.id,
    recipient: s.recipient,
    mint: s.mint,
    totalAmount: s.totalAmount.toString(),
    vestedAmount: s.vestedAmount.toString(),
    claimedAmount: s.claimedAmount.toString(),
    cliffMonths: s.cliffMonths,
    vestingMonths: s.vestingMonths,
    cliffPercentage: s.cliffPercentage,
    startDate: s.startDate,
    cliffDate: s.cliffDate,
    endDate: s.endDate,
    status: s.status,
    escrowAccount: s.escrowAccount,
    fundSignature: s.fundSignature,
    claimSignatures: s.claimSignatures,
    createdAt: s.createdAt,
  }
}

/**
 * Deserialize vesting schedule from storage
 */
function deserializeSchedule(s: SerializedVestingSchedule): VestingSchedule {
  return {
    id: s.id,
    recipient: s.recipient,
    mint: s.mint,
    totalAmount: BigInt(s.totalAmount),
    vestedAmount: BigInt(s.vestedAmount),
    claimedAmount: BigInt(s.claimedAmount),
    cliffMonths: s.cliffMonths,
    vestingMonths: s.vestingMonths,
    cliffPercentage: s.cliffPercentage,
    startDate: s.startDate,
    cliffDate: s.cliffDate,
    endDate: s.endDate,
    status: s.status,
    escrowAccount: s.escrowAccount,
    fundSignature: s.fundSignature,
    claimSignatures: s.claimSignatures,
    createdAt: s.createdAt,
  }
}
