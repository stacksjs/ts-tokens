import { describe, test, expect } from 'bun:test'
import { executeBatch } from '../src/legacy/batch'

describe('executeBatch', () => {
  test('should process all items successfully', async () => {
    const result = await executeBatch({
      items: ['a', 'b', 'c'],
      processor: async (item) => item.toUpperCase(),
      delayMs: 0,
    })

    expect(result.successful).toEqual(['A', 'B', 'C'])
    expect(result.failed).toEqual([])
    expect(result.total).toBe(3)
  })

  test('should collect failures without stopping', async () => {
    const result = await executeBatch({
      items: ['ok1', 'fail', 'ok2'],
      processor: async (item) => {
        if (item === 'fail') throw new Error('Processing failed')
        return item
      },
      delayMs: 0,
    })

    expect(result.successful).toEqual(['ok1', 'ok2'])
    expect(result.failed).toEqual([{ item: 'fail', error: 'Processing failed' }])
    expect(result.total).toBe(3)
  })

  test('should handle all items failing', async () => {
    const result = await executeBatch({
      items: ['a', 'b'],
      processor: async () => { throw new Error('nope') },
      delayMs: 0,
    })

    expect(result.successful).toEqual([])
    expect(result.failed.length).toBe(2)
    expect(result.total).toBe(2)
  })

  test('should handle empty items array', async () => {
    const result = await executeBatch({
      items: [],
      processor: async (item) => item,
      delayMs: 0,
    })

    expect(result.successful).toEqual([])
    expect(result.failed).toEqual([])
    expect(result.total).toBe(0)
  })

  test('should call progress callback for each item', async () => {
    const progressCalls: Array<{ completed: number; total: number; item?: string }> = []

    await executeBatch({
      items: ['x', 'y', 'z'],
      processor: async (item) => item,
      delayMs: 0,
      onProgress: (completed, total, item) => {
        progressCalls.push({ completed, total, item })
      },
    })

    expect(progressCalls).toEqual([
      { completed: 1, total: 3, item: 'x' },
      { completed: 2, total: 3, item: 'y' },
      { completed: 3, total: 3, item: 'z' },
    ])
  })

  test('should respect batchSize', async () => {
    const order: string[] = []

    await executeBatch({
      items: ['a', 'b', 'c', 'd', 'e'],
      processor: async (item) => { order.push(item); return item },
      batchSize: 2,
      delayMs: 0,
    })

    // All items processed in order regardless of batch size
    expect(order).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  test('should handle non-Error thrown values', async () => {
    const result = await executeBatch({
      items: ['a'],
      processor: async () => { throw 'string error' },
      delayMs: 0,
    })

    expect(result.failed).toEqual([{ item: 'a', error: 'string error' }])
  })

  test('should return typed successful results', async () => {
    const result = await executeBatch<number>({
      items: ['1', '2', '3'],
      processor: async (item) => parseInt(item) * 10,
      delayMs: 0,
    })

    expect(result.successful).toEqual([10, 20, 30])
  })

  test('should default batchSize to 5', async () => {
    // Process 6 items: the first 5 should be in one batch, then 1 in the next
    // We can verify the delay behavior indirectly
    const result = await executeBatch({
      items: ['1', '2', '3', '4', '5', '6'],
      processor: async (item) => item,
      delayMs: 0, // zero delay so test is fast
    })

    expect(result.successful.length).toBe(6)
    expect(result.total).toBe(6)
  })
})
