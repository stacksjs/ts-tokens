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
} from '@solana/web3.js'
import {
  createTransferInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
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
 * Save vesting state atomically.
 *
 * Writes to a unique temp file in the same directory, then renames it over the
 * target. rename(2) is atomic on the same filesystem, so a crash mid-write can
 * never leave a truncated/partial state file that would corrupt claim
 * accounting. Concurrent writers each rename their own temp file, so the last
 * writer wins without either observing a half-written file.
 */
function saveVestingState(state: VestingState, storePath?: string): void {
  const filePath = storePath ?? getVestingStatePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), { mode: 0o600 })
  fs.renameSync(tmpPath, filePath)
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
  const targetDay = date.getDate()
  // setMonth on e.g. Jan 31 + 1 rolls over to Mar 3; clamp to the last day of
  // the target month so cliff/end dates land where users expect.
  date.setMonth(date.getMonth() + months, 1)
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(targetDay, lastDayOfMonth))
  return date.getTime()
}

/**
 * Create a vesting schedule
 */
export async function createVestingSchedule(
  vestingConfig: VestingConfig,
  _config: TokenConfig
): Promise<VestingSchedule> {
  const cliffPercentage = vestingConfig.cliffPercentage ?? 0

  // Guard against inputs that would make vested exceed totalAmount. A
  // cliffPercentage above 100 makes cliffAmount > totalAmount, driving
  // remainingAmount negative so linear vesting subtracts from the cliff and the
  // schedule can pay out more than was funded.
  if (!Number.isFinite(cliffPercentage) || cliffPercentage < 0 || cliffPercentage > 100) {
    throw new Error('cliffPercentage must be between 0 and 100')
  }
  if (!Number.isFinite(vestingConfig.cliffMonths) || vestingConfig.cliffMonths < 0) {
    throw new Error('cliffMonths must be >= 0')
  }
  // vestingMonths is used as the linear-vesting divisor window; it must be a
  // positive integer so the end date is strictly after the cliff date.
  if (!Number.isFinite(vestingConfig.vestingMonths) || vestingConfig.vestingMonths <= 0) {
    throw new Error('vestingMonths must be > 0')
  }
  if (vestingConfig.totalAmount <= 0n) {
    throw new Error('totalAmount must be greater than 0')
  }

  const startDate = vestingConfig.startDate ?? Date.now()
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
    cliffPercentage,
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

  // The escrow token account is owned by the escrow keypair; its rent is paid
  // by the payer (the ATA-create funder). The escrow keypair only ever needs
  // to *sign* claim transfers as the token authority — it is never the fee
  // payer — so it does not need any SOL of its own.
  const escrowAta = await getAssociatedTokenAddress(mintPubkey, escrowKeypair.publicKey)
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  const instructions = [
    // Create escrow ATA (payer funds the rent)
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

  // Persist the escrow keypair secret so claims can authorize transfers out of
  // the escrow. Stored only in the 0600-mode local state file.
  serialized.status = 'active'
  serialized.escrowAccount = escrowKeypair.publicKey.toBase58()
  serialized.escrowSecret = Buffer.from(escrowKeypair.secretKey).toString('base64')
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

  // Reconstruct the escrow keypair — it owns the escrow token account and must
  // sign the transfer out of it. Without the stored secret the funds would be
  // unrecoverable.
  if (!schedule.escrowSecret) {
    throw new Error(
      'Escrow secret is missing for this schedule; funds cannot be claimed. ' +
      'The schedule must be funded with a version that persists the escrow key.'
    )
  }
  const escrowKeypair = Keypair.fromSecretKey(Buffer.from(schedule.escrowSecret, 'base64'))

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(schedule.mint)
  const recipientPubkey = new PublicKey(schedule.recipient)

  // Transfer from escrow to recipient
  const escrowAta = await getAssociatedTokenAddress(mintPubkey, escrowKeypair.publicKey)
  const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey)

  // Derive the already-claimed amount from the on-chain escrow balance rather
  // than trusting the locally-persisted claimedAmount. The escrow was funded
  // with exactly totalAmount, and the only outflow is prior claims, so
  //   claimed == totalAmount - escrowBalance.
  // This makes claiming idempotent against chain state: a concurrent claim, or
  // a crash between send and save, cannot double-pay because the second attempt
  // sees the reduced escrow balance and computes a correspondingly smaller
  // claimable. It also self-heals a stale local claimedAmount.
  let onChainClaimed: bigint
  try {
    const escrowAccount = await getAccount(connection, escrowAta)
    onChainClaimed = schedule.totalAmount - escrowAccount.amount
  } catch {
    // The escrow ATA is gone (closed on the final claim) — everything is out.
    onChainClaimed = schedule.totalAmount
  }
  if (onChainClaimed < 0n) onChainClaimed = 0n

  // Reconcile local state to the on-chain truth before computing claimable.
  const claimedSoFar = onChainClaimed > schedule.claimedAmount
    ? onChainClaimed
    : schedule.claimedAmount

  const vestedNow = calculateVestedAmount(schedule)
  let claimable = vestedNow - claimedSoFar
  // Never attempt to withdraw more than the escrow actually holds.
  const escrowRemaining = schedule.totalAmount - onChainClaimed
  if (claimable > escrowRemaining) claimable = escrowRemaining

  if (claimable <= 0n) {
    // Persist the reconciled claimed amount so status reports stay accurate.
    if (claimedSoFar > schedule.claimedAmount) {
      serialized.claimedAmount = claimedSoFar.toString()
      if (claimedSoFar >= schedule.totalAmount) serialized.status = 'completed'
      saveVestingState(state)
    }
    throw new Error('No tokens available to claim')
  }

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
      escrowKeypair.publicKey, // Escrow keypair is the token account authority
      claimable
    )
  )

  // On the final claim, close the now-empty escrow ATA and return its rent to
  // the payer so no lamports are stranded.
  const isFinalClaim = claimedSoFar + claimable >= schedule.totalAmount
  if (isFinalClaim) {
    instructions.push(
      createCloseAccountInstruction(
        escrowAta,
        payer.publicKey, // rent destination
        escrowKeypair.publicKey // escrow authority
      )
    )
  }

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey
  )

  transaction.partialSign(payer)
  transaction.partialSign(escrowKeypair)

  const result = await sendAndConfirmTransaction(connection, transaction)

  if (!result.confirmed) {
    // The transfer did not confirm. Persist the reconciled claimedAmount (which
    // reflects only settled on-chain outflows) but do NOT credit this claim, so
    // a retry recomputes claimable from the still-full escrow balance.
    if (claimedSoFar > schedule.claimedAmount) {
      serialized.claimedAmount = claimedSoFar.toString()
      saveVestingState(state)
    }
    throw new Error(`Claim transfer was not confirmed: ${result.error ?? 'unknown error'}`)
  }

  // Update state against the reconciled base, not the stale persisted value.
  const newClaimed = claimedSoFar + claimable
  serialized.claimedAmount = newClaimed.toString()
  serialized.vestedAmount = vestedNow.toString()
  serialized.claimSignatures.push(result.signature)

  if (newClaimed >= schedule.totalAmount) {
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
    escrowSecret: s.escrowSecret,
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
    escrowSecret: s.escrowSecret,
    fundSignature: s.fundSignature,
    claimSignatures: s.claimSignatures,
    createdAt: s.createdAt,
  }
}
