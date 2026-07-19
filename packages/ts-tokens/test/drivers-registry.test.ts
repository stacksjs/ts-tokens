/**
 * Driver Registry Tests
 *
 * The module-level registry must have the Solana driver registered at init,
 * and createDriverRegistry() instances must be independent of each other and
 * of the module-level registry.
 */

import { describe, test, expect } from 'bun:test'
import {
  getDriver,
  hasDriver,
  listDrivers,
  registerDriver,
  autoDetectDriver,
  createDriverRegistry,
  driverRegistry,
} from '../src/drivers'
import { SolanaDriver } from '../src/drivers/solana/driver'
import { mergeConfig } from '../src/config'
import type { ChainDriver } from '../src/types'

describe('module-level driver registry', () => {
  test('solana driver is registered at module init', () => {
    expect(hasDriver('solana')).toBe(true)
    expect(listDrivers()).toContain('solana')
  })

  test('getDriver("solana") returns a working SolanaDriver', () => {
    const config = mergeConfig({})
    const driver = getDriver('solana', config)
    expect(driver).toBeInstanceOf(SolanaDriver)
    expect(driver.name).toBe('solana')
    expect(driver.config).toBe(config)
    expect(driver.isConnected()).toBe(false)
  })

  test('autoDetectDriver resolves the configured chain', () => {
    const driver = autoDetectDriver(mergeConfig({}))
    expect(driver.name).toBe('solana')
  })

  test('driver exposes the ChainDriver surface', () => {
    const driver: ChainDriver = getDriver('solana', mergeConfig({}))
    for (const method of [
      'connect', 'disconnect', 'getConnection', 'isConnected',
      'getBalance', 'getTokenBalance', 'getTokenAccounts',
      'createToken', 'mintTokens', 'transferTokens', 'burnTokens',
      'getTokenInfo', 'setAuthority',
      'createCollection', 'mintNFT', 'transferNFT', 'burnNFT',
      'getNFTInfo', 'getCollectionInfo', 'getNFTsByOwner',
      'getNFTsByCollection', 'verifyCollection',
      'simulateTransaction', 'getTransactionStatus', 'requestAirdrop',
    ] as const) {
      expect(typeof driver[method]).toBe('function')
    }
  })

  test('getDriver throws a descriptive error for unknown chains', () => {
    expect(() => getDriver('ethereum' as any, mergeConfig({}))).toThrow('No driver registered for chain "ethereum"')
  })

  test('the default driverRegistry also has solana', () => {
    expect(driverRegistry.has('solana')).toBe(true)
    expect(driverRegistry.get('solana', mergeConfig({})).name).toBe('solana')
  })
})

describe('createDriverRegistry independence', () => {
  test('fresh registries start empty (independent of the module registry)', () => {
    const registry = createDriverRegistry()
    expect(registry.has('solana')).toBe(false)
    expect(registry.list()).toEqual([])
  })

  test('registering in one instance does not affect others or the module registry', () => {
    const a = createDriverRegistry()
    const b = createDriverRegistry()
    const factory = () => ({ name: 'fake' } as unknown as ChainDriver)

    a.register('fakechain', factory)

    expect(a.has('fakechain')).toBe(true)
    expect(b.has('fakechain')).toBe(false)
    expect(hasDriver('fakechain' as any)).toBe(false)
    expect(driverRegistry.has('fakechain')).toBe(false)
  })

  test('module-level registerDriver does not leak into fresh instances', () => {
    registerDriver('testchain' as any, () => ({ name: 'testchain' } as unknown as ChainDriver))
    expect(hasDriver('testchain' as any)).toBe(true)

    const fresh = createDriverRegistry()
    expect(fresh.has('testchain')).toBe(false)
  })
})
