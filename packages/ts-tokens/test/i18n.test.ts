/**
 * i18n Tests
 */

import { describe, test, expect } from 'bun:test'

describe('Translations', () => {
  test('should interpolate values', () => {
    const template = 'Transferred {amount} tokens to {recipient}'
    const values = { amount: '1000', recipient: 'ABC123' }

    let result = template
    for (const [k, v] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }

    expect(result).toBe('Transferred 1000 tokens to ABC123')
  })

  test('should handle missing values', () => {
    const template = 'Hello {name}'
    const values = {}

    let result = template
    for (const [k, v] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }

    expect(result).toBe('Hello {name}')
  })
})

describe('Number Formatting', () => {
  test('should format numbers with locale', () => {
    const value = 1234567.89
    const formatted = new Intl.NumberFormat('en-US').format(value)

    expect(formatted).toBe('1,234,567.89')
  })

  test('should format currency', () => {
    const value = 1234.56
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)

    expect(formatted).toBe('$1,234.56')
  })

  test('should format percentage', () => {
    const value = 0.75
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'percent',
    }).format(value)

    expect(formatted).toBe('75%')
  })

  test('should format compact numbers', () => {
    const value = 1500000
    const formatted = new Intl.NumberFormat('en-US', {
      notation: 'compact',
    }).format(value)

    expect(formatted).toBe('1.5M')
  })
})

describe('Date Formatting', () => {
  test('should format date short', () => {
    const date = new Date('2024-01-15')
    const formatted = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)

    expect(formatted).toBe('01/15/2024')
  })

  test('should format date long', () => {
    const date = new Date('2024-01-15')
    const formatted = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)

    expect(formatted).toBe('January 15, 2024')
  })
})

describe('Relative Time', () => {
  test('should format relative time', () => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

    expect(rtf.format(-1, 'day')).toBe('yesterday')
    expect(rtf.format(-2, 'day')).toBe('2 days ago')
    expect(rtf.format(-1, 'hour')).toBe('1 hour ago')
  })
})

describe('Duration Formatting', () => {
  test('should format duration', () => {
    const formatDuration = (seconds: number): string => {
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

    expect(formatDuration(90061)).toBe('1d 1h 1m 1s')
    expect(formatDuration(3600)).toBe('1h')
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(30)).toBe('30s')
  })
})

describe('Address Formatting', () => {
  test('should truncate address', () => {
    const address = 'ABC123DEF456GHI789JKL012MNO345PQR678STU901'
    const chars = 4

    const formatted = `${address.slice(0, chars)}...${address.slice(-chars)}`

    expect(formatted).toBe('ABC1...U901')
  })
})

describe('Bytes Formatting', () => {
  test('should format bytes', () => {
    const formatBytes = (bytes: number): string => {
      const units = ['B', 'KB', 'MB', 'GB']
      let unitIndex = 0
      let value = bytes

      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex++
      }

      return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
    }

    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1536)).toBe('1.50 KB')
    expect(formatBytes(1048576)).toBe('1.00 MB')
  })
})
