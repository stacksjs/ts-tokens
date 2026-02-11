/**
 * CLI Spinner Utilities
 *
 * Ora-based spinner helpers for long-running operations.
 */

import ora from 'ora'
import type { Ora } from 'ora'

/**
 * Start a spinner with a message
 */
export function startSpinner(message: string): Ora {
  return ora(message).start()
}

/**
 * Run an async function with a spinner, resolving to the function's return value.
 * The spinner succeeds on completion or fails on error.
 */
export async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>,
  successMessage?: string
): Promise<T> {
  const spinner = ora(message).start()
  try {
    const result = await fn()
    spinner.succeed(successMessage ?? message)
    return result
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    spinner.fail(`${message} - ${errMsg}`)
    throw err
  }
}
