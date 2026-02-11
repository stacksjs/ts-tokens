/**
 * CLI Output Utilities
 *
 * Chalk-based formatted output helpers for consistent CLI display.
 */

import chalk from 'chalk'

/**
 * Print a success message
 */
export function success(message: string): void {
  console.log(chalk.green(`  ${message}`))
}

/**
 * Print an error message
 */
export function error(message: string): void {
  console.error(chalk.red(`  ${message}`))
}

/**
 * Print a warning message
 */
export function warn(message: string): void {
  console.warn(chalk.yellow(`  ${message}`))
}

/**
 * Print an info message
 */
export function info(message: string): void {
  console.log(chalk.blue(`  ${message}`))
}

/**
 * Print a section header
 */
export function header(title: string): void {
  console.log()
  console.log(chalk.bold.underline(title))
  console.log()
}

/**
 * Print a key-value pair
 */
export function keyValue(key: string, value: string): void {
  console.log(`  ${chalk.gray(key + ':')} ${value}`)
}

/**
 * Print a simple table from rows of key-value data
 */
export function table(rows: Array<Record<string, string>>, columns?: string[]): void {
  if (rows.length === 0) return

  const keys = columns ?? Object.keys(rows[0])
  const widths = keys.map(key =>
    Math.max(key.length, ...rows.map(r => (r[key] ?? '').length))
  )

  // Header
  const headerLine = keys.map((k, i) => chalk.bold(k.padEnd(widths[i]))).join('  ')
  console.log(`  ${headerLine}`)
  console.log(`  ${widths.map(w => '-'.repeat(w)).join('  ')}`)

  // Rows
  for (const row of rows) {
    const line = keys.map((k, i) => (row[k] ?? '').padEnd(widths[i])).join('  ')
    console.log(`  ${line}`)
  }
}

/**
 * Format a Solana address for display (truncated)
 */
export function formatAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/**
 * Format SOL amount for display
 */
export function formatSol(lamports: number | bigint): string {
  const sol = Number(lamports) / 1_000_000_000
  return `${sol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 9 })} SOL`
}
