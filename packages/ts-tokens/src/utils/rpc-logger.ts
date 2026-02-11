/**
 * RPC Request/Response Logger
 *
 * Wraps a Solana Connection to intercept and log all RPC calls
 * with request parameters and response data for debugging.
 */

import type { Logger } from './debug'

/**
 * Minimal Connection-like interface that the logger wraps.
 * This avoids a hard dependency on @solana/web3.js at the type level.
 */
export interface RpcConnection {
  [method: string]: (...args: unknown[]) => unknown
}

/**
 * Options for the logging connection wrapper.
 */
export interface RpcLoggerOptions {
  /** Log the full response body (default: false — logs only status/timing) */
  logResponseBody?: boolean
  /** Methods to exclude from logging (e.g., ['getRecentBlockhash']) */
  excludeMethods?: string[]
  /** Maximum response body length to log before truncating (default: 500) */
  maxResponseLength?: number
}

/**
 * Create a proxy around a Solana Connection that logs all RPC method calls.
 *
 * The returned object has the same interface as the original connection,
 * but every method call is intercepted and logged with request parameters,
 * response timing, and optionally the response body.
 *
 * @param connection - The original Solana Connection instance
 * @param logger - A Logger instance (from `src/utils/debug.ts`)
 * @param options - Logging options
 * @returns A proxied connection with transparent logging
 *
 * @example
 * ```ts
 * import { Connection } from '@solana/web3.js'
 * import { Logger } from './debug'
 * import { createLoggingConnection } from './rpc-logger'
 *
 * const connection = new Connection('https://api.devnet.solana.com')
 * const logger = new Logger({ level: 'debug' })
 * const logged = createLoggingConnection(connection, logger)
 *
 * // All RPC calls are now logged:
 * await logged.getBalance(publicKey)
 * // => [RPC] getBalance (123ms) — 1 args
 * ```
 */
export function createLoggingConnection<T extends RpcConnection>(
  connection: T,
  logger: Logger,
  options?: RpcLoggerOptions,
): T {
  const logResponseBody = options?.logResponseBody ?? false
  const excludeMethods = new Set(options?.excludeMethods ?? [])
  const maxResponseLength = options?.maxResponseLength ?? 500

  return new Proxy(connection, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      // Only intercept function calls
      if (typeof value !== 'function') return value
      if (typeof prop !== 'string') return value
      if (prop.startsWith('_')) return value
      if (excludeMethods.has(prop)) return value

      return (...args: unknown[]) => {
        const start = Date.now()
        const argsSummary = summarizeArgs(args)

        logger.debug(`[RPC] ${prop} called`, { args: argsSummary })

        const result = value.apply(target, args)

        // Handle both sync and async results
        if (result && typeof result === 'object' && 'then' in result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>).then(
            (response: unknown) => {
              const elapsed = Date.now() - start
              const logData: Record<string, unknown> = {
                method: prop,
                elapsed: `${elapsed}ms`,
                argsCount: args.length,
              }

              if (logResponseBody) {
                logData.response = truncateResponse(response, maxResponseLength)
              }

              logger.debug(`[RPC] ${prop} completed (${elapsed}ms)`, logData)
              return response
            },
            (error: unknown) => {
              const elapsed = Date.now() - start
              logger.error(`[RPC] ${prop} failed (${elapsed}ms)`, {
                method: prop,
                elapsed: `${elapsed}ms`,
                error: error instanceof Error ? error.message : String(error),
              })
              throw error
            },
          )
        }

        const elapsed = Date.now() - start
        logger.debug(`[RPC] ${prop} returned (${elapsed}ms)`, { method: prop })
        return result
      }
    },
  })
}

/**
 * Create a summary of function arguments for logging (avoids logging sensitive data).
 */
function summarizeArgs(args: unknown[]): string[] {
  return args.map((arg, i) => {
    if (arg === undefined) return `arg${i}: undefined`
    if (arg === null) return `arg${i}: null`
    if (typeof arg === 'string') {
      return `arg${i}: "${arg.length > 50 ? arg.slice(0, 50) + '...' : arg}"`
    }
    if (typeof arg === 'number' || typeof arg === 'bigint' || typeof arg === 'boolean') {
      return `arg${i}: ${String(arg)}`
    }
    if (typeof arg === 'object' && 'toBase58' in arg && typeof (arg as { toBase58: () => string }).toBase58 === 'function') {
      return `arg${i}: PublicKey(${(arg as { toBase58: () => string }).toBase58()})`
    }
    if (Array.isArray(arg)) {
      return `arg${i}: Array(${arg.length})`
    }
    return `arg${i}: Object`
  })
}

/**
 * Truncate a response value for logging.
 */
function truncateResponse(response: unknown, maxLength: number): string {
  const str = JSON.stringify(response)
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...[truncated]'
}
