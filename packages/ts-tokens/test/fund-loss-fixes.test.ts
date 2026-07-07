/**
 * Regression tests for the fund-loss fixes.
 *
 * These cover behaviour that previously either moved funds incorrectly or
 * fabricated success:
 *  - markPrimarySale produced malformed borsh (would always fail on-chain)
 *  - offers now carry escrow state through serialization
 *  - Marinade "staking" and treasury creation now refuse rather than
 *    donating/locking funds
 *  - SOL-settled marketplace flows reject SPL-priced records
 */

import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import { markPrimarySale, getMetadataAddress } from '../src/marketplace/royalties'
import { serializeOffer, deserializeOffer } from '../src/marketplace/store'
import { buildStakeTransaction } from '../src/defi/marinade'
import { createTreasury } from '../src/treasury/create'
import { createAuction } from '../src/marketplace/auction'
import { createMockConnection, createTestConfig } from './helpers/mock-connection'
import type { LocalOffer } from '../src/marketplace/types'

describe('markPrimarySale byte layout', () => {
  test('produces the exact 6-byte UpdateMetadataAccountV2 payload', async () => {
    const mint = Keypair.generate().publicKey
    const updateAuthority = Keypair.generate().publicKey

    const ix = await markPrimarySale(mint, updateAuthority, createTestConfig())

    // [disc=15, data:None, update_authority:None, primary_sale:Some, value:true, is_mutable:None]
    expect([...ix.data]).toEqual([15, 0, 0, 1, 1, 0])
  })

  test('targets the metadata PDA (writable) and the update authority (signer)', async () => {
    const mint = Keypair.generate().publicKey
    const updateAuthority = Keypair.generate().publicKey

    const ix = await markPrimarySale(mint, updateAuthority, createTestConfig())

    expect(ix.keys[0].pubkey.toBase58()).toBe(getMetadataAddress(mint).toBase58())
    expect(ix.keys[0].isWritable).toBe(true)
    expect(ix.keys[1].pubkey.toBase58()).toBe(updateAuthority.toBase58())
    expect(ix.keys[1].isSigner).toBe(true)
  })
})

describe('offer escrow serialization', () => {
  test('round-trips the escrow account and persists the escrow secret', () => {
    const offer: LocalOffer = {
      id: 'offer-1',
      mint: Keypair.generate().publicKey,
      bidder: Keypair.generate().publicKey,
      price: 500_000_000n,
      currency: 'SOL',
      escrowAccount: Keypair.generate().publicKey,
      createdAt: Date.now(),
      status: 'active',
    }

    const serialized = serializeOffer(offer, 'base64-secret')
    expect(serialized.escrowAccount).toBe(offer.escrowAccount!.toBase58())
    expect(serialized.escrowSecret).toBe('base64-secret')

    const deserialized = deserializeOffer(serialized)
    expect(deserialized.escrowAccount?.toBase58()).toBe(offer.escrowAccount!.toBase58())
  })
})

describe('refusing to move funds when settlement cannot be done safely', () => {
  test('buildStakeTransaction throws instead of donating SOL to the Marinade state', async () => {
    const connection = createMockConnection()
    const owner = Keypair.generate().publicKey
    await expect(
      buildStakeTransaction(connection, owner, 1_000_000_000n)
    ).rejects.toThrow(/not implemented/i)
  })

  test('createTreasury throws instead of returning a throwaway locked address', async () => {
    const connection = createMockConnection()
    const payer = Keypair.generate().publicKey
    await expect(
      createTreasury(connection, payer, { dao: Keypair.generate().publicKey })
    ).rejects.toThrow(/not implemented/i)
  })

  test('createAuction rejects SPL-denominated auctions (would settle as SOL)', async () => {
    await expect(
      createAuction(
        {
          mint: Keypair.generate().publicKey,
          type: 'english',
          startPrice: 1_000_000_000n,
          duration: 86_400_000,
          currency: 'SPL',
        },
        createTestConfig()
      )
    ).rejects.toThrow(/only sol/i)
  })
})
