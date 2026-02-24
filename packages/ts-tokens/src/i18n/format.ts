/**
 * Formatting Utilities
 *
 * Locale-aware number and date formatting.
 */

import type { Locale } from './types'
import { getLocale } from './translations'

/**
 * Locale to Intl locale mapping
 */
const localeMap: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  ru: 'ru-RU',
}

/**
 * Get Intl locale string
 */
function getIntlLocale(locale?: Locale): string {
  return localeMap[locale ?? getLocale()] ?? 'en-US'
}

/**
 * Format number
 */
export function formatNumber(
  value: number | bigint,
  options?: Intl.NumberFormatOptions,
  locale?: Locale
): string {
  const num = typeof value === 'bigint' ? Number(value) : value
  return new Intl.NumberFormat(getIntlLocale(locale), options).format(num)
}

/**
 * Format currency (USD)
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale?: Locale
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency,
  }).format(value)
}

/**
 * Format SOL amount
 */
export function formatSOL(lamports: bigint | number, locale?: Locale): string {
  const sol = Number(lamports) / 1e9
  return `${formatNumber(sol, { maximumFractionDigits: 9 }, locale)} SOL`
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(
  amount: bigint | number,
  decimals: number,
  symbol?: string,
  locale?: Locale
): string {
  const value = Number(amount) / Math.pow(10, decimals)
  const formatted = formatNumber(value, {
    maximumFractionDigits: decimals,
  }, locale)

  return symbol ? `${formatted} ${symbol}` : formatted
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number,
  decimals: number = 2,
  locale?: Locale
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Format date
 */
export function formatDate(
  date: Date | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: Locale
): string {
  const d = typeof date === 'number' ? new Date(date) : date
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(d)
}

/**
 * Format date short (MM/DD/YYYY or locale equivalent)
 */
export function formatDateShort(date: Date | number, locale?: Locale): string {
  return formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }, locale)
}

/**
 * Format date long
 */
export function formatDateLong(date: Date | number, locale?: Locale): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }, locale)
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | number, locale?: Locale): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }, locale)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | number,
  locale?: Locale
): string {
  const d = typeof date === 'number' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(locale), {
    numeric: 'auto',
  })

  if (diffSec < 60) return rtf.format(-diffSec, 'second')
  if (diffMin < 60) return rtf.format(-diffMin, 'minute')
  if (diffHour < 24) return rtf.format(-diffHour, 'hour')
  if (diffDay < 30) return rtf.format(-diffDay, 'day')
  if (diffDay < 365) return rtf.format(-Math.floor(diffDay / 30), 'month')
  return rtf.format(-Math.floor(diffDay / 365), 'year')
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number, _locale?: Locale): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

/**
 * Format address (truncate middle)
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/**
 * Format signature (truncate)
 */
export function formatSignature(signature: string, chars: number = 8): string {
  return formatAddress(signature, chars)
}

/**
 * Format large number with suffix (K, M, B)
 */
export function formatCompact(value: number, locale?: Locale): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value)
}

/**
 * Format bytes
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0
  let value = bytes

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}
