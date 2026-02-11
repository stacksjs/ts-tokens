import { describe, test, expect } from 'bun:test'
import { importFromSugarConfig, validateSugarConfig } from '../src/legacy/import'
import { CollectionVersion } from '../src/types/legacy'

describe('importFromSugarConfig', () => {
  const validSugarConfig = {
    price: 1.5,
    number: 1000,
    symbol: 'TEST',
    sellerFeeBasisPoints: 500,
    solTreasuryAccount: 'TreasuryAddress123',
    goLiveDate: '2024-01-01T00:00:00Z',
    noRetainAuthority: false,
    noMutable: false,
    creators: [
      { address: 'Creator1', share: 70 },
      { address: 'Creator2', share: 30 },
    ],
  }

  test('should parse valid Sugar config JSON', () => {
    const json = JSON.stringify(validSugarConfig)
    const result = importFromSugarConfig(json)

    expect(result.config).toEqual(validSugarConfig)
    expect(result.collectionInfo.symbol).toBe('TEST')
    expect(result.collectionInfo.sellerFeeBasisPoints).toBe(500)
    expect(result.collectionInfo.isMutable).toBe(true) // noMutable=false means mutable
    expect(result.collectionInfo.version).toBe(CollectionVersion.Legacy)
  })

  test('should map creators correctly', () => {
    const json = JSON.stringify(validSugarConfig)
    const result = importFromSugarConfig(json)

    expect(result.collectionInfo.creators).toEqual([
      { address: 'Creator1', verified: false, share: 70 },
      { address: 'Creator2', verified: false, share: 30 },
    ])
  })

  test('should set isMutable=false when noMutable=true', () => {
    const config = { ...validSugarConfig, noMutable: true }
    const result = importFromSugarConfig(JSON.stringify(config))

    expect(result.collectionInfo.isMutable).toBe(false)
  })

  test('should handle collection mint if present', () => {
    const config = { ...validSugarConfig, collection: 'CollMint123' }
    const result = importFromSugarConfig(JSON.stringify(config))

    expect(result.collectionInfo.mint).toBe('CollMint123')
  })

  test('should default mint to empty string when no collection', () => {
    const result = importFromSugarConfig(JSON.stringify(validSugarConfig))
    expect(result.collectionInfo.mint).toBe('')
  })

  test('should throw for missing number field', () => {
    const config = { ...validSugarConfig, number: 0 }
    expect(() => importFromSugarConfig(JSON.stringify(config))).toThrow('missing required fields')
  })

  test('should throw for missing sellerFeeBasisPoints', () => {
    const config = { ...validSugarConfig, sellerFeeBasisPoints: 0 }
    expect(() => importFromSugarConfig(JSON.stringify(config))).toThrow('missing required fields')
  })

  test('should throw for invalid JSON', () => {
    expect(() => importFromSugarConfig('not json')).toThrow()
  })

  test('should handle config without creators', () => {
    const config = { ...validSugarConfig, creators: undefined }
    const json = JSON.stringify(config)
    const result = importFromSugarConfig(json)

    expect(result.collectionInfo.creators).toEqual([])
  })

  test('should handle config with empty symbol', () => {
    const config = { ...validSugarConfig, symbol: '' }
    const result = importFromSugarConfig(JSON.stringify(config))
    expect(result.collectionInfo.symbol).toBe('')
  })
})

describe('validateSugarConfig', () => {
  const validConfig = {
    price: 1.5,
    number: 1000,
    symbol: 'TEST',
    sellerFeeBasisPoints: 500,
    solTreasuryAccount: 'TreasuryAddress123',
    goLiveDate: '2024-01-01T00:00:00Z',
    noRetainAuthority: false,
    noMutable: false,
    creators: [
      { address: 'Creator1', share: 70 },
      { address: 'Creator2', share: 30 },
    ],
  }

  test('should return empty array for valid config', () => {
    const errors = validateSugarConfig(validConfig)
    expect(errors).toEqual([])
  })

  test('should catch zero number', () => {
    const errors = validateSugarConfig({ ...validConfig, number: 0 })
    expect(errors).toContain('number must be a positive integer')
  })

  test('should catch negative number', () => {
    const errors = validateSugarConfig({ ...validConfig, number: -1 })
    expect(errors).toContain('number must be a positive integer')
  })

  test('should catch sellerFeeBasisPoints out of range (negative)', () => {
    const errors = validateSugarConfig({ ...validConfig, sellerFeeBasisPoints: -1 })
    expect(errors).toContain('sellerFeeBasisPoints must be between 0 and 10000')
  })

  test('should catch sellerFeeBasisPoints out of range (too high)', () => {
    const errors = validateSugarConfig({ ...validConfig, sellerFeeBasisPoints: 10001 })
    expect(errors).toContain('sellerFeeBasisPoints must be between 0 and 10000')
  })

  test('should accept sellerFeeBasisPoints at boundaries (0)', () => {
    const errors = validateSugarConfig({ ...validConfig, sellerFeeBasisPoints: 0 })
    expect(errors.some(e => e.includes('sellerFeeBasisPoints'))).toBe(false)
  })

  test('should accept sellerFeeBasisPoints at boundaries (10000)', () => {
    const errors = validateSugarConfig({ ...validConfig, sellerFeeBasisPoints: 10000 })
    expect(errors.some(e => e.includes('sellerFeeBasisPoints'))).toBe(false)
  })

  test('should catch missing solTreasuryAccount', () => {
    const errors = validateSugarConfig({ ...validConfig, solTreasuryAccount: '' })
    expect(errors).toContain('solTreasuryAccount is required')
  })

  test('should catch creator shares not summing to 100', () => {
    const errors = validateSugarConfig({
      ...validConfig,
      creators: [
        { address: 'C1', share: 50 },
        { address: 'C2', share: 40 },
      ],
    })
    expect(errors.some(e => e.includes('Creator shares must sum to 100'))).toBe(true)
  })

  test('should accept creator shares summing to 100', () => {
    const errors = validateSugarConfig(validConfig)
    expect(errors.some(e => e.includes('Creator shares'))).toBe(false)
  })

  test('should handle config without creators', () => {
    const config = { ...validConfig, creators: undefined as any }
    const errors = validateSugarConfig(config)
    // No creator validation error when creators is undefined
    expect(errors.some(e => e.includes('Creator shares'))).toBe(false)
  })

  test('should collect multiple errors', () => {
    const errors = validateSugarConfig({
      ...validConfig,
      number: 0,
      sellerFeeBasisPoints: -1,
      solTreasuryAccount: '',
      creators: [{ address: 'C1', share: 50 }],
    })
    expect(errors.length).toBe(4)
  })
})
