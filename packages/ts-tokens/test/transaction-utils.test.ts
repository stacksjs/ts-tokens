import { describe, test, expect } from 'bun:test'
import { PublicKey, ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js'
import {
  getPriorityFee,
  addPriorityFee,
  addComputeLimit,
  packInstructions,
} from '../src/utils/transaction'

function makeInstruction(dataSize: number = 10, keyCount: number = 2): TransactionInstruction {
  const keys = Array.from({ length: keyCount }, () => ({
    pubkey: PublicKey.default,
    isSigner: false,
    isWritable: false,
  }))
  return new TransactionInstruction({
    programId: PublicKey.default,
    keys,
    data: Buffer.alloc(dataSize),
  })
}

describe('getPriorityFee', () => {
  test('returns 0 for none', () => {
    expect(getPriorityFee('none')).toBe(0)
  })

  test('returns 1000 for low', () => {
    expect(getPriorityFee('low')).toBe(1000)
  })

  test('returns 10000 for medium', () => {
    expect(getPriorityFee('medium')).toBe(10000)
  })

  test('returns 100000 for high', () => {
    expect(getPriorityFee('high')).toBe(100000)
  })

  test('returns 1000000 for turbo', () => {
    expect(getPriorityFee('turbo')).toBe(1000000)
  })

  test('fee values increase from low to turbo', () => {
    expect(getPriorityFee('low')).toBeLessThan(getPriorityFee('medium'))
    expect(getPriorityFee('medium')).toBeLessThan(getPriorityFee('high'))
    expect(getPriorityFee('high')).toBeLessThan(getPriorityFee('turbo'))
  })
})

describe('addPriorityFee', () => {
  test('returns same instructions for "none"', () => {
    const ixs = [makeInstruction()]
    const result = addPriorityFee(ixs, 'none')
    expect(result).toBe(ixs)
    expect(result.length).toBe(1)
  })

  test('prepends priority fee instruction for non-none level', () => {
    const ixs = [makeInstruction()]
    const result = addPriorityFee(ixs, 'medium')
    expect(result.length).toBe(2)
    expect(result[0].programId.equals(ComputeBudgetProgram.programId)).toBe(true)
    expect(result[1]).toBe(ixs[0])
  })

  test('preserves all original instructions', () => {
    const ixs = [makeInstruction(), makeInstruction()]
    const result = addPriorityFee(ixs, 'low')
    expect(result.length).toBe(3)
  })
})

describe('addComputeLimit', () => {
  test('prepends compute limit instruction', () => {
    const ixs = [makeInstruction()]
    const result = addComputeLimit(ixs, 400000)
    expect(result.length).toBe(2)
    expect(result[0].programId.equals(ComputeBudgetProgram.programId)).toBe(true)
  })

  test('preserves original instructions', () => {
    const original = makeInstruction()
    const result = addComputeLimit([original], 200000)
    expect(result[1]).toBe(original)
  })
})

describe('packInstructions', () => {
  test('packs single instruction into one batch', () => {
    const ixs = [makeInstruction(10, 2)]
    const batches = packInstructions(ixs)
    expect(batches.length).toBe(1)
    expect(batches[0].length).toBe(1)
  })

  test('splits instructions that exceed maxSize', () => {
    const ixs = Array.from({ length: 5 }, () => makeInstruction(500, 2))
    const batches = packInstructions(ixs, 700)
    expect(batches.length).toBeGreaterThan(1)
  })

  test('returns empty array for empty input', () => {
    expect(packInstructions([])).toEqual([])
  })

  test('all instructions are preserved across batches', () => {
    const ixs = Array.from({ length: 10 }, () => makeInstruction(100, 1))
    const batches = packInstructions(ixs, 300)
    const total = batches.reduce((sum, batch) => sum + batch.length, 0)
    expect(total).toBe(10)
  })

  test('default maxSize is 1232', () => {
    // Small instruction: 32 + 1*34 + 1 = 67 bytes each
    const ixs = Array.from({ length: 15 }, () => makeInstruction(1, 1))
    const batches = packInstructions(ixs)
    expect(batches.length).toBe(1)
  })
})
