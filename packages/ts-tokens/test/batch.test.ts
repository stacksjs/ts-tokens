import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import { validateBatchRecipients } from '../src/batch/transfer'
import { calculateTotalMintAmount, validateBatchMintRecipients, validateBatchNFTItems } from '../src/batch/mint'
import type { BatchTransferRecipient, BatchMintRecipient, BatchNFTMintItem } from '../src/batch/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validAddress(): string {
  return Keypair.generate().publicKey.toBase58()
}

function makeTransferRecipients(count: number): BatchTransferRecipient[] {
  return Array.from({ length: count }, () => ({
    address: validAddress(),
    amount: 100n,
  }))
}

// ---------------------------------------------------------------------------
// validateBatchRecipients  (batch transfer validation)
// ---------------------------------------------------------------------------

describe('validateBatchRecipients', () => {
  test('returns error for empty recipients array', () => {
    const result = validateBatchRecipients([])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('No recipients provided')
  })

  test('returns error when recipients exceed 1000', () => {
    const recipients = makeTransferRecipients(1001)
    const result = validateBatchRecipients(recipients)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Maximum 1000 recipients per batch')
  })

  test('returns error for invalid address strings', () => {
    const recipients: BatchTransferRecipient[] = [
      { address: 'not-a-valid-pubkey', amount: 50n },
    ]
    const result = validateBatchRecipients(recipients)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Invalid address at index 0')
  })

  test('accepts valid PublicKey objects', () => {
    const pk = Keypair.generate().publicKey
    const recipients: BatchTransferRecipient[] = [
      { address: pk, amount: 1000n },
    ]
    const result = validateBatchRecipients(recipients)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('returns error for zero amount', () => {
    const recipients: BatchTransferRecipient[] = [
      { address: validAddress(), amount: 0n },
    ]
    const result = validateBatchRecipients(recipients)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must be positive'))).toBe(true)
  })

  test('returns error for negative amount', () => {
    const recipients: BatchTransferRecipient[] = [
      { address: validAddress(), amount: -10n },
    ]
    const result = validateBatchRecipients(recipients)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must be positive'))).toBe(true)
  })

  test('collects multiple errors for mixed valid and invalid entries', () => {
    const recipients: BatchTransferRecipient[] = [
      { address: validAddress(), amount: 100n },             // valid
      { address: 'bad-address', amount: 50n },               // invalid address
      { address: validAddress(), amount: 0n },                // zero amount
      { address: Keypair.generate().publicKey, amount: 1n },  // valid
    ]
    const result = validateBatchRecipients(recipients)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toContain('Invalid address at index 1')
    expect(result.errors[1]).toContain('Invalid amount at index 2')
  })
})

// ---------------------------------------------------------------------------
// calculateTotalMintAmount
// ---------------------------------------------------------------------------

describe('calculateTotalMintAmount', () => {
  test('returns correct total for a single recipient', () => {
    const recipients: BatchMintRecipient[] = [
      { address: validAddress(), amount: 500n },
    ]
    expect(calculateTotalMintAmount(recipients)).toBe(500n)
  })

  test('sums amounts across multiple recipients', () => {
    const recipients: BatchMintRecipient[] = [
      { address: validAddress(), amount: 100n },
      { address: validAddress(), amount: 200n },
      { address: validAddress(), amount: 300n },
    ]
    expect(calculateTotalMintAmount(recipients)).toBe(600n)
  })

  test('returns 0n for empty array', () => {
    expect(calculateTotalMintAmount([])).toBe(0n)
  })
})

// ---------------------------------------------------------------------------
// validateBatchMintRecipients
// ---------------------------------------------------------------------------

describe('validateBatchMintRecipients', () => {
  test('returns error for empty recipients array', () => {
    const result = validateBatchMintRecipients([])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('No recipients provided')
  })

  test('returns error for invalid address string', () => {
    const recipients: BatchMintRecipient[] = [
      { address: '!!!invalid!!!', amount: 10n },
    ]
    const result = validateBatchMintRecipients(recipients)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Invalid address at index 0')
  })

  test('returns error for zero amount', () => {
    const recipients: BatchMintRecipient[] = [
      { address: validAddress(), amount: 0n },
    ]
    const result = validateBatchMintRecipients(recipients)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must be positive'))).toBe(true)
  })

  test('accepts valid recipients with PublicKey objects', () => {
    const recipients: BatchMintRecipient[] = [
      { address: Keypair.generate().publicKey, amount: 999n },
      { address: Keypair.generate().publicKey, amount: 1n },
    ]
    const result = validateBatchMintRecipients(recipients)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// validateBatchNFTItems
// ---------------------------------------------------------------------------

describe('validateBatchNFTItems', () => {
  test('returns error for empty items array', () => {
    const result = validateBatchNFTItems([])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('No items provided')
  })

  test('returns error when name is missing', () => {
    const items: BatchNFTMintItem[] = [
      { name: '', symbol: 'SYM', uri: 'https://example.com/meta.json' },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Missing name'))).toBe(true)
  })

  test('returns error when name exceeds 32 characters', () => {
    const items: BatchNFTMintItem[] = [
      { name: 'A'.repeat(33), symbol: 'SYM', uri: 'https://example.com/meta.json' },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Name too long'))).toBe(true)
  })

  test('returns error when symbol is missing', () => {
    const items: BatchNFTMintItem[] = [
      { name: 'Cool NFT', symbol: '', uri: 'https://example.com/meta.json' },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Missing symbol'))).toBe(true)
  })

  test('returns error when symbol exceeds 10 characters', () => {
    const items: BatchNFTMintItem[] = [
      { name: 'Cool NFT', symbol: 'TOOLONGSYMB', uri: 'https://example.com/meta.json' },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Symbol too long'))).toBe(true)
  })

  test('returns error when URI is missing', () => {
    const items: BatchNFTMintItem[] = [
      { name: 'Cool NFT', symbol: 'COOL', uri: '' },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Missing URI'))).toBe(true)
  })

  test('returns error for invalid recipient address', () => {
    const items: BatchNFTMintItem[] = [
      { name: 'Cool NFT', symbol: 'COOL', uri: 'https://example.com/meta.json', recipient: 'bad-address' },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Invalid recipient address'))).toBe(true)
  })

  test('accepts valid items without recipient', () => {
    const items: BatchNFTMintItem[] = [
      { name: 'Cool NFT', symbol: 'COOL', uri: 'https://example.com/meta.json' },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('accepts valid items with a PublicKey recipient', () => {
    const items: BatchNFTMintItem[] = [
      {
        name: 'Cool NFT',
        symbol: 'COOL',
        uri: 'https://example.com/meta.json',
        recipient: Keypair.generate().publicKey,
      },
    ]
    const result = validateBatchNFTItems(items)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
