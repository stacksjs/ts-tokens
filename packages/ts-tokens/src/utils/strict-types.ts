/**
 * Strict Utility Types
 *
 * Discriminated union result types and helpers that eliminate `any`
 * from public API signatures.
 */

/**
 * Success branch of a discriminated Result union.
 *
 * @example
 * ```ts
 * const ok: Ok<number> = { ok: true, value: 42 }
 * ```
 */
export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

/**
 * Failure branch of a discriminated Result union.
 *
 * @example
 * ```ts
 * const err: Err<string> = { ok: false, error: 'something went wrong' }
 * ```
 */
export interface Err<E> {
  readonly ok: false
  readonly error: E
}

/**
 * Discriminated union representing either a success (`Ok<T>`) or failure (`Err<E>`).
 *
 * Use pattern matching on the `ok` discriminant to safely access the value:
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return { ok: false, error: 'division by zero' }
 *   return { ok: true, value: a / b }
 * }
 *
 * const result = divide(10, 2)
 * if (result.ok) {
 *   console.log(result.value) // 5
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export type Result<T, E = Error> = Ok<T> | Err<E>

/**
 * Async version of Result. A Promise that resolves to a discriminated Result union.
 *
 * @example
 * ```ts
 * async function fetchData(): AsyncResult<string, Error> {
 *   try {
 *     const data = await fetch('/api').then(r => r.text())
 *     return { ok: true, value: data }
 *   } catch (e) {
 *     return { ok: false, error: e as Error }
 *   }
 * }
 * ```
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

/**
 * Create an Ok result.
 *
 * @param value - The success value
 * @returns An Ok result containing the value
 *
 * @example
 * ```ts
 * const result = ok(42)
 * // { ok: true, value: 42 }
 * ```
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

/**
 * Create an Err result.
 *
 * @param error - The error value
 * @returns An Err result containing the error
 *
 * @example
 * ```ts
 * const result = err(new Error('failed'))
 * // { ok: false, error: Error('failed') }
 * ```
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

/**
 * Wrap a promise-returning function into one that returns an AsyncResult,
 * catching thrown errors automatically.
 *
 * @param fn - Async function to wrap
 * @returns An async function returning a Result instead of throwing
 *
 * @example
 * ```ts
 * const safeFetch = wrapAsync(async (url: string) => {
 *   const res = await fetch(url)
 *   return res.json()
 * })
 *
 * const result = await safeFetch('https://api.example.com')
 * if (result.ok) console.log(result.value)
 * ```
 */
export function wrapAsync<TArgs extends unknown[], T>(
  fn: (...args: TArgs) => Promise<T>,
): (...args: TArgs) => AsyncResult<T, Error> {
  return async (...args: TArgs): AsyncResult<T, Error> => {
    try {
      const value = await fn(...args)
      return ok(value)
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }
  }
}

/**
 * Unwrap a Result, throwing the error if it is an Err.
 *
 * @param result - The result to unwrap
 * @returns The success value
 * @throws The error value if the result is an Err
 *
 * @example
 * ```ts
 * const value = unwrap(ok(42)) // 42
 * unwrap(err(new Error('boom'))) // throws Error('boom')
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value
  throw result.error
}

/**
 * Unwrap a Result, returning a default value if it is an Err.
 *
 * @param result - The result to unwrap
 * @param defaultValue - Value to return if result is Err
 * @returns The success value or the default
 *
 * @example
 * ```ts
 * unwrapOr(ok(42), 0) // 42
 * unwrapOr(err('oops'), 0) // 0
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue
}

/**
 * Map the success value of a Result.
 *
 * @param result - The input result
 * @param fn - Mapping function applied to the success value
 * @returns A new Result with the mapped value
 *
 * @example
 * ```ts
 * mapResult(ok(2), x => x * 3) // { ok: true, value: 6 }
 * mapResult(err('oops'), x => x * 3) // { ok: false, error: 'oops' }
 * ```
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) return ok(fn(result.value))
  return result
}

/**
 * Strictly typed record where all values share the same type.
 * Useful for configuration maps and registries.
 */
export type StrictRecord<K extends string, V> = { readonly [P in K]: V }

/**
 * Make specific keys of T required while leaving the rest as-is.
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Deep readonly version of a type.
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Record<string, unknown>
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

/**
 * Extract the non-undefined type from an optional field.
 */
export type Defined<T> = T extends undefined ? never : T
