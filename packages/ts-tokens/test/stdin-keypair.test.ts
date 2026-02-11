/**
 * Stdin Keypair Parsing Tests
 *
 * Tests for parseSecretKeyInput which handles base58 and JSON byte array
 * secret key formats (the extracted/testable logic behind stdin loading).
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import { parseSecretKeyInput } from '../src/drivers/solana/wallet'
import { encode as encodeBase58 } from '../src/utils/base58'

describe('parseSecretKeyInput', () => {
  test('parses base58-encoded secret key', () => {
    const kp = Keypair.generate()
    const base58 = encodeBase58(kp.secretKey)

    const result = parseSecretKeyInput(base58)
    const restored = Keypair.fromSecretKey(result)

    expect(restored.publicKey.equals(kp.publicKey)).toBe(true)
  })

  test('parses JSON byte array format', () => {
    const kp = Keypair.generate()
    const jsonStr = JSON.stringify(Array.from(kp.secretKey))

    const result = parseSecretKeyInput(jsonStr)
    const restored = Keypair.fromSecretKey(result)

    expect(restored.publicKey.equals(kp.publicKey)).toBe(true)
  })

  test('trims whitespace and newlines before parsing', () => {
    const kp = Keypair.generate()
    const base58 = encodeBase58(kp.secretKey)
    const padded = `  \n${base58}\n  `

    const result = parseSecretKeyInput(padded)
    const restored = Keypair.fromSecretKey(result)

    expect(restored.publicKey.equals(kp.publicKey)).toBe(true)
  })

  test('throws on empty input', () => {
    expect(() => parseSecretKeyInput('')).toThrow('Empty secret key input')
  })

  test('throws on whitespace-only input', () => {
    expect(() => parseSecretKeyInput('   \n  ')).toThrow('Empty secret key input')
  })

  test('throws on invalid JSON array', () => {
    expect(() => parseSecretKeyInput('[not valid json')).toThrow('Invalid JSON byte array')
  })

  test('throws on invalid base58 characters', () => {
    expect(() => parseSecretKeyInput('0OIl')).toThrow()
  })
})
