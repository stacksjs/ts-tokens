/**
 * OpenTelemetry Integration
 *
 * Optional OpenTelemetry tracing for Solana RPC calls. The `@opentelemetry/api`
 * package is loaded dynamically — if it is not installed, all tracing calls
 * become no-ops transparently.
 *
 * This module is completely optional and does not add any hard dependencies.
 */

/**
 * Minimal subset of the OpenTelemetry Tracer interface used here,
 * so we do not require `@opentelemetry/api` at compile time.
 */
export interface OtelTracer {
  startSpan(name: string, options?: Record<string, unknown>): OtelSpan
}

/**
 * Minimal subset of the OpenTelemetry Span interface.
 */
export interface OtelSpan {
  setAttribute(key: string, value: string | number | boolean): void
  setStatus(status: { code: number; message?: string }): void
  recordException(exception: unknown): void
  end(): void
}

/**
 * Minimal OpenTelemetry API shape loaded dynamically.
 */
interface OtelApi {
  trace: {
    getTracer(name: string, version?: string): OtelTracer
  }
  SpanStatusCode: {
    OK: number
    ERROR: number
  }
  context: {
    active(): unknown
  }
}

/**
 * Try to load `@opentelemetry/api` dynamically.
 * Returns null if the package is not installed.
 */
async function loadOtelApi(): Promise<OtelApi | null> {
  try {
    const otel = await import('@opentelemetry/api')
    return otel as unknown as OtelApi
  } catch {
    return null
  }
}

/**
 * A no-op span used when OpenTelemetry is not available.
 */
const NOOP_SPAN: OtelSpan = {
  setAttribute() {},
  setStatus() {},
  recordException() {},
  end() {},
}

/**
 * A no-op tracer used when OpenTelemetry is not available.
 */
const NOOP_TRACER: OtelTracer = {
  startSpan() {
    return NOOP_SPAN
  },
}

/**
 * Minimal Connection-like interface for the traced wrapper.
 */
export interface TracedRpcConnection {
  [method: string]: (...args: unknown[]) => unknown
}

/**
 * Create a traced wrapper around a Solana Connection.
 *
 * Each RPC method call is wrapped in an OpenTelemetry span with attributes
 * for the method name, argument count, and duration. If `@opentelemetry/api`
 * is not installed, the wrapper passes through all calls without overhead.
 *
 * @param connection - The Solana Connection to wrap
 * @param tracer - An OpenTelemetry Tracer instance, or omit to auto-create
 * @returns A proxied connection with OpenTelemetry tracing
 *
 * @example
 * ```ts
 * import { Connection } from '@solana/web3.js'
 * import { createTracedConnection } from './telemetry'
 *
 * const connection = new Connection('https://api.devnet.solana.com')
 * const traced = await createTracedConnection(connection)
 *
 * // All RPC calls now create OpenTelemetry spans:
 * await traced.getBalance(publicKey)
 * ```
 */
export async function createTracedConnection<T extends TracedRpcConnection>(
  connection: T,
  tracer?: OtelTracer,
): Promise<T> {
  const otel = await loadOtelApi()

  // If OpenTelemetry is not available and no tracer provided, return as-is
  if (!otel && !tracer) {
    return connection
  }

  const activeTracer = tracer ?? (otel?.trace.getTracer('ts-tokens', '1.0.0') ?? NOOP_TRACER)
  const spanStatusOk = otel?.SpanStatusCode.OK ?? 0
  const spanStatusError = otel?.SpanStatusCode.ERROR ?? 1

  return new Proxy(connection, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (typeof value !== 'function') return value
      if (typeof prop !== 'string') return value
      if (prop.startsWith('_')) return value

      return (...args: unknown[]) => {
        const span = activeTracer.startSpan(`rpc.${prop}`)
        span.setAttribute('rpc.method', prop)
        span.setAttribute('rpc.args_count', args.length)

        const result = value.apply(target, args)

        if (result && typeof result === 'object' && 'then' in result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>).then(
            (response: unknown) => {
              span.setStatus({ code: spanStatusOk })
              span.end()
              return response
            },
            (error: unknown) => {
              span.setStatus({ code: spanStatusError, message: error instanceof Error ? error.message : String(error) })
              span.recordException(error)
              span.end()
              throw error
            },
          )
        }

        span.setStatus({ code: spanStatusOk })
        span.end()
        return result
      }
    },
  })
}

/**
 * Get a tracer for ts-tokens operations.
 * Returns a no-op tracer if OpenTelemetry is not available.
 *
 * @param name - Tracer name (default: 'ts-tokens')
 * @returns An OpenTelemetry Tracer or a no-op stand-in
 *
 * @example
 * ```ts
 * const tracer = await getTracer()
 * const span = tracer.startSpan('myOperation')
 * // ... do work ...
 * span.end()
 * ```
 */
export async function getTracer(name = 'ts-tokens'): Promise<OtelTracer> {
  const otel = await loadOtelApi()
  return otel?.trace.getTracer(name) ?? NOOP_TRACER
}
