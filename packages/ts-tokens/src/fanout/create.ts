/**
 * Fanout Wallet Creation
 *
 * Create fanout wallets with wallet, NFT, or token membership models.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { TokenConfig } from '../types'
import type { CreateFanoutOptions, FanoutWallet, FanoutState, SerializedFanoutWallet } from './types'
import { loadWallet } from '../drivers/solana/wallet'

/**
 * Get fanout state file path
 */
export function getFanoutStatePath(): string {
  return path.join(os.homedir(), '.ts-tokens', 'fanout-state.json')
}

/**
 * Load fanout state
 */
export function loadFanoutState(storePath?: string): FanoutState {
  const filePath = storePath ?? getFanoutStatePath()
  if (!fs.existsSync(filePath)) return { wallets: {} }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/**
 * Save fanout state
 */
export function saveFanoutState(state: FanoutState, storePath?: string): void {
  const filePath = storePath ?? getFanoutStatePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), { mode: 0o600 })
}

/**
 * Generate a unique fanout ID
 */
function generateId(): string {
  return `fanout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create a new fanout wallet
 */
export async function createFanoutWallet(
  options: CreateFanoutOptions,
  config: TokenConfig
): Promise<FanoutWallet> {
  const payer = loadWallet(config)

  // Validate shares
  const totalShares = options.members.reduce((sum, m) => sum + m.shares, 0)
  if (totalShares <= 0) {
    throw new Error('Total shares must be greater than 0')
  }

  if (options.members.length === 0) {
    throw new Error('At least one member is required')
  }

  const fanout: FanoutWallet = {
    id: generateId(),
    name: options.name,
    authority: payer.publicKey.toBase58(),
    membershipModel: options.membershipModel,
    members: options.members.map(m => ({
      address: m.address,
      shares: m.shares,
      totalClaimed: 0n,
    })),
    totalShares,
    totalInflow: 0n,
    totalDistributed: 0n,
    mint: options.mint,
    createdAt: Date.now(),
  }

  // Persist
  const state = loadFanoutState()
  state.wallets[fanout.id] = serializeFanout(fanout)
  saveFanoutState(state)

  return fanout
}

/**
 * Get a fanout wallet by ID
 */
export function getFanoutWallet(fanoutId: string): FanoutWallet | null {
  const state = loadFanoutState()
  const serialized = state.wallets[fanoutId]
  if (!serialized) return null
  return deserializeFanout(serialized)
}

/**
 * List all fanout wallets
 */
export function listFanoutWallets(): FanoutWallet[] {
  const state = loadFanoutState()
  return Object.values(state.wallets).map(deserializeFanout)
}

/**
 * Serialize fanout wallet for storage
 */
function serializeFanout(fanout: FanoutWallet): SerializedFanoutWallet {
  return {
    id: fanout.id,
    name: fanout.name,
    authority: fanout.authority,
    membershipModel: fanout.membershipModel,
    members: fanout.members.map(m => ({
      address: m.address,
      shares: m.shares,
      totalClaimed: m.totalClaimed.toString(),
    })),
    totalShares: fanout.totalShares,
    totalInflow: fanout.totalInflow.toString(),
    totalDistributed: fanout.totalDistributed.toString(),
    mint: fanout.mint,
    createdAt: fanout.createdAt,
  }
}

/**
 * Deserialize fanout wallet from storage
 */
function deserializeFanout(s: SerializedFanoutWallet): FanoutWallet {
  return {
    id: s.id,
    name: s.name,
    authority: s.authority,
    membershipModel: s.membershipModel,
    members: s.members.map(m => ({
      address: m.address,
      shares: m.shares,
      totalClaimed: BigInt(m.totalClaimed),
    })),
    totalShares: s.totalShares,
    totalInflow: BigInt(s.totalInflow),
    totalDistributed: BigInt(s.totalDistributed),
    mint: s.mint,
    createdAt: s.createdAt,
  }
}
