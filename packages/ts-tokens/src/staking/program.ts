/**
 * Staking Program Constants & PDA Helpers
 *
 * Program ID, PDA derivation, instruction discriminators, and data serializers.
 */

import { PublicKey } from '@solana/web3.js'

/**
 * Staking program ID (placeholder — program deployment deferred)
 */
export const STAKING_PROGRAM_ID = new PublicKey('StakeProgram1111111111111111111111111111111')

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

export function getPoolAddress(authority: PublicKey, stakeMint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), authority.toBuffer(), stakeMint.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

export function getStakeEntryAddress(pool: PublicKey, owner: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('stake'), pool.toBuffer(), owner.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

export function getRewardVaultAddress(pool: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_vault'), pool.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

export function getStakeVaultAddress(pool: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('stake_vault'), pool.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

export function getNFTPoolAddress(authority: PublicKey, collection: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('nft_pool'), authority.toBuffer(), collection.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

export function getNFTStakeEntryAddress(nftPool: PublicKey, mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('nft_stake'), nftPool.toBuffer(), mint.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

export function getLiquidPoolAddress(authority: PublicKey, stakeMint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('liquid_pool'), authority.toBuffer(), stakeMint.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

export function getReceiptMintAddress(liquidPool: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('receipt_mint'), liquidPool.toBuffer()],
    STAKING_PROGRAM_ID
  )
  return address
}

// ---------------------------------------------------------------------------
// Instruction discriminators (8-byte constants, incremental)
// ---------------------------------------------------------------------------

export const DISCRIMINATORS = {
  createPool:           Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
  updatePool:           Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
  pausePool:            Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]),
  resumePool:           Buffer.from([3, 0, 0, 0, 0, 0, 0, 0]),
  fundRewards:          Buffer.from([4, 0, 0, 0, 0, 0, 0, 0]),
  withdrawRewards:      Buffer.from([5, 0, 0, 0, 0, 0, 0, 0]),
  closePool:            Buffer.from([6, 0, 0, 0, 0, 0, 0, 0]),
  stake:                Buffer.from([7, 0, 0, 0, 0, 0, 0, 0]),
  unstake:              Buffer.from([8, 0, 0, 0, 0, 0, 0, 0]),
  claimRewards:         Buffer.from([9, 0, 0, 0, 0, 0, 0, 0]),
  compoundRewards:      Buffer.from([10, 0, 0, 0, 0, 0, 0, 0]),
  emergencyUnstake:     Buffer.from([11, 0, 0, 0, 0, 0, 0, 0]),
  createNFTPool:        Buffer.from([12, 0, 0, 0, 0, 0, 0, 0]),
  stakeNFT:             Buffer.from([13, 0, 0, 0, 0, 0, 0, 0]),
  unstakeNFT:           Buffer.from([14, 0, 0, 0, 0, 0, 0, 0]),
  claimNFTRewards:      Buffer.from([15, 0, 0, 0, 0, 0, 0, 0]),
  createLiquidPool:     Buffer.from([16, 0, 0, 0, 0, 0, 0, 0]),
  liquidStake:          Buffer.from([17, 0, 0, 0, 0, 0, 0, 0]),
  liquidUnstake:        Buffer.from([18, 0, 0, 0, 0, 0, 0, 0]),
} as const

// ---------------------------------------------------------------------------
// Data serializers
// ---------------------------------------------------------------------------

export function serializeCreatePoolData(
  rewardRate: bigint,
  rewardDuration: bigint,
  minStakeDuration: bigint,
  earlyUnstakePenalty: number
): Buffer {
  const buffer = Buffer.alloc(8 + 8 + 8 + 8 + 2)
  let offset = 0
  DISCRIMINATORS.createPool.copy(buffer, offset); offset += 8
  buffer.writeBigUInt64LE(rewardRate, offset); offset += 8
  buffer.writeBigUInt64LE(rewardDuration, offset); offset += 8
  buffer.writeBigUInt64LE(minStakeDuration, offset); offset += 8
  buffer.writeUInt16LE(earlyUnstakePenalty, offset)
  return buffer
}

export function serializeUpdatePoolData(
  rewardRate: bigint | null,
  rewardDuration: bigint | null,
  minStakeDuration: bigint | null,
  earlyUnstakePenalty: number | null
): Buffer {
  const buffer = Buffer.alloc(8 + (1 + 8) * 3 + (1 + 2))
  let offset = 0
  DISCRIMINATORS.updatePool.copy(buffer, offset); offset += 8

  // Option<u64> rewardRate
  if (rewardRate !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeBigUInt64LE(rewardRate, offset); offset += 8
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  // Option<u64> rewardDuration
  if (rewardDuration !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeBigUInt64LE(rewardDuration, offset); offset += 8
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  // Option<u64> minStakeDuration
  if (minStakeDuration !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeBigUInt64LE(minStakeDuration, offset); offset += 8
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  // Option<u16> earlyUnstakePenalty
  if (earlyUnstakePenalty !== null) {
    buffer.writeUInt8(1, offset); offset += 1
    buffer.writeUInt16LE(earlyUnstakePenalty, offset); offset += 2
  } else {
    buffer.writeUInt8(0, offset); offset += 1
  }

  return buffer.subarray(0, offset)
}

export function serializeStakeData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.stake.copy(buffer, 0)
  buffer.writeBigUInt64LE(amount, 8)
  return buffer
}

export function serializeUnstakeData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.unstake.copy(buffer, 0)
  buffer.writeBigUInt64LE(amount, 8)
  return buffer
}

export function serializeFundRewardsData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.fundRewards.copy(buffer, 0)
  buffer.writeBigUInt64LE(amount, 8)
  return buffer
}

export function serializeWithdrawRewardsData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.withdrawRewards.copy(buffer, 0)
  buffer.writeBigUInt64LE(amount, 8)
  return buffer
}

export function serializeCreateNFTPoolData(pointsPerDay: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.createNFTPool.copy(buffer, 0)
  buffer.writeBigUInt64LE(pointsPerDay, 8)
  return buffer
}

export function serializeLiquidStakeData(amount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.liquidStake.copy(buffer, 0)
  buffer.writeBigUInt64LE(amount, 8)
  return buffer
}

export function serializeLiquidUnstakeData(receiptAmount: bigint): Buffer {
  const buffer = Buffer.alloc(8 + 8)
  DISCRIMINATORS.liquidUnstake.copy(buffer, 0)
  buffer.writeBigUInt64LE(receiptAmount, 8)
  return buffer
}
