/**
 * Fanout Management
 *
 * Add/remove members, update shares.
 */

import type { FanoutWallet, FanoutMember } from './types'
import { getFanoutWallet, loadFanoutState, saveFanoutState } from './create'

/**
 * Add a member to a fanout wallet
 */
export function addFanoutMember(
  fanoutId: string,
  member: { address: string; shares: number }
): FanoutWallet {
  const state = loadFanoutState()
  const wallet = state.wallets[fanoutId]
  if (!wallet) throw new Error(`Fanout wallet not found: ${fanoutId}`)

  // Check for duplicate
  if (wallet.members.some(m => m.address === member.address)) {
    throw new Error(`Member ${member.address} already exists in fanout`)
  }

  wallet.members.push({
    address: member.address,
    shares: member.shares,
    totalClaimed: '0',
  })

  wallet.totalShares += member.shares
  saveFanoutState(state)

  return getFanoutWallet(fanoutId)!
}

/**
 * Remove a member from a fanout wallet
 */
export function removeFanoutMember(
  fanoutId: string,
  memberAddress: string
): FanoutWallet {
  const state = loadFanoutState()
  const wallet = state.wallets[fanoutId]
  if (!wallet) throw new Error(`Fanout wallet not found: ${fanoutId}`)

  const memberIndex = wallet.members.findIndex(m => m.address === memberAddress)
  if (memberIndex === -1) {
    throw new Error(`Member ${memberAddress} not found in fanout`)
  }

  const removed = wallet.members.splice(memberIndex, 1)[0]
  wallet.totalShares -= removed.shares
  saveFanoutState(state)

  return getFanoutWallet(fanoutId)!
}

/**
 * Update a member's shares
 */
export function updateMemberShares(
  fanoutId: string,
  memberAddress: string,
  newShares: number
): FanoutWallet {
  const state = loadFanoutState()
  const wallet = state.wallets[fanoutId]
  if (!wallet) throw new Error(`Fanout wallet not found: ${fanoutId}`)

  const member = wallet.members.find(m => m.address === memberAddress)
  if (!member) {
    throw new Error(`Member ${memberAddress} not found in fanout`)
  }

  const oldShares = member.shares
  member.shares = newShares
  wallet.totalShares = wallet.totalShares - oldShares + newShares
  saveFanoutState(state)

  return getFanoutWallet(fanoutId)!
}

/**
 * Delete a fanout wallet
 */
export function deleteFanoutWallet(fanoutId: string): void {
  const state = loadFanoutState()
  if (!state.wallets[fanoutId]) {
    throw new Error(`Fanout wallet not found: ${fanoutId}`)
  }
  delete state.wallets[fanoutId]
  saveFanoutState(state)
}

/**
 * Format fanout wallet for display
 */
export function formatFanoutWallet(fanout: FanoutWallet): string {
  const lines = [
    `Fanout: ${fanout.name} (${fanout.id})`,
    `  Model: ${fanout.membershipModel}`,
    `  Authority: ${fanout.authority}`,
    `  Total Shares: ${fanout.totalShares}`,
    `  Total Distributed: ${fanout.totalDistributed}`,
    `  Members (${fanout.members.length}):`,
  ]

  for (const member of fanout.members) {
    const pct = ((member.shares / fanout.totalShares) * 100).toFixed(1)
    lines.push(`    ${member.address}: ${member.shares} shares (${pct}%) — claimed: ${member.totalClaimed}`)
  }

  return lines.join('\n')
}
