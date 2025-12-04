/**
 * Event Listener
 *
 * Real-time event streaming via WebSocket.
 */

import { Connection, PublicKey } from '@solana/web3.js'
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

  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Subscribe to events
   */
  subscribe(callback: EventCallback, options: ListenerOptions = {}): number {
    const id = this.nextId++

    this.subscriptions.set(id, {
      callback,
      filter: options.filter,
    })

    // Start listening if first subscription
    if (this.subscriptions.size === 1) {
      this.startListening(options)
    }

    return id
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

    // Subscribe to logs for token program
    this.connection.onLogs(
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
    // Would remove WebSocket subscriptions
  }

  /**
   * Process logs and emit events
   */
  private processLogs(logs: { signature: string; logs: string[]; err: unknown }): void {
    if (logs.err) return

    // Parse logs to determine event type
    const event = this.parseLogsToEvent(logs)
    if (!event) return

    // Emit to all matching subscribers
    for (const [, sub] of this.subscriptions) {
      if (this.matchesFilter(event, sub.filter)) {
        sub.callback(event)
      }
    }
  }

  /**
   * Parse logs to event
   */
  private parseLogsToEvent(logs: { signature: string; logs: string[] }): TokenEvent | null {
    // In production, would parse program logs to determine event type
    // This is a simplified placeholder
    return null
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
 */
export async function pollEvents(
  connection: Connection,
  accounts: PublicKey[],
  options: {
    interval?: number
    onEvent: EventCallback
    onError?: (error: Error) => void
  }
): Promise<{ stop: () => void }> {
  const { interval = 5000, onEvent, onError } = options

  let running = true
  let lastSignatures: Map<string, string> = new Map()

  const poll = async (): Promise<void> => {
    while (running) {
      try {
        for (const account of accounts) {
          const signatures = await connection.getSignaturesForAddress(account, {
            limit: 10,
          })

          const lastSig = lastSignatures.get(account.toBase58())

          for (const sig of signatures) {
            if (sig.signature === lastSig) break

            // Would parse transaction and emit event
          }

          if (signatures.length > 0) {
            lastSignatures.set(account.toBase58(), signatures[0].signature)
          }
        }
      } catch (error) {
        onError?.(error as Error)
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }

  poll()

  return {
    stop: () => {
      running = false
    },
  }
}
