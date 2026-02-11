import { describe, test, expect, beforeEach } from 'bun:test'
import { setLocale } from '../src/i18n/translations'
import {
  formatNumber,
  formatCurrency,
  formatSOL,
  formatPercent,
  formatDate,
  formatDuration,
  formatAddress,
  formatSignature,
  formatCompact,
  formatBytes,
  formatDateShort,
  formatDateLong,
  formatTokenAmount,
} from '../src/i18n/format'

beforeEach(() => {
  setLocale('en')
})

describe('formatNumber', () => {
  test('formats integer', () => {
    expect(formatNumber(1234)).toBe('1,234')
  })

  test('formats bigint', () => {
    const result = formatNumber(1000000n)
    expect(result).toBe('1,000,000')
  })

  test('formats with custom options', () => {
    const result = formatNumber(1234.5678, { maximumFractionDigits: 2 })
    expect(result).toBe('1,234.57')
  })

  test('respects locale parameter', () => {
    const result = formatNumber(1234.56, undefined, 'de')
    // German uses . for thousands and , for decimals
    expect(result).toContain('1')
    expect(result).toContain('234')
  })
})

describe('formatCurrency', () => {
  test('formats USD by default', () => {
    const result = formatCurrency(1234.56)
    expect(result).toBe('$1,234.56')
  })

  test('formats EUR', () => {
    const result = formatCurrency(1234.56, 'EUR')
    expect(result).toContain('1,234.56')
    expect(result).toContain('€')
  })

  test('formats with locale', () => {
    const result = formatCurrency(1234.56, 'USD', 'en')
    expect(result).toBe('$1,234.56')
  })
})

describe('formatSOL', () => {
  test('formats 1 SOL from lamports', () => {
    const result = formatSOL(1_000_000_000n)
    expect(result).toContain('1')
    expect(result).toContain('SOL')
  })

  test('formats fractional SOL', () => {
    const result = formatSOL(500_000_000)
    expect(result).toContain('0.5')
    expect(result).toContain('SOL')
  })

  test('formats zero lamports', () => {
    const result = formatSOL(0)
    expect(result).toContain('0')
    expect(result).toContain('SOL')
  })
})

describe('formatTokenAmount', () => {
  test('formats token with symbol', () => {
    const result = formatTokenAmount(1_000_000, 6, 'USDC')
    expect(result).toContain('1')
    expect(result).toContain('USDC')
  })

  test('formats token without symbol', () => {
    const result = formatTokenAmount(1_000_000, 6)
    expect(result).toContain('1')
    expect(result).not.toContain('undefined')
  })
})

describe('formatPercent', () => {
  test('formats 5 as 5.00%', () => {
    const result = formatPercent(5)
    expect(result).toBe('5.00%')
  })

  test('formats 100 as 100.00%', () => {
    const result = formatPercent(100)
    expect(result).toBe('100.00%')
  })

  test('formats 0 as 0.00%', () => {
    const result = formatPercent(0)
    expect(result).toBe('0.00%')
  })

  test('custom decimal places', () => {
    const result = formatPercent(12.345, 1)
    expect(result).toBe('12.3%')
  })
})

describe('formatDate', () => {
  test('formats Date object', () => {
    const date = new Date('2024-06-15T12:00:00Z')
    const result = formatDate(date)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('formats timestamp number', () => {
    const timestamp = new Date('2024-06-15').getTime()
    const result = formatDate(timestamp)
    expect(typeof result).toBe('string')
  })
})

describe('formatDateShort', () => {
  test('formats as MM/DD/YYYY for en locale', () => {
    const date = new Date('2024-01-15T00:00:00')
    const result = formatDateShort(date)
    expect(result).toBe('01/15/2024')
  })
})

describe('formatDateLong', () => {
  test('formats with full month name', () => {
    const date = new Date('2024-01-15T00:00:00')
    const result = formatDateLong(date)
    expect(result).toContain('January')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })
})

describe('formatDuration', () => {
  test('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0s')
  })

  test('formats seconds only', () => {
    expect(formatDuration(30)).toBe('30s')
  })

  test('formats minutes', () => {
    expect(formatDuration(60)).toBe('1m')
  })

  test('formats hours', () => {
    expect(formatDuration(3600)).toBe('1h')
  })

  test('formats days', () => {
    expect(formatDuration(86400)).toBe('1d')
  })

  test('formats complex duration', () => {
    expect(formatDuration(90061)).toBe('1d 1h 1m 1s')
  })

  test('omits zero parts', () => {
    expect(formatDuration(3601)).toBe('1h 1s')
  })
})

describe('formatAddress', () => {
  test('truncates long address', () => {
    const addr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop'
    expect(formatAddress(addr)).toBe('ABCD...mnop')
  })

  test('returns short address as-is', () => {
    expect(formatAddress('short')).toBe('short')
  })

  test('custom char count', () => {
    const addr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop'
    expect(formatAddress(addr, 6)).toBe('ABCDEF...klmnop')
  })
})

describe('formatSignature', () => {
  test('truncates long signature with default 8 chars', () => {
    const sig = 'A'.repeat(88)
    const result = formatSignature(sig)
    expect(result).toBe('AAAAAAAA...AAAAAAAA')
  })

  test('returns short signature as-is', () => {
    expect(formatSignature('short')).toBe('short')
  })
})

describe('formatCompact', () => {
  test('formats thousands as K', () => {
    const result = formatCompact(1500)
    expect(result).toMatch(/1\.5K/i)
  })

  test('formats millions as M', () => {
    const result = formatCompact(2_500_000)
    expect(result).toMatch(/2\.5M/i)
  })

  test('formats small numbers without suffix', () => {
    const result = formatCompact(500)
    expect(result).toBe('500')
  })
})

describe('formatBytes', () => {
  test('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B')
  })

  test('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.00 KB')
  })

  test('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB')
  })

  test('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB')
  })

  test('formats fractional KB', () => {
    expect(formatBytes(1536)).toBe('1.50 KB')
  })

  test('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })
})
