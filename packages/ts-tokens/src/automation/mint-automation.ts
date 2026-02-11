/**
 * Mint Automation
 *
 * Manage mint schedules — start/end times, supply caps, and allowlists.
 */

import type { TokenConfig } from '../types'
import type { MintSchedule, SerializedMintSchedule } from './types'
import { loadSchedulerState, saveSchedulerState } from './scheduler'

// ============================================
// Mint Schedule CRUD
// ============================================

/**
 * Set (create or update) a mint schedule
 */
export function setMintSchedule(schedule: MintSchedule, storePath?: string): void {
  if (!schedule.mint) {
    throw new Error('Mint address is required')
  }

  const state = loadSchedulerState(storePath)
  state.mintSchedules[schedule.mint] = {
    mint: schedule.mint,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    maxSupply: schedule.maxSupply,
    pricePerMint: schedule.pricePerMint,
    allowlist: schedule.allowlist,
  } satisfies SerializedMintSchedule

  saveSchedulerState(state, storePath)
}

/**
 * Get a mint schedule by mint address
 */
export function getMintSchedule(mint: string, storePath?: string): MintSchedule | null {
  const state = loadSchedulerState(storePath)
  return (state.mintSchedules[mint] as MintSchedule) ?? null
}

/**
 * List all mint schedules
 */
export function listMintSchedules(storePath?: string): MintSchedule[] {
  const state = loadSchedulerState(storePath)
  return Object.values(state.mintSchedules) as MintSchedule[]
}

/**
 * Remove a mint schedule
 */
export function removeMintSchedule(mint: string, storePath?: string): boolean {
  const state = loadSchedulerState(storePath)
  if (!state.mintSchedules[mint]) return false
  delete state.mintSchedules[mint]
  saveSchedulerState(state, storePath)
  return true
}

// ============================================
// Eligibility Checking
// ============================================

/**
 * Check if minting is currently eligible for a given mint
 */
export function checkMintEligibility(
  mint: string,
  minter?: string,
  storePath?: string,
): { eligible: boolean; reason?: string } {
  const schedule = getMintSchedule(mint, storePath)

  if (!schedule) {
    return { eligible: true } // No schedule means no restrictions
  }

  const now = Date.now()

  // Check start time
  if (schedule.startTime && now < schedule.startTime) {
    return {
      eligible: false,
      reason: `Minting has not started yet. Opens at ${new Date(schedule.startTime).toISOString()}`,
    }
  }

  // Check end time
  if (schedule.endTime && now > schedule.endTime) {
    return {
      eligible: false,
      reason: `Minting has ended. Closed at ${new Date(schedule.endTime).toISOString()}`,
    }
  }

  // Check allowlist
  if (schedule.allowlist && schedule.allowlist.length > 0 && minter) {
    if (!schedule.allowlist.includes(minter)) {
      return {
        eligible: false,
        reason: 'Wallet not in allowlist',
      }
    }
  }

  return { eligible: true }
}

// ============================================
// Mint Guard (Polling)
// ============================================

/**
 * Run a mint guard that watches mint schedules.
 *
 * - Auto-logs when minting windows open/close
 * - Can invoke revokeMintAuthority after endTime passes
 *
 * Returns a handle with stop().
 */
export function runMintGuard(
  config: TokenConfig,
  options?: {
    autoRevoke?: boolean
    onStart?: (mint: string) => void
    onEnd?: (mint: string) => void
    storePath?: string
  },
  intervalMs: number = 10000,
): { stop: () => void } {
  let running = true
  const storePath = options?.storePath

  const poll = async () => {
    while (running) {
      try {
        const schedules = listMintSchedules(storePath)
        const now = Date.now()

        for (const schedule of schedules) {
          // Check if minting just opened
          if (schedule.startTime && schedule.startTime <= now) {
            if (options?.onStart) {
              options.onStart(schedule.mint)
            }
          }

          // Check if minting just ended
          if (schedule.endTime && schedule.endTime <= now) {
            if (options?.onEnd) {
              options.onEnd(schedule.mint)
            }

            // Auto-revoke mint authority if configured
            if (options?.autoRevoke) {
              try {
                const { revokeMintAuthority } = await import('../token/authority')
                await revokeMintAuthority(schedule.mint, config)
                // Remove schedule after revoking
                removeMintSchedule(schedule.mint, storePath)
              } catch {
                // Continue on failure
              }
            }
          }
        }
      } catch {
        // Silently continue
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  poll()

  return {
    stop: () => { running = false },
  }
}
