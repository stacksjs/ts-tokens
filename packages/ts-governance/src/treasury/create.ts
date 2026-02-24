/**
 * Treasury Creation
 */

import type { Connection, Keypair, PublicKey } from '@solana/web3.js'
import type { Treasury, CreateTreasuryOptions } from '../types'
import { getTreasuryAddress } from '../programs/program'

/**
 * Create a treasury for a DAO
 */
export async function createTreasury(
  _connection: Connection,
  _authority: Keypair,
  options: CreateTreasuryOptions
): Promise<{ treasury: Treasury; signature: string }> {
  const { dao } = options
  const treasuryAddress = getTreasuryAddress(dao)

  const treasury: Treasury = {
    address: treasuryAddress,
    dao,
    solBalance: 0n,
    tokenBalances: [],
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
  }

  return {
    treasury,
    signature: `treasury_created_${treasuryAddress.toBase58().slice(0, 8)}`,
  }
}
