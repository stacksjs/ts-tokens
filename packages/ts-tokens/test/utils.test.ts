import { describe, test, expect } from 'bun:test'
import {
  lamportsToSol,
  solToLamports,
  formatTokenAmount,
  parseTokenAmount,
  truncateAddress,
  hexToBytes,
  bytesToHex,
  chunk,
  deepClone,
  basisPointsToPercent,
  percentToBasisPoints,
  retry,
  generateSeed,
  isBrowser,
  isNode,
  nowSeconds,
  sleep,
} from '../src/utils'

describe('lamportsToSol', () => {
  test('converts 1 SOL worth of lamports', () => {
    expect(lamportsToSol(1_000_000_000n)).toBe('1.000000000')
  })

  test('converts 0 lamports', () => {
    expect(lamportsToSol(0n)).toBe('0.000000000')
  })

  test('converts fractional SOL', () => {
    expect(lamportsToSol(500_000_000n)).toBe('0.500000000')
  })

  test('accepts number input', () => {
    expect(lamportsToSol(1_000_000_000)).toBe('1.000000000')
  })

  test('respects custom decimals', () => {
    expect(lamportsToSol(1_000_000_000n, 2)).toBe('1.00')
  })
})

describe('solToLamports', () => {
  test('converts 1 SOL to lamports', () => {
    expect(solToLamports(1)).toBe(1_000_000_000n)
  })

  test('converts 0 SOL', () => {
    expect(solToLamports(0)).toBe(0n)
  })

  test('converts fractional SOL', () => {
    expect(solToLamports(0.5)).toBe(500_000_000n)
  })

  test('floors fractional lamports', () => {
    expect(solToLamports(0.0000000001)).toBe(0n)
  })
})

describe('formatTokenAmount', () => {
  test('formats with 6 decimals', () => {
    expect(formatTokenAmount(1_000_000n, 6)).toBe('1')
  })

  test('formats with fractional parts', () => {
    expect(formatTokenAmount(1_500_000n, 6)).toBe('1.5')
  })

  test('formats with displayDecimals', () => {
    expect(formatTokenAmount(1_500_000n, 6, 2)).toBe('1.50')
  })

  test('formats 0', () => {
    expect(formatTokenAmount(0n, 9)).toBe('0')
  })

  test('accepts number input', () => {
    expect(formatTokenAmount(1000, 3)).toBe('1')
  })
})

describe('parseTokenAmount', () => {
  test('parses whole number', () => {
    expect(parseTokenAmount('1', 6)).toBe(1_000_000n)
  })

  test('parses fractional amount', () => {
    expect(parseTokenAmount('1.5', 6)).toBe(1_500_000n)
  })

  test('parses amount with trailing zeros', () => {
    expect(parseTokenAmount('1.500000', 6)).toBe(1_500_000n)
  })

  test('truncates excess decimal places', () => {
    expect(parseTokenAmount('1.1234567', 6)).toBe(1_123_456n)
  })

  test('parses zero', () => {
    expect(parseTokenAmount('0', 9)).toBe(0n)
  })
})

describe('truncateAddress', () => {
  test('truncates long address', () => {
    const addr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmno'
    expect(truncateAddress(addr)).toBe('ABCD...lmno')
  })

  test('returns short address unchanged', () => {
    expect(truncateAddress('short')).toBe('short')
  })

  test('respects custom char counts', () => {
    const addr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmno'
    expect(truncateAddress(addr, 6, 6)).toBe('ABCDEF...jklmno')
  })
})

describe('hexToBytes', () => {
  test('converts hex string to bytes', () => {
    expect(hexToBytes('0102ff')).toEqual(new Uint8Array([1, 2, 255]))
  })

  test('handles 0x prefix', () => {
    expect(hexToBytes('0x0102ff')).toEqual(new Uint8Array([1, 2, 255]))
  })

  test('handles empty string', () => {
    expect(hexToBytes('')).toEqual(new Uint8Array(0))
  })
})

describe('bytesToHex', () => {
  test('converts bytes to hex string', () => {
    expect(bytesToHex(new Uint8Array([1, 2, 255]))).toBe('0102ff')
  })

  test('adds 0x prefix when requested', () => {
    expect(bytesToHex(new Uint8Array([1, 2, 255]), true)).toBe('0x0102ff')
  })

  test('handles empty array', () => {
    expect(bytesToHex(new Uint8Array(0))).toBe('')
  })
})

describe('hexToBytes ↔ bytesToHex round-trip', () => {
  test('round-trips correctly', () => {
    const hex = 'deadbeef'
    expect(bytesToHex(hexToBytes(hex))).toBe(hex)
  })
})

describe('chunk', () => {
  test('chunks array into groups', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  test('handles exact division', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
  })

  test('handles single element chunks', () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]])
  })

  test('handles empty array', () => {
    expect(chunk([], 5)).toEqual([])
  })
})

describe('deepClone', () => {
  test('creates a deep copy', () => {
    const obj = { a: 1, b: { c: 2 } }
    const cloned = deepClone(obj)
    expect(cloned).toEqual(obj)
    cloned.b.c = 99
    expect(obj.b.c).toBe(2)
  })

  test('clones arrays', () => {
    const arr = [1, [2, 3]]
    const cloned = deepClone(arr)
    expect(cloned).toEqual(arr)
    ;(cloned[1] as number[]).push(4)
    expect(arr[1]).toEqual([2, 3])
  })
})

describe('basisPointsToPercent', () => {
  test('converts 100 bps to 1%', () => {
    expect(basisPointsToPercent(100)).toBe(1)
  })

  test('converts 10000 bps to 100%', () => {
    expect(basisPointsToPercent(10000)).toBe(100)
  })

  test('converts 0 bps to 0%', () => {
    expect(basisPointsToPercent(0)).toBe(0)
  })

  test('converts 550 bps to 5.5%', () => {
    expect(basisPointsToPercent(550)).toBe(5.5)
  })
})

describe('percentToBasisPoints', () => {
  test('converts 1% to 100 bps', () => {
    expect(percentToBasisPoints(1)).toBe(100)
  })

  test('converts 100% to 10000 bps', () => {
    expect(percentToBasisPoints(100)).toBe(10000)
  })

  test('floors fractional basis points', () => {
    expect(percentToBasisPoints(5.555)).toBe(555)
  })
})

describe('retry', () => {
  test('returns result on first success', async () => {
    const result = await retry(async () => 42, 3, 10)
    expect(result).toBe(42)
  })

  test('retries on failure then succeeds', async () => {
    let attempts = 0
    const result = await retry(async () => {
      attempts++
      if (attempts < 3) throw new Error('fail')
      return 'ok'
    }, 3, 10)
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  test('throws after max retries exhausted', async () => {
    let attempts = 0
    await expect(retry(async () => {
      attempts++
      throw new Error('always fails')
    }, 2, 10)).rejects.toThrow('always fails')
    expect(attempts).toBe(3) // initial + 2 retries
  })
})

describe('generateSeed', () => {
  test('returns 32 bytes', () => {
    const seed = generateSeed()
    expect(seed).toBeInstanceOf(Uint8Array)
    expect(seed.length).toBe(32)
  })

  test('generates different seeds each time', () => {
    const a = generateSeed()
    const b = generateSeed()
    expect(a).not.toEqual(b)
  })
})

describe('sleep', () => {
  test('resolves after delay', async () => {
    const start = Date.now()
    await sleep(50)
    expect(Date.now() - start).toBeGreaterThanOrEqual(40)
  })
})

describe('isBrowser / isNode / nowSeconds', () => {
  test('isNode returns true in Bun runtime', () => {
    expect(typeof isNode()).toBe('boolean')
  })

  test('isBrowser returns false in test environment', () => {
    expect(isBrowser()).toBe(false)
  })

  test('nowSeconds returns a recent epoch', () => {
    const s = nowSeconds()
    expect(s).toBeGreaterThan(1700000000)
    expect(s).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
  })
})
