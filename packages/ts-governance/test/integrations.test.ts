/**
 * Governance Integration Tests
 *
 * The staking / NFT-membership integrations previously returned fabricated
 * zeros (staked power 0n, nftCount 0) presented as real data. They now fail
 * honestly with descriptive not-implemented errors.
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import {
  getStakedVotingPower,
  isStaked,
  getStakeEntryAge,
} from '../src/integrations/staking'
import {
  getNFTCollectionMembership,
  isCollectionMember,
  getNFTVotingPower,
} from '../src/integrations/nft-membership'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = {} as any
const voter = Keypair.generate().publicKey
const pool = Keypair.generate().publicKey
const collection = Keypair.generate().publicKey

describe('staking integration (honest failure)', () => {
  test('getStakedVotingPower throws instead of returning 0n', async () => {
    await expect(getStakedVotingPower(connection, voter, pool)).rejects.toThrow(/not implemented/i)
  })

  test('getStakeEntryAge throws instead of returning 0n', async () => {
    await expect(getStakeEntryAge(connection, voter, pool)).rejects.toThrow(/not implemented/i)
  })

  test('isStaked propagates the failure instead of returning false', async () => {
    await expect(isStaked(connection, voter, pool)).rejects.toThrow(/not implemented/i)
  })
})

describe('NFT membership integration (honest failure)', () => {
  test('getNFTCollectionMembership throws instead of returning nftCount 0', async () => {
    await expect(getNFTCollectionMembership(connection, voter, collection)).rejects.toThrow(/not implemented/i)
  })

  test('isCollectionMember propagates the failure instead of returning false', async () => {
    await expect(isCollectionMember(connection, voter, collection)).rejects.toThrow(/not implemented/i)
  })

  test('getNFTVotingPower propagates the failure instead of returning 0n', async () => {
    await expect(getNFTVotingPower(connection, voter, collection)).rejects.toThrow(/not implemented/i)
  })
})
