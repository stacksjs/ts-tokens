/**
 * Programmable NFT Rule Function Tests
 *
 * Tests for pure rule builder, validation, formatting, and query functions
 * exported from src/pnft/rules.ts.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import {
  createRoyaltyRule,
  createAllowListRule,
  createDenyListRule,
  createCooldownRule,
  createMaxTransfersRule,
  createHolderGateRule,
  validateRule,
  formatRules,
  hasRule,
  getRule,
} from '../src/pnft/rules'
import type {
  ProgrammableNFT,
  TransferRule,
  RoyaltyEnforcementRule,
} from '../src/pnft/types'

/**
 * Helper: build a minimal ProgrammableNFT with the given rules.
 */
function makePNFT(rules: TransferRule[] = []): ProgrammableNFT {
  return {
    mint: Keypair.generate().publicKey,
    owner: Keypair.generate().publicKey,
    rules,
    state: 'unlocked',
    lastTransfer: 0,
    transferCount: 0,
    metadata: {
      name: 'Test pNFT',
      symbol: 'TPNFT',
      uri: 'https://example.com/metadata.json',
    },
  }
}

// ---------------------------------------------------------------------------
// Rule builders
// ---------------------------------------------------------------------------

describe('createRoyaltyRule', () => {
  test('returns a rule with type royalty_enforcement and enabled true', () => {
    const recipient = Keypair.generate().publicKey
    const rule = createRoyaltyRule(500, [{ address: recipient, share: 100 }])

    expect(rule.type).toBe('royalty_enforcement')
    expect(rule.enabled).toBe(true)
  })

  test('stores the correct bps value', () => {
    const rule = createRoyaltyRule(250, [
      { address: Keypair.generate().publicKey, share: 100 },
    ])

    expect(rule.royaltyBps).toBe(250)
  })

  test('stores the correct recipients with addresses and shares', () => {
    const addr1 = Keypair.generate().publicKey
    const addr2 = Keypair.generate().publicKey
    const rule = createRoyaltyRule(1000, [
      { address: addr1, share: 70 },
      { address: addr2, share: 30 },
    ])

    expect(rule.recipients).toHaveLength(2)
    expect(rule.recipients[0].address).toBe(addr1)
    expect(rule.recipients[0].share).toBe(70)
    expect(rule.recipients[1].address).toBe(addr2)
    expect(rule.recipients[1].share).toBe(30)
  })
})

describe('createAllowListRule', () => {
  test('returns a rule with type allow_list and enabled true', () => {
    const rule = createAllowListRule([Keypair.generate().publicKey])
    expect(rule.type).toBe('allow_list')
    expect(rule.enabled).toBe(true)
  })

  test('stores the provided addresses', () => {
    const addrs = [Keypair.generate().publicKey, Keypair.generate().publicKey]
    const rule = createAllowListRule(addrs)

    expect(rule.addresses).toHaveLength(2)
    expect(rule.addresses[0]).toBe(addrs[0])
    expect(rule.addresses[1]).toBe(addrs[1])
  })
})

describe('createDenyListRule', () => {
  test('returns a rule with type deny_list and enabled true', () => {
    const rule = createDenyListRule([Keypair.generate().publicKey])
    expect(rule.type).toBe('deny_list')
    expect(rule.enabled).toBe(true)
  })

  test('stores the provided addresses', () => {
    const addrs = [
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ]
    const rule = createDenyListRule(addrs)

    expect(rule.addresses).toHaveLength(3)
    expect(rule.addresses).toEqual(addrs)
  })
})

describe('createCooldownRule', () => {
  test('returns a rule with type cooldown_period and enabled true', () => {
    const rule = createCooldownRule(3600)
    expect(rule.type).toBe('cooldown_period')
    expect(rule.enabled).toBe(true)
  })

  test('stores the correct periodSeconds value', () => {
    const rule = createCooldownRule(86400)
    expect(rule.periodSeconds).toBe(86400)
  })
})

describe('createMaxTransfersRule', () => {
  test('returns a rule with type max_transfers and enabled true', () => {
    const rule = createMaxTransfersRule(10)
    expect(rule.type).toBe('max_transfers')
    expect(rule.enabled).toBe(true)
  })

  test('stores the correct maxTransfers value', () => {
    const rule = createMaxTransfersRule(5)
    expect(rule.maxTransfers).toBe(5)
  })
})

describe('createHolderGateRule', () => {
  test('returns a rule with type holder_gate and enabled true', () => {
    const token = Keypair.generate().publicKey
    const rule = createHolderGateRule(token, 1n)
    expect(rule.type).toBe('holder_gate')
    expect(rule.enabled).toBe(true)
  })

  test('stores the correct requiredToken and minAmount', () => {
    const token = Keypair.generate().publicKey
    const rule = createHolderGateRule(token, 1_000_000n)

    expect(rule.requiredToken).toBe(token)
    expect(rule.minAmount).toBe(1_000_000n)
  })
})

// ---------------------------------------------------------------------------
// validateRule
// ---------------------------------------------------------------------------

describe('validateRule', () => {
  test('valid royalty rule passes validation', () => {
    const rule = createRoyaltyRule(500, [
      { address: Keypair.generate().publicKey, share: 60 },
      { address: Keypair.generate().publicKey, share: 40 },
    ])
    const result = validateRule(rule)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('royalty bps below 0 produces an error', () => {
    const rule = createRoyaltyRule(-1, [
      { address: Keypair.generate().publicKey, share: 100 },
    ])
    const result = validateRule(rule)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors.some(e => /bps/i.test(e) || /royalty/i.test(e))).toBe(true)
  })

  test('royalty bps above 10000 produces an error', () => {
    const rule = createRoyaltyRule(10001, [
      { address: Keypair.generate().publicKey, share: 100 },
    ])
    const result = validateRule(rule)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /royalty/i.test(e) || /10000/i.test(e))).toBe(true)
  })

  test('royalty recipient shares not summing to 100 produces an error', () => {
    const rule = createRoyaltyRule(500, [
      { address: Keypair.generate().publicKey, share: 50 },
      { address: Keypair.generate().publicKey, share: 30 },
    ])
    const result = validateRule(rule)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /share/i.test(e) || /100/i.test(e))).toBe(true)
  })

  test('cooldown with 0 seconds produces an error', () => {
    const rule = createCooldownRule(0)
    const result = validateRule(rule)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /cooldown/i.test(e) || /positive/i.test(e))).toBe(true)
  })

  test('max_transfers with 0 produces an error', () => {
    const rule = createMaxTransfersRule(0)
    const result = validateRule(rule)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /transfer/i.test(e) || /positive/i.test(e))).toBe(true)
  })

  test('empty allow list produces an error', () => {
    const rule = createAllowListRule([])
    const result = validateRule(rule)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /empty/i.test(e) || /address/i.test(e))).toBe(true)
  })

  test('empty deny list produces an error', () => {
    const rule = createDenyListRule([])
    const result = validateRule(rule)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /empty/i.test(e) || /address/i.test(e))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// formatRules
// ---------------------------------------------------------------------------

describe('formatRules', () => {
  test('returns a string containing rule info for each rule', () => {
    const rules: TransferRule[] = [
      createRoyaltyRule(500, [
        { address: Keypair.generate().publicKey, share: 100 },
      ]),
      createCooldownRule(3600),
      createMaxTransfersRule(10),
    ]
    const output = formatRules(rules)

    expect(typeof output).toBe('string')
    expect(output).toContain('Royalty')
    expect(output).toContain('Cooldown')
    expect(output).toContain('Max Transfers')
  })

  test('includes enabled marker for enabled rules and disabled marker for disabled', () => {
    const enabledRule = createCooldownRule(60)
    const disabledRule = createMaxTransfersRule(5)
    disabledRule.enabled = false

    const output = formatRules([enabledRule, disabledRule])

    // The implementation uses unicode check/cross marks for status
    const lines = output.split('\n')
    // Enabled line should not share the same marker as disabled line
    expect(lines).toHaveLength(2)
    expect(lines[0]).not.toEqual(lines[1].replace(/Max Transfers.*/, 'Cooldown.*'))
    // More concretely, verify the markers differ
    const enabledMarker = lines[0].charAt(0)
    const disabledMarker = lines[1].charAt(0)
    expect(enabledMarker).not.toBe(disabledMarker)
  })

  test('returns empty string for an empty rules array', () => {
    const output = formatRules([])
    expect(output).toBe('')
  })
})

// ---------------------------------------------------------------------------
// hasRule
// ---------------------------------------------------------------------------

describe('hasRule', () => {
  test('returns true when an enabled rule of the given type exists', () => {
    const pnft = makePNFT([createCooldownRule(3600)])
    expect(hasRule(pnft, 'cooldown_period')).toBe(true)
  })

  test('returns false when no rule of the given type exists', () => {
    const pnft = makePNFT([createCooldownRule(3600)])
    expect(hasRule(pnft, 'max_transfers')).toBe(false)
  })

  test('returns false when the rule exists but is disabled', () => {
    const rule = createCooldownRule(3600)
    rule.enabled = false
    const pnft = makePNFT([rule])

    expect(hasRule(pnft, 'cooldown_period')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getRule
// ---------------------------------------------------------------------------

describe('getRule', () => {
  test('returns the rule when it exists', () => {
    const royaltyRule = createRoyaltyRule(500, [
      { address: Keypair.generate().publicKey, share: 100 },
    ])
    const pnft = makePNFT([royaltyRule])
    const found = getRule<RoyaltyEnforcementRule>(pnft, 'royalty_enforcement')

    expect(found).toBeDefined()
    expect(found!.royaltyBps).toBe(500)
  })

  test('returns undefined when the rule type is not present', () => {
    const pnft = makePNFT([createCooldownRule(3600)])
    const found = getRule<RoyaltyEnforcementRule>(pnft, 'royalty_enforcement')

    expect(found).toBeUndefined()
  })

  test('returns the rule even if it is disabled', () => {
    const rule = createMaxTransfersRule(10)
    rule.enabled = false
    const pnft = makePNFT([rule])

    const found = getRule(pnft, 'max_transfers')
    expect(found).toBeDefined()
    expect(found!.enabled).toBe(false)
  })
})
