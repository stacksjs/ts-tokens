/**
 * Multisig Admin Integration
 *
 * Use a multisig wallet as DAO admin authority.
 */

import type { Connection, PublicKey } from '@solana/web3.js'

/**
 * Configure a multisig wallet as DAO admin.
 *
 * Setting the DAO authority requires the governance program (undeployed), so
 * this throws rather than echoing its inputs back as if a transaction had been
 * built and the authority changed.
 */
export function setMultisigAsDAOAdmin(
  _multisig: PublicKey,
  _dao: PublicKey
): { multisig: PublicKey; dao: PublicKey } {
  throw new Error(
    'setMultisigAsDAOAdmin is not implemented: the governance program that ' +
    'stores the DAO authority is not deployed.'
  )
}

/**
 * Check if a given authority is a multisig-managed authority for a DAO
 */
export async function isMultisigAuthority(
  _connection: Connection,
  authority: PublicKey,
  _dao: PublicKey
): Promise<boolean> {
  // In production, would check if the authority is a multisig PDA
  // and if that multisig is configured as the DAO admin
  return false
}

/**
 * Create a multisig proposal to execute a DAO governance action.
 * Wraps a governance instruction inside a multisig transaction.
 */
export async function createMultisigProposal(
  _connection: Connection,
  _multisig: PublicKey,
  _dao: PublicKey,
  _instruction: { programId: PublicKey; data: Buffer }
): Promise<{ multisig: PublicKey; dao: PublicKey; instruction: { programId: PublicKey; data: Buffer } }> {
  throw new Error(
    'createMultisigProposal is not implemented: wrapping a governance ' +
    'instruction in a multisig transaction requires the governance program, ' +
    'which is not deployed.'
  )
}
