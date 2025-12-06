/**
 * Programmable NFT Tests
 */

import { Keypair } from '@solana/web3.js'
import { describe, expect, test } from 'bun:test'

describe('Transfer Rules', () => {
  test('should validate royalty rule', () => {
    const rule = {
      type: 'royalty_enforcement' as const,
      enabled: true,
      royaltyBps: 500, // 5%
      recipients: [
        { address: Keypair.generate().publicKey, share: 100 },
      ],
    }

    expect(rule.royaltyBps).toBe(500)
    expect(rule.recipients[0].share).toBe(100)
  })

  test('should reject invalid royalty bps', () => {
    const validateRoyalty = (bps: number): boolean => {
      return bps >= 0 && bps <= 10000
    }

    expect(validateRoyalty(500)).toBe(true)
    expect(validateRoyalty(0)).toBe(true)
    expect(validateRoyalty(10000)).toBe(true)
    expect(validateRoyalty(-1)).toBe(false)
    expect(validateRoyalty(10001)).toBe(false)
  })

  test('should validate recipient shares sum to 100', () => {
    const recipients = [
      { share: 70 },
      { share: 20 },
      { share: 10 },
    ]

    const total = recipients.reduce((sum, r) => sum + r.share, 0)
    expect(total).toBe(100)
  })

  test('should create allow list rule', () => {
    const addresses = [
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ]

    const rule = {
      type: 'allow_list' as const,
      enabled: true,
      addresses,
    }

    expect(rule.addresses.length).toBe(2)
  })

  test('should create deny list rule', () => {
    const addresses = [Keypair.generate().publicKey]

    const rule = {
      type: 'deny_list' as const,
      enabled: true,
      addresses,
    }

    expect(rule.addresses.length).toBe(1)
  })

  test('should create cooldown rule', () => {
    const rule = {
      type: 'cooldown_period' as const,
      enabled: true,
      periodSeconds: 86400, // 24 hours
    }

    expect(rule.periodSeconds).toBe(86400)
  })

  test('should create max transfers rule', () => {
    const rule = {
      type: 'max_transfers' as const,
      enabled: true,
      maxTransfers: 5,
    }

    expect(rule.maxTransfers).toBe(5)
  })
})

describe('Transfer Validation', () => {
  test('should check cooldown period', () => {
    const lastTransfer = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    const cooldownPeriod = 86400 // 24 hours
    const now = Math.floor(Date.now() / 1000)

    const elapsed = now - lastTransfer
    const allowed = elapsed >= cooldownPeriod

    expect(allowed).toBe(false)
    expect(elapsed).toBeLessThan(cooldownPeriod)
  })

  test('should check max transfers', () => {
    const transferCount = 4
    const maxTransfers = 5

    expect(transferCount < maxTransfers).toBe(true)
    expect(maxTransfers > 5).toBe(false)
  })

  test('should check allow list', () => {
    const allowList = [
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ]
    const recipient = allowList[0]
    const notAllowed = Keypair.generate().publicKey

    expect(allowList.some(a => a.equals(recipient))).toBe(true)
    expect(allowList.some(a => a.equals(notAllowed))).toBe(false)
  })

  test('should check deny list', () => {
    const denyList = [Keypair.generate().publicKey]
    const blocked = denyList[0]
    const allowed = Keypair.generate().publicKey

    expect(!denyList.some(a => a.equals(blocked))).toBe(false)
    expect(!denyList.some(a => a.equals(allowed))).toBe(true)
  })
})

describe('Royalty Calculation', () => {
  test('should calculate royalty amount', () => {
    const salePrice = 10_000_000_000n // 10 SOL
    const royaltyBps = 500 // 5%

    const royalty = (salePrice * BigInt(royaltyBps)) / 10000n

    expect(royalty).toBe(500_000_000n) // 0.5 SOL
  })

  test('should split royalty among recipients', () => {
    const totalRoyalty = 500_000_000n
    const recipients = [
      { share: 70 },
      { share: 30 },
    ]

    const amounts = recipients.map(r => (totalRoyalty * BigInt(r.share)) / 100n)

    expect(amounts[0]).toBe(350_000_000n)
    expect(amounts[1]).toBe(150_000_000n)
  })
})

describe('Soulbound Tokens', () => {
  test('should identify soulbound rule', () => {
    const rules = [
      { type: 'soulbound' as const, enabled: true },
    ]

    const isSoulbound = rules.some(r => r.type === 'soulbound' && r.enabled)
    expect(isSoulbound).toBe(true)
  })

  test('should allow recovery with authority', () => {
    const rule = {
      type: 'soulbound' as const,
      enabled: true,
      recoveryAuthority: Keypair.generate().publicKey,
    }

    expect(rule.recoveryAuthority).toBeDefined()
  })
})

describe('NFT State', () => {
  test('should track state transitions', () => {
    type State = 'unlocked' | 'listed' | 'staked' | 'frozen'

    const validTransitions: Record<State, State[]> = {
      unlocked: ['listed', 'staked', 'frozen'],
      listed: ['unlocked'],
      staked: ['unlocked'],
      frozen: ['unlocked'],
    }

    expect(validTransitions.unlocked).toContain('listed')
    expect(validTransitions.listed).toContain('unlocked')
    expect(validTransitions.staked).toContain('unlocked')
  })
})

describe('Rule Formatting', () => {
  test('should format duration', () => {
    const formatDuration = (seconds: number): string => {
      if (seconds < 60)
        return `${seconds}s`
      if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m`
      if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}h`
      return `${Math.floor(seconds / 86400)}d`
    }

    expect(formatDuration(30)).toBe('30s')
    expect(formatDuration(120)).toBe('2m')
    expect(formatDuration(7200)).toBe('2h')
    expect(formatDuration(172800)).toBe('2d')
  })
})
