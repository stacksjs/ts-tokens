/**
 * Formatting utilities
 */

/**
 * Format a bigint base-unit amount into a human-readable decimal string
 * without precision loss.
 *
 * Unlike `Number(amount) / 10 ** decimals`, this is exact for values above
 * 2^53 because it never converts the raw amount to a floating-point number.
 *
 * @param amount - The raw amount in base units
 * @param decimals - The number of decimal places the token uses
 * @param displayDecimals - Optional cap on fractional digits shown (trailing
 *   zeros are trimmed). When omitted, the full fractional part is shown.
 */
export function formatUnits(
  amount: bigint,
  decimals: number,
  displayDecimals?: number
): string {
  const negative = amount < 0n
  const abs = negative ? -amount : amount

  if (decimals <= 0) {
    return `${negative ? '-' : ''}${abs.toString()}`
  }

  const base = 10n ** BigInt(decimals)
  const whole = abs / base
  let fraction = (abs % base).toString().padStart(decimals, '0')

  if (displayDecimals !== undefined && displayDecimals < fraction.length) {
    fraction = fraction.slice(0, displayDecimals)
  }

  // Trim trailing zeros
  fraction = fraction.replace(/0+$/, '')

  const sign = negative ? '-' : ''
  return fraction.length > 0 ? `${sign}${whole}.${fraction}` : `${sign}${whole}`
}

/**
 * Format a bigint base-unit amount into a fixed-decimal string, rounding
 * half-up, without precision loss for large values.
 *
 * Equivalent in spirit to `(Number(amount) / 10 ** decimals).toFixed(display)`
 * but exact for amounts above 2^53.
 *
 * @param amount - The raw amount in base units
 * @param decimals - The number of decimal places the token uses
 * @param display - The number of fractional digits to show (padded with zeros)
 */
export function formatFixed(amount: bigint, decimals: number, display: number): string {
  const negative = amount < 0n
  let abs = negative ? -amount : amount

  const decimalsBig = BigInt(Math.max(0, decimals))
  const displayBig = BigInt(Math.max(0, display))

  // Scale so the value is expressed in units of 10^-display, then round the
  // truncated remainder half-up.
  if (displayBig >= decimalsBig) {
    abs = abs * 10n ** (displayBig - decimalsBig)
  } else {
    const divisor = 10n ** (decimalsBig - displayBig)
    const remainder = abs % divisor
    abs = abs / divisor
    if (remainder * 2n >= divisor) abs += 1n
  }

  const scale = 10n ** displayBig
  const whole = abs / scale
  const sign = negative && abs !== 0n ? '-' : ''

  if (display <= 0) {
    return `${sign}${whole}`
  }

  const fraction = (abs % scale).toString().padStart(display, '0')
  return `${sign}${whole}.${fraction}`
}
