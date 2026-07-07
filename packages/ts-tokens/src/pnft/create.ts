/**
 * Programmable NFT Creation
 *
 * The pNFT program is not deployed (see program.ts). Every function here either
 * writes to that nonexistent program or reads accounts that never exist, so all
 * of them throw via `pnftNotImplemented`.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  ProgrammableNFT,
  CreatePNFTOptions,
  RuleSet,
  CreateRuleSetOptions,
  PNFTResult,
} from './types'
import { pnftNotImplemented } from './program'
import { validateRule } from './rules'

/**
 * Create a programmable NFT
 */
export async function createPNFT(
  options: CreatePNFTOptions,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  // Surface any rule misconfiguration before reporting the program is undeployed.
  if (options.rules) {
    for (const rule of options.rules) {
      const validation = validateRule(rule)
      if (!validation.valid) {
        throw new Error(`Invalid rule ${rule.type}: ${validation.errors.join(', ')}`)
      }
    }
  }

  pnftNotImplemented('createPNFT')
}

/**
 * Create a soulbound token (non-transferable NFT)
 */
export async function createSoulbound(
  _options: Omit<CreatePNFTOptions, 'rules'> & {
    recoveryAuthority?: PublicKey
  },
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('createSoulbound')
}

/**
 * Create a rule set for a collection
 */
export async function createRuleSet(
  _options: CreateRuleSetOptions,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('createRuleSet')
}

/**
 * Get pNFT data
 */
export async function getPNFT(
  _connection: Connection,
  _mint: PublicKey
): Promise<ProgrammableNFT | null> {
  pnftNotImplemented('getPNFT')
}

/**
 * Get rule set
 */
export async function getRuleSetData(
  _connection: Connection,
  _address: PublicKey
): Promise<RuleSet | null> {
  pnftNotImplemented('getRuleSetData')
}

/**
 * Check if NFT is programmable
 */
export async function isProgrammableNFT(
  _connection: Connection,
  _mint: PublicKey
): Promise<boolean> {
  pnftNotImplemented('isProgrammableNFT')
}

/**
 * Check if NFT is soulbound
 */
export async function isSoulbound(
  _connection: Connection,
  _mint: PublicKey
): Promise<boolean> {
  pnftNotImplemented('isSoulbound')
}

/**
 * Get pNFT state
 */
export async function getPNFTState(
  _connection: Connection,
  _mint: PublicKey
): Promise<'unlocked' | 'listed' | 'staked' | 'frozen' | null> {
  pnftNotImplemented('getPNFTState')
}

/**
 * Lock pNFT (for staking, listing, etc.)
 */
export async function lockPNFT(
  _mint: PublicKey,
  _state: 'listed' | 'staked',
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('lockPNFT')
}

/**
 * Unlock pNFT
 */
export async function unlockPNFT(
  _mint: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('unlockPNFT')
}

/**
 * Recover soulbound token (emergency recovery)
 */
export async function recoverSoulbound(
  _mint: PublicKey,
  _newOwner: PublicKey,
  _config: TokenConfig,
  _txOptions?: TransactionOptions
): Promise<PNFTResult> {
  pnftNotImplemented('recoverSoulbound')
}

/**
 * Get pNFTs by owner
 */
export async function getPNFTsByOwner(
  _connection: Connection,
  _owner: PublicKey
): Promise<ProgrammableNFT[]> {
  pnftNotImplemented('getPNFTsByOwner')
}

/**
 * Get pNFTs by rule set
 */
export async function getPNFTsByRuleSet(
  _connection: Connection,
  _ruleSet: PublicKey
): Promise<ProgrammableNFT[]> {
  pnftNotImplemented('getPNFTsByRuleSet')
}
