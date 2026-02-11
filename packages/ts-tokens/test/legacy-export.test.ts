import { describe, test, expect } from 'bun:test'
import {
  exportToJSON,
  exportToCSV,
  exportHoldersToCSV,
  exportToMetaplexFormat,
} from '../src/legacy/export'

describe('exportToJSON', () => {
  test('should export object as formatted JSON', () => {
    const data = { name: 'Test', value: 42 }
    const result = exportToJSON(data)
    expect(result).toBe(JSON.stringify(data, null, 2))
  })

  test('should handle arrays', () => {
    const data = [1, 2, 3]
    const result = exportToJSON(data)
    expect(JSON.parse(result)).toEqual([1, 2, 3])
  })

  test('should handle null', () => {
    expect(exportToJSON(null)).toBe('null')
  })

  test('should handle nested objects', () => {
    const data = { a: { b: { c: 'deep' } } }
    const result = exportToJSON(data)
    expect(JSON.parse(result)).toEqual(data)
  })
})

describe('exportToCSV', () => {
  test('should export data with headers', () => {
    const data = [
      { name: 'Alice', count: 5 },
      { name: 'Bob', count: 3 },
    ]
    const result = exportToCSV(data)
    const lines = result.split('\n')

    expect(lines[0]).toBe('name,count')
    expect(lines[1]).toBe('Alice,5')
    expect(lines[2]).toBe('Bob,3')
  })

  test('should return empty string for empty array', () => {
    expect(exportToCSV([])).toBe('')
  })

  test('should escape fields containing commas', () => {
    const data = [{ value: 'hello, world' }]
    const result = exportToCSV(data)
    const lines = result.split('\n')

    expect(lines[1]).toBe('"hello, world"')
  })

  test('should escape fields containing double quotes', () => {
    const data = [{ value: 'say "hello"' }]
    const result = exportToCSV(data)
    const lines = result.split('\n')

    expect(lines[1]).toBe('"say ""hello"""')
  })

  test('should escape fields containing newlines', () => {
    const data = [{ value: 'line1\nline2' }]
    const result = exportToCSV(data)
    const lines = result.split('\n')

    // The escaped field contains a newline, so lines[1] starts with the quoted value
    expect(result).toContain('"line1\nline2"')
  })

  test('should handle null and undefined values', () => {
    const data = [{ a: null, b: undefined, c: 'ok' }]
    const result = exportToCSV(data)
    const lines = result.split('\n')

    expect(lines[0]).toBe('a,b,c')
    expect(lines[1]).toBe(',,ok')
  })

  test('should support custom delimiter', () => {
    const data = [{ name: 'Alice', count: 5 }]
    const result = exportToCSV(data, { delimiter: '\t' })
    const lines = result.split('\n')

    expect(lines[0]).toBe('name\tcount')
    expect(lines[1]).toBe('Alice\t5')
  })

  test('should escape fields containing custom delimiter', () => {
    const data = [{ value: 'has\ttab' }]
    const result = exportToCSV(data, { delimiter: '\t' })

    expect(result).toContain('"has\ttab"')
  })

  test('should handle single row', () => {
    const data = [{ x: 1 }]
    const result = exportToCSV(data)
    const lines = result.split('\n')

    expect(lines.length).toBe(2)
    expect(lines[0]).toBe('x')
    expect(lines[1]).toBe('1')
  })
})

describe('exportHoldersToCSV', () => {
  test('should export holders with semicolon-joined mints', () => {
    const holders = [
      { owner: 'wallet1', mints: ['mint1', 'mint2'], count: 2 },
      { owner: 'wallet2', mints: ['mint3'], count: 1 },
    ]
    const result = exportHoldersToCSV(holders)
    const lines = result.split('\n')

    expect(lines[0]).toBe('owner,count,mints')
    expect(lines[1]).toBe('wallet1,2,mint1;mint2')
    expect(lines[2]).toBe('wallet2,1,mint3')
  })

  test('should handle empty holders array', () => {
    expect(exportHoldersToCSV([])).toBe('')
  })

  test('should handle holder with empty mints', () => {
    const holders = [{ owner: 'wallet1', mints: [], count: 0 }]
    const result = exportHoldersToCSV(holders)
    const lines = result.split('\n')

    expect(lines[1]).toBe('wallet1,0,')
  })
})

describe('exportToMetaplexFormat', () => {
  test('should produce Metaplex-compatible format', () => {
    const data = {
      collection: 'col123',
      stats: { totalItems: 100, uniqueHolders: 50 },
      holders: [
        { owner: 'wallet1', mints: ['m1', 'm2'], count: 2 },
      ],
    }

    const result = JSON.parse(exportToMetaplexFormat(data))

    expect(result.collection).toBe('col123')
    expect(result.totalSupply).toBe(100)
    expect(result.uniqueHolders).toBe(50)
    expect(result.holders).toEqual([
      { ownerAddress: 'wallet1', tokenCount: 2, mints: ['m1', 'm2'] },
    ])
  })

  test('should handle missing optional fields', () => {
    const result = JSON.parse(exportToMetaplexFormat({}))

    expect(result.collection).toBe('')
    expect(result.totalSupply).toBe(0)
    expect(result.uniqueHolders).toBe(0)
    expect(result.holders).toEqual([])
  })

  test('should handle partial data', () => {
    const result = JSON.parse(exportToMetaplexFormat({
      collection: 'abc',
    }))

    expect(result.collection).toBe('abc')
    expect(result.totalSupply).toBe(0)
    expect(result.holders).toEqual([])
  })
})
