/**
 * Staking Instruction Builders
 *
 * Raw TransactionInstruction builders for all staking operations.
 */

import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  STAKING_PROGRAM_ID,
  DISCRIMINATORS,
  serializeCreatePoolData,
  serializeUpdatePoolData,
  serializeStakeData,
  serializeUnstakeData,
  serializeFundRewardsData,
  serializeWithdrawRewardsData,
  serializeCreateNFTPoolData,
  serializeLiquidStakeData,
  serializeLiquidUnstakeData,
} from './program'

const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111')

// ---------------------------------------------------------------------------
// Pool Management Instructions (7)
// ---------------------------------------------------------------------------

export function createCreatePoolInstruction(
  authority: PublicKey,
  pool: PublicKey,
  stakeMint: PublicKey,
  rewardMint: PublicKey,
  stakeVault: PublicKey,
  rewardVault: PublicKey,
  rewardRate: bigint,
  rewardDuration: bigint,
  minStakeDuration: bigint,
  earlyUnstakePenalty: number
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: stakeMint, isSigner: false, isWritable: false },
      { pubkey: rewardMint, isSigner: false, isWritable: false },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeCreatePoolData(rewardRate, rewardDuration, minStakeDuration, earlyUnstakePenalty),
  }
}

export function createUpdatePoolInstruction(
  authority: PublicKey,
  pool: PublicKey,
  rewardRate: bigint | null,
  rewardDuration: bigint | null,
  minStakeDuration: bigint | null,
  earlyUnstakePenalty: number | null
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeUpdatePoolData(rewardRate, rewardDuration, minStakeDuration, earlyUnstakePenalty),
  }
}

export function createPausePoolInstruction(
  authority: PublicKey,
  pool: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.pausePool),
  }
}

export function createResumePoolInstruction(
  authority: PublicKey,
  pool: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.resumePool),
  }
}

export function createFundRewardsInstruction(
  authority: PublicKey,
  pool: PublicKey,
  rewardVault: PublicKey,
  authorityTokenAccount: PublicKey,
  amount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: authorityTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeFundRewardsData(amount),
  }
}

export function createWithdrawRewardsInstruction(
  authority: PublicKey,
  pool: PublicKey,
  rewardVault: PublicKey,
  authorityTokenAccount: PublicKey,
  amount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: authorityTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeWithdrawRewardsData(amount),
  }
}

export function createClosePoolInstruction(
  authority: PublicKey,
  pool: PublicKey,
  stakeVault: PublicKey,
  rewardVault: PublicKey,
  destination: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.closePool),
  }
}

// ---------------------------------------------------------------------------
// User Staking Instructions (5)
// ---------------------------------------------------------------------------

export function createStakeInstruction(
  owner: PublicKey,
  pool: PublicKey,
  stakeEntry: PublicKey,
  stakeVault: PublicKey,
  ownerTokenAccount: PublicKey,
  amount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: stakeEntry, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeStakeData(amount),
  }
}

export function createUnstakeInstruction(
  owner: PublicKey,
  pool: PublicKey,
  stakeEntry: PublicKey,
  stakeVault: PublicKey,
  ownerTokenAccount: PublicKey,
  amount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: stakeEntry, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeUnstakeData(amount),
  }
}

export function createClaimRewardsInstruction(
  owner: PublicKey,
  pool: PublicKey,
  stakeEntry: PublicKey,
  rewardVault: PublicKey,
  ownerRewardAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: stakeEntry, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: ownerRewardAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.claimRewards),
  }
}

export function createCompoundRewardsInstruction(
  owner: PublicKey,
  pool: PublicKey,
  stakeEntry: PublicKey,
  rewardVault: PublicKey,
  stakeVault: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: stakeEntry, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.compoundRewards),
  }
}

export function createEmergencyUnstakeInstruction(
  owner: PublicKey,
  pool: PublicKey,
  stakeEntry: PublicKey,
  stakeVault: PublicKey,
  ownerTokenAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: stakeEntry, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.emergencyUnstake),
  }
}

// ---------------------------------------------------------------------------
// NFT Staking Instructions (4)
// ---------------------------------------------------------------------------

export function createCreateNFTPoolInstruction(
  authority: PublicKey,
  nftPool: PublicKey,
  collection: PublicKey,
  rewardMint: PublicKey,
  rewardVault: PublicKey,
  pointsPerDay: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: nftPool, isSigner: false, isWritable: true },
      { pubkey: collection, isSigner: false, isWritable: false },
      { pubkey: rewardMint, isSigner: false, isWritable: false },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeCreateNFTPoolData(pointsPerDay),
  }
}

export function createStakeNFTInstruction(
  owner: PublicKey,
  nftPool: PublicKey,
  nftStakeEntry: PublicKey,
  nftMint: PublicKey,
  ownerNFTAccount: PublicKey,
  vaultNFTAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: nftPool, isSigner: false, isWritable: true },
      { pubkey: nftStakeEntry, isSigner: false, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: false },
      { pubkey: ownerNFTAccount, isSigner: false, isWritable: true },
      { pubkey: vaultNFTAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.stakeNFT),
  }
}

export function createUnstakeNFTInstruction(
  owner: PublicKey,
  nftPool: PublicKey,
  nftStakeEntry: PublicKey,
  nftMint: PublicKey,
  ownerNFTAccount: PublicKey,
  vaultNFTAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: nftPool, isSigner: false, isWritable: true },
      { pubkey: nftStakeEntry, isSigner: false, isWritable: true },
      { pubkey: nftMint, isSigner: false, isWritable: false },
      { pubkey: ownerNFTAccount, isSigner: false, isWritable: true },
      { pubkey: vaultNFTAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.unstakeNFT),
  }
}

export function createClaimNFTRewardsInstruction(
  owner: PublicKey,
  nftPool: PublicKey,
  nftStakeEntry: PublicKey,
  rewardVault: PublicKey,
  ownerRewardAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: nftPool, isSigner: false, isWritable: true },
      { pubkey: nftStakeEntry, isSigner: false, isWritable: true },
      { pubkey: rewardVault, isSigner: false, isWritable: true },
      { pubkey: ownerRewardAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.claimNFTRewards),
  }
}

// ---------------------------------------------------------------------------
// Liquid Staking Instructions (3)
// ---------------------------------------------------------------------------

export function createCreateLiquidPoolInstruction(
  authority: PublicKey,
  liquidPool: PublicKey,
  stakeMint: PublicKey,
  receiptMint: PublicKey,
  stakeVault: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: liquidPool, isSigner: false, isWritable: true },
      { pubkey: stakeMint, isSigner: false, isWritable: false },
      { pubkey: receiptMint, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.createLiquidPool),
  }
}

export function createLiquidStakeInstruction(
  owner: PublicKey,
  liquidPool: PublicKey,
  stakeVault: PublicKey,
  receiptMint: PublicKey,
  ownerStakeAccount: PublicKey,
  ownerReceiptAccount: PublicKey,
  amount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: liquidPool, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: receiptMint, isSigner: false, isWritable: true },
      { pubkey: ownerStakeAccount, isSigner: false, isWritable: true },
      { pubkey: ownerReceiptAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeLiquidStakeData(amount),
  }
}

export function createLiquidUnstakeInstruction(
  owner: PublicKey,
  liquidPool: PublicKey,
  stakeVault: PublicKey,
  receiptMint: PublicKey,
  ownerStakeAccount: PublicKey,
  ownerReceiptAccount: PublicKey,
  receiptAmount: bigint
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: liquidPool, isSigner: false, isWritable: true },
      { pubkey: stakeVault, isSigner: false, isWritable: true },
      { pubkey: receiptMint, isSigner: false, isWritable: true },
      { pubkey: ownerStakeAccount, isSigner: false, isWritable: true },
      { pubkey: ownerReceiptAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: STAKING_PROGRAM_ID,
    data: serializeLiquidUnstakeData(receiptAmount),
  }
}
