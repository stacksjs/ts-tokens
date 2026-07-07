/**
 * Event Listener
 *
 * Real-time event streaming via WebSocket.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type {
  TokenEvent,
  EventCallback,
  EventFilter,
  ListenerOptions,
  EventType,
} from './types'

/**
 * Event listener for real-time updates
 */
export class EventListener {
  private connection: Connection
  private subscriptions: Map<number, { callback: EventCallback; filter?: EventFilter }> = new Map()
  private nextId = 1
  /** Solana WebSocket subscription id for the active onLogs listener, if any. */
  private logsSubscriptionId: number | null = null

  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Subscribe to events
   *
   * NOTE: log parsing is not implemented (`parseLogsToEvent` cannot yet decode
   * program logs into `TokenEvent`s), so no event would ever be delivered to
   * the callback. Rather than silently registering a subscription that can
   * never fire, this throws so callers know real-time events are unavailable.
   * The subscription bookkeeping and filtering below are correct and ready for
   * when parsing is wired up.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subscribe(callback: EventCallback, options: ListenerOptions = {}): number {
    throw new Error(
      'EventListener.subscribe() is not implemented: program-log parsing ' +
      '(parseLogsToEvent) is not wired up, so no events can ever be emitted to ' +
      'the callback. Use pollEvents() with your own transaction parsing, or ' +
      'wait for log parsing support.'
    )
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(id: number): boolean {
    const removed = this.subscriptions.delete(id)

    // Stop listening if no more subscriptions
    if (this.subscriptions.size === 0) {
      this.stopListening()
    }

    return removed
  }

  /**
   * Unsubscribe all
   */
  unsubscribeAll(): void {
    this.subscriptions.clear()
    this.stopListening()
  }

  /**
   * Start listening to events
   */
  private startListening(options: ListenerOptions): void {
    const { commitment = 'confirmed' } = options

    // Avoid opening a second WebSocket subscription if one is already active.
    if (this.logsSubscriptionId !== null) return

    // Subscribe to logs for token program and retain the subscription id so it
    // can be removed later (otherwise the WebSocket subscription leaks).
    this.logsSubscriptionId = this.connection.onLogs(
      'all',
      (logs) => {
        this.processLogs(logs)
      },
      commitment
    )
  }

  /**
   * Stop listening
   */
  private stopListening(): void {
    if (this.logsSubscriptionId !== null) {
      const id = this.logsSubscriptionId
      this.logsSubscriptionId = null
      // Fire-and-forget: removeOnLogsListener returns a promise; swallow errors
      // so teardown never throws.
      void this.connection.removeOnLogsListener(id).catch(() => {})
    }
  }

  /**
   * Process logs and emit events
   */
  private processLogs(logs: { signature: string; logs: string[]; err: unknown }): void {
    if (logs.err) return

    // Parse logs to determine event type. Parsing is not yet implemented and
    // throws; guard it so an unimplemented/failed parse cannot tear down the
    // WebSocket log stream.
    let event: TokenEvent | null
    try {
      event = this.parseLogsToEvent(logs)
    } catch {
      return
    }
    if (!event) return

    // Emit to all matching subscribers. Isolate each callback so one throwing
    // subscriber does not prevent the others from receiving the event.
    for (const [, sub] of this.subscriptions) {
      if (this.matchesFilter(event, sub.filter)) {
        try {
          sub.callback(event)
        } catch {
          // Swallow subscriber errors; a misbehaving callback must not break
          // the WebSocket log stream or other subscribers.
        }
      }
    }
  }

  /**
   * Parse logs to event
   *
   * NOTE: not implemented. Decoding raw program logs into typed `TokenEvent`s
   * requires instruction/log parsing that is not yet available. This throws so
   * the "no events fire" gap is explicit rather than silently returning null.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private parseLogsToEvent(logs: { signature: string; logs: string[] }): TokenEvent | null {
    throw new Error(
      'parseLogsToEvent is not implemented: program-log decoding into ' +
      'TokenEvents is not available yet.'
    )
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: TokenEvent, filter?: EventFilter): boolean {
    if (!filter) return true

    // Check event type
    if (filter.types && !filter.types.includes(event.type)) {
      return false
    }

    // Check mint
    if (filter.mints && 'mint' in event) {
      const mint = event.mint as PublicKey
      if (!filter.mints.some(m => m.equals(mint))) {
        return false
      }
    }

    // Check collection (NFT transfer/mint events carry an optional collection)
    if (filter.collections) {
      const collection = 'collection' in event ? event.collection : undefined
      if (!collection || !filter.collections.some(c => c.equals(collection))) {
        return false
      }
    }

    // Check accounts: match if any account-like field on the event appears in
    // the filter's account list.
    if (filter.accounts) {
      const eventAccounts = collectEventAccounts(event)
      const matches = eventAccounts.some(acc =>
        filter.accounts!.some(a => a.equals(acc))
      )
      if (!matches) {
        return false
      }
    }

    // Check amount
    if (filter.minAmount && 'amount' in event) {
      const amount = event.amount as bigint
      if (amount < filter.minAmount) {
        return false
      }
    }

    // Check slot range
    if (filter.startSlot && event.slot < filter.startSlot) {
      return false
    }
    if (filter.endSlot && event.slot > filter.endSlot) {
      return false
    }

    return true
  }

  /**
   * Get subscription count
   */
  get subscriptionCount(): number {
    return this.subscriptions.size
  }
}

/**
 * Collect the account-like PublicKey fields present on an event so account
 * filters can match on any participant (sender, recipient, owner, staker, etc).
 */
function collectEventAccounts(event: TokenEvent): PublicKey[] {
  const candidateFields = [
    'from',
    'to',
    'owner',
    'user',
    'pool',
    'seller',
    'buyer',
    'authority',
  ] as const

  const accounts: PublicKey[] = []
  for (const field of candidateFields) {
    const value = (event as unknown as Record<string, unknown>)[field]
    if (value instanceof PublicKey) {
      accounts.push(value)
    }
  }
  return accounts
}

/**
 * Create event listener
 */
export function createEventListener(connection: Connection): EventListener {
  return new EventListener(connection)
}

/**
 * Listen for token transfers
 */
export function onTokenTransfer(
  connection: Connection,
  mint: PublicKey,
  callback: (event: TokenEvent) => void
): () => void {
  const listener = new EventListener(connection)

  const id = listener.subscribe(callback, {
    filter: {
      types: ['token_transfer'],
      mints: [mint],
    },
  })

  return () => listener.unsubscribe(id)
}

/**
 * Listen for NFT sales
 */
export function onNFTSale(
  connection: Connection,
  collection: PublicKey,
  callback: (event: TokenEvent) => void
): () => void {
  const listener = new EventListener(connection)

  const id = listener.subscribe(callback, {
    filter: {
      types: ['nft_sale'],
      collections: [collection],
    },
  })

  return () => listener.unsubscribe(id)
}

/**
 * Listen for staking events
 */
export function onStake(
  connection: Connection,
  pool: PublicKey,
  callback: (event: TokenEvent) => void
): () => void {
  const listener = new EventListener(connection)

  const id = listener.subscribe(callback, {
    filter: {
      types: ['stake', 'unstake', 'claim_rewards'],
      accounts: [pool],
    },
  })

  return () => listener.unsubscribe(id)
}

/**
 * Poll for events (alternative to WebSocket)
 *
 * NOTE: not implemented. The polling loop can fetch new signatures per account,
 * but turning those transactions into typed `TokenEvent`s requires transaction
 * parsing that is not available yet, so `onEvent` could never fire. This throws
 * rather than starting a loop that silently never emits.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function pollEvents(
  connection: Connection,
  accounts: PublicKey[],
  options: {
    interval?: number
    onEvent: EventCallback
    onError?: (error: Error) => void
  }
): Promise<{ stop: () => void }> {
  throw new Error(
    'pollEvents is not implemented: transactions fetched by signature cannot ' +
    'yet be parsed into TokenEvents, so onEvent would never fire. Implement ' +
    'transaction parsing before using this.'
  )
}
