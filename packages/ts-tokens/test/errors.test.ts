import { describe, test, expect } from 'bun:test'
import {
  TokensError,
  InsufficientBalanceError,
  InvalidAddressError,
  AuthorityError,
  TransactionError,
  RpcError,
  ValidationError,
  ConfigError,
  NetworkError,
  parseTransactionError,
  getUserFriendlyMessage,
  ERROR_CODES,
} from '../src/utils/errors'

describe('TokensError', () => {
  test('sets message, code, and details', () => {
    const err = new TokensError('test message', 'TEST_CODE', { key: 'value' })
    expect(err.message).toBe('test message')
    expect(err.code).toBe('TEST_CODE')
    expect(err.details).toEqual({ key: 'value' })
    expect(err.name).toBe('TokensError')
  })

  test('is an instance of Error', () => {
    const err = new TokensError('test', 'CODE')
    expect(err).toBeInstanceOf(Error)
  })

  test('details is optional', () => {
    const err = new TokensError('test', 'CODE')
    expect(err.details).toBeUndefined()
  })
})

describe('InsufficientBalanceError', () => {
  test('formats message with required and available', () => {
    const err = new InsufficientBalanceError(10, 5)
    expect(err.message).toBe('Insufficient SOL balance: need 10, have 5')
    expect(err.code).toBe('INSUFFICIENT_BALANCE')
    expect(err.name).toBe('InsufficientBalanceError')
  })

  test('includes custom currency', () => {
    const err = new InsufficientBalanceError(10, 5, 'USDC')
    expect(err.message).toContain('USDC')
  })

  test('stores details', () => {
    const err = new InsufficientBalanceError(10, 5)
    expect(err.details).toEqual({ required: 10, available: 5, currency: 'SOL' })
  })
})

describe('InvalidAddressError', () => {
  test('formats message with address', () => {
    const err = new InvalidAddressError('abc123')
    expect(err.message).toBe('Invalid address: abc123')
    expect(err.code).toBe('INVALID_ADDRESS')
  })

  test('includes reason when provided', () => {
    const err = new InvalidAddressError('abc123', 'too short')
    expect(err.message).toBe('Invalid address: abc123 (too short)')
  })

  test('stores address and reason in details', () => {
    const err = new InvalidAddressError('abc', 'bad')
    expect(err.details).toEqual({ address: 'abc', reason: 'bad' })
  })
})

describe('AuthorityError', () => {
  test('sets code and authority type', () => {
    const err = new AuthorityError('No mint authority', 'mint')
    expect(err.code).toBe('AUTHORITY_ERROR')
    expect(err.details?.authorityType).toBe('mint')
  })
})

describe('TransactionError', () => {
  test('stores signature', () => {
    const err = new TransactionError('tx failed', 'sig123')
    expect(err.signature).toBe('sig123')
    expect(err.code).toBe('TRANSACTION_ERROR')
    expect(err.details?.signature).toBe('sig123')
  })

  test('merges additional details', () => {
    const err = new TransactionError('tx failed', 'sig', { extra: 42 })
    expect(err.details?.extra).toBe(42)
  })
})

describe('RpcError', () => {
  test('stores endpoint', () => {
    const err = new RpcError('connection failed', 'https://rpc.example.com')
    expect(err.endpoint).toBe('https://rpc.example.com')
    expect(err.code).toBe('RPC_ERROR')
  })
})

describe('ValidationError', () => {
  test('stores field', () => {
    const err = new ValidationError('invalid name', 'name')
    expect(err.field).toBe('name')
    expect(err.code).toBe('VALIDATION_ERROR')
  })
})

describe('ConfigError', () => {
  test('sets code to CONFIG_ERROR', () => {
    const err = new ConfigError('bad config')
    expect(err.code).toBe('CONFIG_ERROR')
    expect(err.name).toBe('ConfigError')
  })
})

describe('NetworkError', () => {
  test('stores network in details', () => {
    const err = new NetworkError('timeout', 'devnet')
    expect(err.code).toBe('NETWORK_ERROR')
    expect(err.details?.network).toBe('devnet')
  })
})

describe('parseTransactionError', () => {
  test('parses insufficient funds', () => {
    const err = parseTransactionError(new Error('insufficient funds for rent'))
    expect(err).toBeInstanceOf(InsufficientBalanceError)
    expect(err.code).toBe('INSUFFICIENT_BALANCE')
  })

  test('parses invalid account owner', () => {
    const err = parseTransactionError(new Error('invalid account owner'))
    expect(err).toBeInstanceOf(AuthorityError)
    expect(err.code).toBe('AUTHORITY_ERROR')
  })

  test('parses custom program error with hex code', () => {
    const err = parseTransactionError(new Error('custom program error: 0x1770'))
    expect(err).toBeInstanceOf(TransactionError)
    expect(err.details?.errorCode).toBe('1770')
  })

  test('parses blockhash not found', () => {
    const err = parseTransactionError(new Error('blockhash not found'))
    expect(err).toBeInstanceOf(TransactionError)
    expect(err.details?.reason).toBe('blockhash_expired')
  })

  test('returns generic TransactionError for unknown errors', () => {
    const err = parseTransactionError(new Error('something unexpected'))
    expect(err).toBeInstanceOf(TransactionError)
    expect(err.message).toBe('something unexpected')
  })

  test('handles string input', () => {
    const err = parseTransactionError('insufficient funds')
    expect(err).toBeInstanceOf(InsufficientBalanceError)
  })
})

describe('getUserFriendlyMessage', () => {
  test('returns friendly message for INSUFFICIENT_BALANCE', () => {
    const err = new InsufficientBalanceError(10, 5)
    const msg = getUserFriendlyMessage(err)
    expect(msg).toContain("don't have enough funds")
  })

  test('returns friendly message for INVALID_ADDRESS', () => {
    const err = new InvalidAddressError('abc')
    const msg = getUserFriendlyMessage(err)
    expect(msg).toContain('not valid')
  })

  test('returns friendly message for AUTHORITY_ERROR', () => {
    const err = new AuthorityError('no auth', 'mint')
    const msg = getUserFriendlyMessage(err)
    expect(msg).toContain('permission')
  })

  test('returns friendly message for TRANSACTION_ERROR', () => {
    const err = new TransactionError('failed')
    const msg = getUserFriendlyMessage(err)
    expect(msg).toContain('Transaction failed')
  })

  test('returns friendly message for RPC_ERROR', () => {
    const err = new RpcError('timeout')
    const msg = getUserFriendlyMessage(err)
    expect(msg).toContain('Network connection')
  })

  test('returns friendly message for VALIDATION_ERROR', () => {
    const err = new ValidationError('bad input')
    const msg = getUserFriendlyMessage(err)
    expect(msg).toContain('Invalid input')
  })

  test('returns friendly message for CONFIG_ERROR', () => {
    const err = new ConfigError('missing field')
    const msg = getUserFriendlyMessage(err)
    expect(msg).toContain('Configuration error')
  })

  test('falls back to error message for unknown codes', () => {
    const err = new TokensError('custom message', 'UNKNOWN_CODE')
    expect(getUserFriendlyMessage(err)).toBe('custom message')
  })
})

describe('ERROR_CODES', () => {
  test('has all expected error codes', () => {
    const codes = Object.keys(ERROR_CODES)
    expect(codes).toContain('INSUFFICIENT_BALANCE')
    expect(codes).toContain('INVALID_ADDRESS')
    expect(codes).toContain('AUTHORITY_ERROR')
    expect(codes).toContain('TRANSACTION_ERROR')
    expect(codes).toContain('RPC_ERROR')
    expect(codes).toContain('VALIDATION_ERROR')
    expect(codes).toContain('CONFIG_ERROR')
    expect(codes).toContain('NETWORK_ERROR')
  })

  test('each code entry has code, description, and resolution', () => {
    for (const entry of Object.values(ERROR_CODES)) {
      expect(entry).toHaveProperty('code')
      expect(entry).toHaveProperty('description')
      expect(entry).toHaveProperty('resolution')
    }
  })
})
