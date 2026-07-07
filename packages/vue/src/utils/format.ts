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
  displayDecimals?: number,
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
