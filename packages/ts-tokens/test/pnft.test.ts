/**
 * Programmable NFT Tests
 *
 * Tests for rule builders, validation, formatting, query functions,
 * program constants, PDA derivation, instruction builders, and serializers.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
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
import {
  PNFT_PROGRAM_ID,
  DISCRIMINATORS,
  RULE_TYPE_INDEX,
  getPNFTAddress,
  getRuleSetAddress,
  serializeRuleData,
  serializeCreatePNFTData,
  serializeCreateRuleSetData,
  serializeCreateSoulboundData,
  serializeAddRuleData,
  serializeRemoveRuleData,
  serializeUpdateRuleData,
  serializeTransferPNFTData,
  serializeLockPNFTData,
} from '../src/pnft/program'
import {
  createCreatePNFTInstruction,
  createCreateRuleSetInstruction,
  createCreateSoulboundInstruction,
  createAddRuleInstruction,
  createRemoveRuleInstruction,
  createUpdateRuleInstruction,
  createFreezeRulesInstruction,
  createTransferPNFTInstruction,
  createDelegateTransferInstruction,
  createRevokeDelegateInstruction,
  createLockPNFTInstruction,
  createUnlockPNFTInstruction,
  createRecoverSoulboundInstruction,
} from '../src/pnft/instructions'
import { canTransfer, estimateRoyalty } from '../src/pnft/transfer'
import type {
  ProgrammableNFT,
  TransferRule,
  TransferRuleType,
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

// ---------------------------------------------------------------------------
// Program constants
// ---------------------------------------------------------------------------

describe('PNFT_PROGRAM_ID', () => {
  test('is a valid PublicKey (32 bytes)', () => {
    expect(PNFT_PROGRAM_ID).toBeInstanceOf(PublicKey)
    expect(PNFT_PROGRAM_ID.toBuffer()).toHaveLength(32)
  })

  test('encodes to a base58 string', () => {
    const b58 = PNFT_PROGRAM_ID.toBase58()
    expect(typeof b58).toBe('string')
    expect(b58.length).toBeGreaterThan(0)
  })
})

describe('DISCRIMINATORS', () => {
  const allDiscriminators = Object.entries(DISCRIMINATORS)

  test('has exactly 13 discriminators', () => {
    expect(allDiscriminators).toHaveLength(13)
  })

  test('each discriminator is 8 bytes', () => {
    for (const [name, disc] of allDiscriminators) {
      expect(disc).toHaveLength(8)
    }
  })

  test('all discriminators are unique', () => {
    const hexSet = new Set(allDiscriminators.map(([, d]) => Buffer.from(d).toString('hex')))
    expect(hexSet.size).toBe(13)
  })

  test('discriminators have correct first byte values', () => {
    expect(DISCRIMINATORS.createPNFT[0]).toBe(0)
    expect(DISCRIMINATORS.createRuleSet[0]).toBe(1)
    expect(DISCRIMINATORS.createSoulbound[0]).toBe(2)
    expect(DISCRIMINATORS.addRule[0]).toBe(3)
    expect(DISCRIMINATORS.removeRule[0]).toBe(4)
    expect(DISCRIMINATORS.updateRule[0]).toBe(5)
    expect(DISCRIMINATORS.freezeRules[0]).toBe(6)
    expect(DISCRIMINATORS.transferPNFT[0]).toBe(7)
    expect(DISCRIMINATORS.delegateTransfer[0]).toBe(8)
    expect(DISCRIMINATORS.revokeDelegate[0]).toBe(9)
    expect(DISCRIMINATORS.lockPNFT[0]).toBe(10)
    expect(DISCRIMINATORS.unlockPNFT[0]).toBe(11)
    expect(DISCRIMINATORS.recoverSoulbound[0]).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// RULE_TYPE_INDEX
// ---------------------------------------------------------------------------

describe('RULE_TYPE_INDEX', () => {
  test('covers all 10 rule types', () => {
    const ruleTypes: TransferRuleType[] = [
      'royalty_enforcement', 'allow_list', 'deny_list', 'program_gate',
      'holder_gate', 'creator_approval', 'cooldown_period', 'max_transfers',
      'soulbound', 'custom',
    ]
    for (const rt of ruleTypes) {
      expect(typeof RULE_TYPE_INDEX[rt]).toBe('number')
    }
  })

  test('values are 0 through 9', () => {
    const values = Object.values(RULE_TYPE_INDEX).sort((a, b) => a - b)
    expect(values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

describe('getPNFTAddress', () => {
  test('returns a PublicKey', () => {
    const mint = Keypair.generate().publicKey
    const addr = getPNFTAddress(mint)
    expect(addr).toBeInstanceOf(PublicKey)
  })

  test('is deterministic — same mint produces same PDA', () => {
    const mint = Keypair.generate().publicKey
    const addr1 = getPNFTAddress(mint)
    const addr2 = getPNFTAddress(mint)
    expect(addr1.equals(addr2)).toBe(true)
  })

  test('different mints produce different PDAs', () => {
    const mint1 = Keypair.generate().publicKey
    const mint2 = Keypair.generate().publicKey
    const addr1 = getPNFTAddress(mint1)
    const addr2 = getPNFTAddress(mint2)
    expect(addr1.equals(addr2)).toBe(false)
  })
})

describe('getRuleSetAddress', () => {
  test('returns a PublicKey', () => {
    const authority = Keypair.generate().publicKey
    const collection = Keypair.generate().publicKey
    const addr = getRuleSetAddress(authority, collection)
    expect(addr).toBeInstanceOf(PublicKey)
  })

  test('is deterministic', () => {
    const authority = Keypair.generate().publicKey
    const collection = Keypair.generate().publicKey
    const addr1 = getRuleSetAddress(authority, collection)
    const addr2 = getRuleSetAddress(authority, collection)
    expect(addr1.equals(addr2)).toBe(true)
  })

  test('different inputs produce different PDAs', () => {
    const auth1 = Keypair.generate().publicKey
    const auth2 = Keypair.generate().publicKey
    const col = Keypair.generate().publicKey
    const addr1 = getRuleSetAddress(auth1, col)
    const addr2 = getRuleSetAddress(auth2, col)
    expect(addr1.equals(addr2)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

describe('serializeRuleData', () => {
  test('serializes a cooldown rule with correct structure', () => {
    const rule = createCooldownRule(3600)
    const buf = serializeRuleData(rule)
    // 1-byte type index + 4-byte periodSeconds
    expect(buf.length).toBe(5)
    expect(buf[0]).toBe(RULE_TYPE_INDEX.cooldown_period)
    expect(buf.readUInt32LE(1)).toBe(3600)
  })

  test('serializes a max transfers rule', () => {
    const rule = createMaxTransfersRule(42)
    const buf = serializeRuleData(rule)
    expect(buf.length).toBe(5)
    expect(buf[0]).toBe(RULE_TYPE_INDEX.max_transfers)
    expect(buf.readUInt32LE(1)).toBe(42)
  })

  test('serializes a soulbound rule without recovery authority', () => {
    const rule: TransferRule = { type: 'soulbound', enabled: true }
    const buf = serializeRuleData(rule)
    // 1-byte type + 1-byte (no recovery)
    expect(buf.length).toBe(2)
    expect(buf[0]).toBe(RULE_TYPE_INDEX.soulbound)
    expect(buf[1]).toBe(0) // no recovery authority
  })

  test('serializes a soulbound rule with recovery authority', () => {
    const recovery = Keypair.generate().publicKey
    const rule: TransferRule = { type: 'soulbound', enabled: true, recoveryAuthority: recovery }
    const buf = serializeRuleData(rule)
    // 1-byte type + 1-byte presence + 32-byte pubkey
    expect(buf.length).toBe(34)
    expect(buf[0]).toBe(RULE_TYPE_INDEX.soulbound)
    expect(buf[1]).toBe(1) // has recovery authority
  })

  test('serializes a royalty rule', () => {
    const addr = Keypair.generate().publicKey
    const rule = createRoyaltyRule(500, [{ address: addr, share: 100 }])
    const buf = serializeRuleData(rule)
    // 1-byte type + 2-byte bps + 4-byte count + 1 * (32 + 4) = 43
    expect(buf.length).toBe(43)
    expect(buf[0]).toBe(RULE_TYPE_INDEX.royalty_enforcement)
    expect(buf.readUInt16LE(1)).toBe(500)
  })

  test('serializes an allow list rule', () => {
    const addrs = [Keypair.generate().publicKey, Keypair.generate().publicKey]
    const rule = createAllowListRule(addrs)
    const buf = serializeRuleData(rule)
    // 1-byte type + 4-byte count + 2 * 32 = 69
    expect(buf.length).toBe(69)
    expect(buf[0]).toBe(RULE_TYPE_INDEX.allow_list)
    expect(buf.readUInt32LE(1)).toBe(2)
  })

  test('serializes a holder gate rule', () => {
    const token = Keypair.generate().publicKey
    const rule = createHolderGateRule(token, 1000n)
    const buf = serializeRuleData(rule)
    // 1-byte type + 32-byte pubkey + 8-byte amount = 41
    expect(buf.length).toBe(41)
    expect(buf[0]).toBe(RULE_TYPE_INDEX.holder_gate)
  })
})

describe('serializeCreatePNFTData', () => {
  test('starts with createPNFT discriminator', () => {
    const buf = serializeCreatePNFTData('Test', 'TST', 'https://example.com', Buffer.alloc(0))
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.createPNFT))
  })

  test('encodes name, symbol, uri as length-prefixed strings', () => {
    const buf = serializeCreatePNFTData('MyNFT', 'MN', 'https://uri.com', Buffer.alloc(0))
    // disc(8) + name(4+5) + symbol(4+2) + uri(4+15) + rulesLen(4) + rules(0) = 46
    expect(buf.length).toBe(46)
  })
})

describe('serializeCreateRuleSetData', () => {
  test('starts with createRuleSet discriminator', () => {
    const buf = serializeCreateRuleSetData(true, Buffer.alloc(0))
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.createRuleSet))
  })

  test('encodes isMutable flag', () => {
    const bufTrue = serializeCreateRuleSetData(true, Buffer.alloc(0))
    const bufFalse = serializeCreateRuleSetData(false, Buffer.alloc(0))
    expect(bufTrue[8]).toBe(1)
    expect(bufFalse[8]).toBe(0)
  })
})

describe('serializeCreateSoulboundData', () => {
  test('starts with createSoulbound discriminator', () => {
    const buf = serializeCreateSoulboundData('SBT', 'SBT', 'https://sbt.com')
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.createSoulbound))
  })

  test('without recovery authority has 0 presence byte', () => {
    const buf = serializeCreateSoulboundData('SBT', 'S', 'https://sbt.com')
    // last byte after strings should be 0 (no recovery)
    expect(buf[buf.length - 1]).toBe(0)
  })

  test('with recovery authority encodes 1 + 32 byte pubkey', () => {
    const recovery = Keypair.generate().publicKey
    const bufWith = serializeCreateSoulboundData('SBT', 'S', 'https://sbt.com', recovery)
    const bufWithout = serializeCreateSoulboundData('SBT', 'S', 'https://sbt.com')
    expect(bufWith.length).toBe(bufWithout.length + 32)
  })
})

describe('serializeTransferPNFTData', () => {
  test('starts with transferPNFT discriminator', () => {
    const buf = serializeTransferPNFTData(true)
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.transferPNFT))
  })

  test('encodes payRoyalty flag', () => {
    expect(serializeTransferPNFTData(true)[8]).toBe(1)
    expect(serializeTransferPNFTData(false)[8]).toBe(0)
  })

  test('is exactly 9 bytes', () => {
    expect(serializeTransferPNFTData(true).length).toBe(9)
  })
})

describe('serializeLockPNFTData', () => {
  test('starts with lockPNFT discriminator', () => {
    const buf = serializeLockPNFTData('listed')
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.lockPNFT))
  })

  test('encodes listed as 0, staked as 1', () => {
    expect(serializeLockPNFTData('listed')[8]).toBe(0)
    expect(serializeLockPNFTData('staked')[8]).toBe(1)
  })
})

describe('serializeAddRuleData / serializeRemoveRuleData / serializeUpdateRuleData', () => {
  test('serializeAddRuleData starts with addRule discriminator', () => {
    const ruleData = Buffer.from([1, 2, 3])
    const buf = serializeAddRuleData(ruleData)
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.addRule))
    expect(buf.subarray(8)).toEqual(ruleData)
  })

  test('serializeRemoveRuleData encodes rule type index', () => {
    const buf = serializeRemoveRuleData(5)
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.removeRule))
    expect(buf[8]).toBe(5)
    expect(buf.length).toBe(9)
  })

  test('serializeUpdateRuleData starts with updateRule discriminator', () => {
    const ruleData = Buffer.from([7, 8])
    const buf = serializeUpdateRuleData(ruleData)
    expect(buf.subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.updateRule))
    expect(buf.subarray(8)).toEqual(ruleData)
  })
})

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

describe('createCreatePNFTInstruction', () => {
  test('returns instruction with correct programId', () => {
    const payer = Keypair.generate().publicKey
    const pnftAccount = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const ix = createCreatePNFTInstruction(payer, pnftAccount, mint, 'Test', 'T', 'https://t.com', Buffer.alloc(0))
    expect(ix.programId.equals(PNFT_PROGRAM_ID)).toBe(true)
  })

  test('has 6 account keys', () => {
    const payer = Keypair.generate().publicKey
    const pnftAccount = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const ix = createCreatePNFTInstruction(payer, pnftAccount, mint, 'N', 'S', 'U', Buffer.alloc(0))
    expect(ix.keys).toHaveLength(6)
  })

  test('payer is signer and writable', () => {
    const payer = Keypair.generate().publicKey
    const ix = createCreatePNFTInstruction(payer, Keypair.generate().publicKey, Keypair.generate().publicKey, 'N', 'S', 'U', Buffer.alloc(0))
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.keys[0].isWritable).toBe(true)
  })

  test('data starts with createPNFT discriminator', () => {
    const ix = createCreatePNFTInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey, Keypair.generate().publicKey, 'N', 'S', 'U', Buffer.alloc(0))
    expect(Buffer.from(ix.data).subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.createPNFT))
  })
})

describe('createCreateRuleSetInstruction', () => {
  test('has 4 account keys', () => {
    const ix = createCreateRuleSetInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, true, Buffer.alloc(0)
    )
    expect(ix.keys).toHaveLength(4)
  })

  test('authority is signer and writable', () => {
    const auth = Keypair.generate().publicKey
    const ix = createCreateRuleSetInstruction(auth, Keypair.generate().publicKey, Keypair.generate().publicKey, true, Buffer.alloc(0))
    expect(ix.keys[0].pubkey.equals(auth)).toBe(true)
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.keys[0].isWritable).toBe(true)
  })
})

describe('createCreateSoulboundInstruction', () => {
  test('has 6 account keys (same as createPNFT)', () => {
    const ix = createCreateSoulboundInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, 'SBT', 'S', 'https://sbt.com'
    )
    expect(ix.keys).toHaveLength(6)
  })

  test('data starts with createSoulbound discriminator', () => {
    const ix = createCreateSoulboundInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, 'SBT', 'S', 'U'
    )
    expect(Buffer.from(ix.data).subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.createSoulbound))
  })
})

describe('createAddRuleInstruction', () => {
  test('has 2 account keys', () => {
    const ix = createAddRuleInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey, Buffer.alloc(5))
    expect(ix.keys).toHaveLength(2)
  })

  test('authority is signer, pnftAccount is writable', () => {
    const auth = Keypair.generate().publicKey
    const pnft = Keypair.generate().publicKey
    const ix = createAddRuleInstruction(auth, pnft, Buffer.alloc(5))
    expect(ix.keys[0].isSigner).toBe(true)
    expect(ix.keys[1].isWritable).toBe(true)
  })
})

describe('createRemoveRuleInstruction', () => {
  test('has 2 account keys', () => {
    const ix = createRemoveRuleInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey, 0)
    expect(ix.keys).toHaveLength(2)
  })

  test('data encodes rule type index after discriminator', () => {
    const ix = createRemoveRuleInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey, 7)
    const data = Buffer.from(ix.data)
    expect(data[8]).toBe(7)
  })
})

describe('createUpdateRuleInstruction', () => {
  test('has 2 account keys and correct programId', () => {
    const ix = createUpdateRuleInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey, Buffer.alloc(10))
    expect(ix.keys).toHaveLength(2)
    expect(ix.programId.equals(PNFT_PROGRAM_ID)).toBe(true)
  })
})

describe('createFreezeRulesInstruction', () => {
  test('has 2 account keys', () => {
    const ix = createFreezeRulesInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey)
    expect(ix.keys).toHaveLength(2)
  })

  test('data is only the discriminator (8 bytes)', () => {
    const ix = createFreezeRulesInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey)
    expect(ix.data).toHaveLength(8)
    expect(Buffer.from(ix.data)).toEqual(Buffer.from(DISCRIMINATORS.freezeRules))
  })
})

describe('createTransferPNFTInstruction', () => {
  test('has 7 account keys', () => {
    const ix = createTransferPNFTInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey, true
    )
    expect(ix.keys).toHaveLength(7)
  })

  test('owner is signer', () => {
    const owner = Keypair.generate().publicKey
    const ix = createTransferPNFTInstruction(
      owner, Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, true
    )
    expect(ix.keys[0].pubkey.equals(owner)).toBe(true)
    expect(ix.keys[0].isSigner).toBe(true)
  })

  test('data starts with transferPNFT discriminator', () => {
    const ix = createTransferPNFTInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey, false
    )
    expect(Buffer.from(ix.data).subarray(0, 8)).toEqual(Buffer.from(DISCRIMINATORS.transferPNFT))
  })
})

describe('createDelegateTransferInstruction', () => {
  test('has 3 account keys', () => {
    const ix = createDelegateTransferInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey
    )
    expect(ix.keys).toHaveLength(3)
  })

  test('data is delegateTransfer discriminator (8 bytes)', () => {
    const ix = createDelegateTransferInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey
    )
    expect(ix.data).toHaveLength(8)
  })
})

describe('createRevokeDelegateInstruction', () => {
  test('has 2 account keys', () => {
    const ix = createRevokeDelegateInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey)
    expect(ix.keys).toHaveLength(2)
  })

  test('data is revokeDelegate discriminator', () => {
    const ix = createRevokeDelegateInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey)
    expect(Buffer.from(ix.data)).toEqual(Buffer.from(DISCRIMINATORS.revokeDelegate))
  })
})

describe('createLockPNFTInstruction', () => {
  test('has 2 account keys', () => {
    const ix = createLockPNFTInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey, 'listed')
    expect(ix.keys).toHaveLength(2)
  })

  test('data is 9 bytes (discriminator + state)', () => {
    const ix = createLockPNFTInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey, 'staked')
    expect(ix.data).toHaveLength(9)
  })
})

describe('createUnlockPNFTInstruction', () => {
  test('has 2 account keys', () => {
    const ix = createUnlockPNFTInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey)
    expect(ix.keys).toHaveLength(2)
  })

  test('data is unlockPNFT discriminator', () => {
    const ix = createUnlockPNFTInstruction(Keypair.generate().publicKey, Keypair.generate().publicKey)
    expect(Buffer.from(ix.data)).toEqual(Buffer.from(DISCRIMINATORS.unlockPNFT))
  })
})

describe('createRecoverSoulboundInstruction', () => {
  test('has 6 account keys', () => {
    const ix = createRecoverSoulboundInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey
    )
    expect(ix.keys).toHaveLength(6)
  })

  test('recovery authority is signer', () => {
    const recovery = Keypair.generate().publicKey
    const ix = createRecoverSoulboundInstruction(
      recovery, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey
    )
    expect(ix.keys[0].pubkey.equals(recovery)).toBe(true)
    expect(ix.keys[0].isSigner).toBe(true)
  })

  test('data is recoverSoulbound discriminator', () => {
    const ix = createRecoverSoulboundInstruction(
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey,
      Keypair.generate().publicKey, Keypair.generate().publicKey
    )
    expect(Buffer.from(ix.data)).toEqual(Buffer.from(DISCRIMINATORS.recoverSoulbound))
  })
})

// ---------------------------------------------------------------------------
// Transfer validation (canTransfer for non-existent pNFT)
// ---------------------------------------------------------------------------

describe('canTransfer', () => {
  test('returns allowed for non-existent pNFT', async () => {
    const { Connection } = await import('@solana/web3.js')
    const connection = new Connection('https://api.devnet.solana.com')
    const mint = Keypair.generate().publicKey
    const from = Keypair.generate().publicKey
    const to = Keypair.generate().publicKey

    const result = await canTransfer(connection, mint, from, to)
    expect(result.allowed).toBe(true)
    expect(result.failedRules).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Royalty estimation (estimateRoyalty for non-existent pNFT)
// ---------------------------------------------------------------------------

describe('estimateRoyalty', () => {
  test('returns 0 for non-existent pNFT', async () => {
    const { Connection } = await import('@solana/web3.js')
    const connection = new Connection('https://api.devnet.solana.com')
    const mint = Keypair.generate().publicKey

    const result = await estimateRoyalty(connection, mint, 1000000n)
    expect(result.amount).toBe(0n)
    expect(result.recipients).toHaveLength(0)
  })
})
