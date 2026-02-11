/**
 * Batch Transaction Recovery
 *
 * Tracks success/failure per batch item, persists state to disk,
 * and enables retrying failed items.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export type RecoveryItemStatus = 'pending' | 'success' | 'failed'
export type RecoveryStatus = 'in-progress' | 'completed' | 'partial-failure'

export interface RecoveryItem {
  index: number
  recipient: string
  status: RecoveryItemStatus
  signature?: string
  error?: string
  amount?: string
  metadata?: Record<string, unknown>
}

export interface RecoveryState {
  id: string
  operation: string
  status: RecoveryStatus
  createdAt: string
  updatedAt: string
  items: RecoveryItem[]
  summary?: {
    total: number
    successful: number
    failed: number
    pending: number
  }
}

export interface CreateRecoveryOptions {
  operation: string
  recipients: Array<{ address: string; amount?: string; metadata?: Record<string, unknown> }>
}

/**
 * Create a new recovery state with all items pending
 */
export function createRecoveryState(options: CreateRecoveryOptions): RecoveryState {
  const now = new Date().toISOString()

  return {
    id: `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    operation: options.operation,
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    items: options.recipients.map((r, index) => ({
      index,
      recipient: r.address,
      status: 'pending' as RecoveryItemStatus,
      amount: r.amount,
      metadata: r.metadata,
    })),
  }
}

/**
 * Record a successful transaction for an item
 */
export function recordSuccess(
  state: RecoveryState,
  index: number,
  recipient: string,
  signature: string
): void {
  const item = state.items[index]
  if (!item) {
    throw new Error(`Invalid recovery item index: ${index}`)
  }
  item.status = 'success'
  item.recipient = recipient
  item.signature = signature
  state.updatedAt = new Date().toISOString()
}

/**
 * Record a failed transaction for an item
 */
export function recordFailure(
  state: RecoveryState,
  index: number,
  recipient: string,
  error: string,
  item?: { amount?: string; metadata?: Record<string, unknown> }
): void {
  const recoveryItem = state.items[index]
  if (!recoveryItem) {
    throw new Error(`Invalid recovery item index: ${index}`)
  }
  recoveryItem.status = 'failed'
  recoveryItem.recipient = recipient
  recoveryItem.error = error
  if (item?.amount) recoveryItem.amount = item.amount
  if (item?.metadata) recoveryItem.metadata = item.metadata
  state.updatedAt = new Date().toISOString()
}

/**
 * Finalize the recovery state — set status to completed or partial-failure
 */
export function finalizeRecoveryState(state: RecoveryState): void {
  const failed = state.items.filter(i => i.status === 'failed').length
  const pending = state.items.filter(i => i.status === 'pending').length

  state.status = (failed > 0 || pending > 0) ? 'partial-failure' : 'completed'
  state.updatedAt = new Date().toISOString()
  state.summary = {
    total: state.items.length,
    successful: state.items.filter(i => i.status === 'success').length,
    failed,
    pending,
  }
}

/**
 * Save recovery state to a JSON file
 */
export function saveRecoveryState(state: RecoveryState, outputPath?: string): string {
  const filePath = outputPath ?? `${state.id}.json`
  const resolved = path.resolve(filePath)
  const dir = path.dirname(resolved)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(resolved, JSON.stringify(state, null, 2), { mode: 0o600 })
  return resolved
}

/**
 * Load recovery state from a JSON file
 */
export function loadRecoveryState(filePath: string): RecoveryState {
  const resolved = path.resolve(filePath)

  if (!fs.existsSync(resolved)) {
    throw new Error(`Recovery state file not found: ${resolved}`)
  }

  const content = fs.readFileSync(resolved, 'utf-8')
  return JSON.parse(content) as RecoveryState
}

/**
 * Extract failed items for retry
 */
export function getRetryItems(state: RecoveryState): RecoveryItem[] {
  return state.items.filter(i => i.status === 'failed')
}

/**
 * Format a human-readable recovery summary
 */
export function formatRecoverySummary(state: RecoveryState): string {
  const total = state.items.length
  const successful = state.items.filter(i => i.status === 'success').length
  const failed = state.items.filter(i => i.status === 'failed').length
  const pending = state.items.filter(i => i.status === 'pending').length

  const lines: string[] = []
  lines.push(`Batch Recovery: ${state.id}`)
  lines.push(`Operation: ${state.operation}`)
  lines.push(`Status: ${state.status}`)
  lines.push(`Created: ${state.createdAt}`)
  lines.push(`Updated: ${state.updatedAt}`)
  lines.push('')
  lines.push(`Total: ${total}`)
  lines.push(`  Successful: ${successful}`)
  lines.push(`  Failed: ${failed}`)
  lines.push(`  Pending: ${pending}`)

  if (failed > 0) {
    lines.push('')
    lines.push('Failed Items:')
    for (const item of state.items.filter(i => i.status === 'failed')) {
      lines.push(`  #${item.index} ${item.recipient}: ${item.error}`)
    }
  }

  return lines.join('\n')
}
