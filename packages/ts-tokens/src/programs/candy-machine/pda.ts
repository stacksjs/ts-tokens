/**
 * Candy Machine PDA Derivation
 */

import { PublicKey } from '@solana/web3.js'

const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')

/**
 * Find the Candy Machine authority PDA
 */
export function findCandyMachineAuthorityPda(candyMachine: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('candy_machine'), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM_ID,
  )
}

/**
 * Find the Candy Guard PDA
 */
export function findCandyGuardPda(base: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('candy_guard'), base.toBuffer()],
    CANDY_GUARD_PROGRAM_ID,
  )
}

/**
 * Find the mint limit PDA for a user
 */
export function findMintLimitPda(
  id: number,
  user: PublicKey,
  candyGuard: PublicKey,
  candyMachine: PublicKey,
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
    CANDY_GUARD_PROGRAM_ID,
  )
}

/**
 * Find the allocation tracker PDA
 */
export function findAllocationTrackerPda(
  id: number,
  candyGuard: PublicKey,
  candyMachine: PublicKey,
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
    CANDY_GUARD_PROGRAM_ID,
  )
}

/**
 * Find the freeze escrow PDA
 */
export function findFreezeEscrowPda(
  destination: PublicKey,
  candyGuard: PublicKey,
  candyMachine: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('freeze_escrow'),
      destination.toBuffer(),
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ],
    CANDY_GUARD_PROGRAM_ID,
  )
}
