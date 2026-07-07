/**
 * Candy Machine PDA Derivation
 */

import { PublicKey } from '@solana/web3.js'

const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Find the Candy Machine authority PDA
 */
export function findCandyMachineAuthorityPda(candyMachine: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('candy_machine'), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM_ID
  )
}

/**
 * Find the Candy Guard PDA
 */
export function findCandyGuardPda(base: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('candy_guard'), base.toBuffer()],
    CANDY_GUARD_PROGRAM_ID
  )
}

/**
 * Find the Token Metadata collection delegate record PDA
 *
 * Used as `collectionDelegateRecord` in Candy Machine v2 instructions
 * (initializeV2, mintV2, setCollectionV2). The delegate is the candy
 * machine authority PDA.
 */
export function findCollectionDelegateRecordPda(
  collectionMint: PublicKey,
  collectionUpdateAuthority: PublicKey,
  delegate: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
      Buffer.from('collection_delegate'),
      collectionUpdateAuthority.toBuffer(),
      delegate.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
}

/**
 * Find the mint limit PDA for a user
 */
export function findMintLimitPda(
  id: number,
  user: PublicKey,
  candyGuard: PublicKey,
  candyMachine: PublicKey
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(1)
  idBuffer.writeUInt8(id)

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('mint_limit'),
      idBuffer,
      user.toBuffer(),
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ],
    CANDY_GUARD_PROGRAM_ID
  )
}

/**
 * Find the allocation tracker PDA
 */
export function findAllocationTrackerPda(
  id: number,
  candyGuard: PublicKey,
  candyMachine: PublicKey
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(1)
  idBuffer.writeUInt8(id)

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('allocation'),
      idBuffer,
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ],
    CANDY_GUARD_PROGRAM_ID
  )
}

/**
 * Find the freeze escrow PDA
 */
export function findFreezeEscrowPda(
  destination: PublicKey,
  candyGuard: PublicKey,
  candyMachine: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('freeze_escrow'),
      destination.toBuffer(),
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ],
    CANDY_GUARD_PROGRAM_ID
  )
}
