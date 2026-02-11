import { describe, test, expect, beforeEach } from 'bun:test'
import {
  getRpcUrl,
  clearConnectionPool,
  createConnection,
  getConnection,
} from '../src/drivers/solana/connection'
import { createTestConfig } from './helpers'

beforeEach(() => {
  clearConnectionPool()
})

describe('getRpcUrl', () => {
  test('returns devnet URL by default', () => {
    expect(getRpcUrl('devnet')).toBe('https://api.devnet.solana.com')
  })

  test('returns mainnet URL', () => {
    expect(getRpcUrl('mainnet-beta')).toBe('https://api.mainnet-beta.solana.com')
  })

  test('returns testnet URL', () => {
    expect(getRpcUrl('testnet')).toBe('https://api.testnet.solana.com')
  })

  test('returns localnet URL', () => {
    expect(getRpcUrl('localnet')).toBe('http://localhost:8899')
  })

  test('returns custom URL when provided', () => {
    expect(getRpcUrl('devnet', 'https://my-rpc.io')).toBe('https://my-rpc.io')
  })
})

describe('clearConnectionPool', () => {
  test('clears pool without error', () => {
    clearConnectionPool()
    // no throw = success
  })
})

describe('createConnection', () => {
  test('creates a connection from config', () => {
    const config = createTestConfig({ rpcUrl: 'https://api.devnet.solana.com' })
    const conn = createConnection(config)
    expect(conn).toBeDefined()
    expect(conn.rpcEndpoint).toBe('https://api.devnet.solana.com')
  })

  test('returns same connection for same config (pooling)', () => {
    const config = createTestConfig({ rpcUrl: 'https://api.devnet.solana.com' })
    const conn1 = createConnection(config)
    const conn2 = createConnection(config)
    expect(conn1).toBe(conn2) // same reference from pool
  })

  test('returns different connections for different URLs', () => {
    const config1 = createTestConfig({ rpcUrl: 'https://api.devnet.solana.com' })
    const config2 = createTestConfig({ rpcUrl: 'https://api.testnet.solana.com' })
    const conn1 = createConnection(config1)
    const conn2 = createConnection(config2)
    expect(conn1).not.toBe(conn2)
  })
})

describe('getConnection', () => {
  test('delegates to createConnection', () => {
    const config = createTestConfig({ rpcUrl: 'https://api.devnet.solana.com' })
    const conn = getConnection(config)
    expect(conn).toBeDefined()
    expect(conn.rpcEndpoint).toBe('https://api.devnet.solana.com')
  })
})
