/**
 * Performance Timing Utilities
 *
 * Timer class and helpers for measuring and logging execution time
 * of synchronous and asynchronous operations.
 */

/**
 * A timing entry recorded by the Timer class.
 */
export interface TimingEntry {
  /** Label identifying the operation */
  label: string
  /** Start time in milliseconds (high-resolution) */
  startMs: number
  /** End time in milliseconds (high-resolution), null if still running */
  endMs: number | null
  /** Duration in milliseconds, null if still running */
  durationMs: number | null
}

/**
 * High-resolution timer for measuring operation durations.
 *
 * Supports multiple named timers running concurrently and provides
 * a summary of all recorded timings.
 *
 * @example
 * ```ts
 * const timer = new Timer()
 *
 * timer.start('fetchAccounts')
 * await fetchAccounts()
 * timer.stop('fetchAccounts')
 *
 * timer.start('buildTx')
 * await buildTransaction()
 * timer.stop('buildTx')
 *
 * console.log(timer.summary())
 * // fetchAccounts: 142ms
 * // buildTx: 23ms
 * // Total: 165ms
 * ```
 */
export class Timer {
  private entries = new Map<string, TimingEntry>()

  /**
   * Start a named timer.
   *
   * @param label - Identifier for this timing
   * @returns The start timestamp in milliseconds
   */
  start(label: string): number {
    const startMs = performance.now()
    this.entries.set(label, { label, startMs, endMs: null, durationMs: null })
    return startMs
  }

  /**
   * Stop a named timer.
   *
   * @param label - Identifier of the timer to stop
   * @returns Duration in milliseconds, or -1 if the timer was not found
   */
  stop(label: string): number {
    const entry = this.entries.get(label)
    if (!entry) return -1

    const endMs = performance.now()
    entry.endMs = endMs
    entry.durationMs = endMs - entry.startMs
    return entry.durationMs
  }

  /**
   * Get the duration of a completed timer.
   *
   * @param label - Identifier of the timer
   * @returns Duration in milliseconds, or null if not found/not stopped
   */
  getDuration(label: string): number | null {
    return this.entries.get(label)?.durationMs ?? null
  }

  /**
   * Get all timing entries.
   *
   * @returns Array of all recorded timing entries
   */
  getEntries(): TimingEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * Get a formatted summary of all timings.
   *
   * @returns A multi-line string summarizing all recorded timings
   */
  summary(): string {
    const lines: string[] = []
    let total = 0

    for (const entry of this.entries.values()) {
      const duration = entry.durationMs
      if (duration !== null) {
        lines.push(`  ${entry.label}: ${duration.toFixed(2)}ms`)
        total += duration
      } else {
        lines.push(`  ${entry.label}: (still running)`)
      }
    }

    lines.push(`  Total: ${total.toFixed(2)}ms`)
    return lines.join('\n')
  }

  /**
   * Reset all recorded timings.
   */
  reset(): void {
    this.entries.clear()
  }
}

/**
 * Measure the execution time of an async function and log the result.
 *
 * @param label - A descriptive label for the operation being timed
 * @param fn - The async function to execute and time
 * @param logger - Optional logging function (defaults to console.log)
 * @returns The result of the async function
 *
 * @example
 * ```ts
 * const result = await timeAsync('createToken', async () => {
 *   return await createToken(options, config)
 * })
 * // Logs: "[perf] createToken: 234.56ms"
 * ```
 */
export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>,
  logger?: (message: string, data?: Record<string, unknown>) => void,
): Promise<T> {
  const log = logger ?? ((msg: string) => console.log(msg))
  const start = performance.now()

  try {
    const result = await fn()
    const elapsed = performance.now() - start
    log(`[perf] ${label}: ${elapsed.toFixed(2)}ms`, { label, durationMs: elapsed })
    return result
  } catch (error) {
    const elapsed = performance.now() - start
    log(`[perf] ${label}: FAILED after ${elapsed.toFixed(2)}ms`, {
      label,
      durationMs: elapsed,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Measure the execution time of a synchronous function.
 *
 * @param label - A descriptive label for the operation
 * @param fn - The synchronous function to time
 * @param logger - Optional logging function
 * @returns The result of the function
 *
 * @example
 * ```ts
 * const result = timeSync('parseMetadata', () => parseMetadata(raw))
 * // Logs: "[perf] parseMetadata: 0.42ms"
 * ```
 */
export function timeSync<T>(
  label: string,
  fn: () => T,
  logger?: (message: string, data?: Record<string, unknown>) => void,
): T {
  const log = logger ?? ((msg: string) => console.log(msg))
  const start = performance.now()

  try {
    const result = fn()
    const elapsed = performance.now() - start
    log(`[perf] ${label}: ${elapsed.toFixed(2)}ms`, { label, durationMs: elapsed })
    return result
  } catch (error) {
    const elapsed = performance.now() - start
    log(`[perf] ${label}: FAILED after ${elapsed.toFixed(2)}ms`, {
      label,
      durationMs: elapsed,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
