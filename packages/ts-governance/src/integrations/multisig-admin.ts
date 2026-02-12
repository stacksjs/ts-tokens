/**
 * Multisig Admin Integration
 *
 * Use a multisig wallet as DAO admin authority.
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Configure a multisig wallet as DAO admin
 */
export function setMultisigAsDAOAdmin(
  multisig: PublicKey,
  dao: PublicKey
): { multisig: PublicKey; dao: PublicKey } {
  // In production, would create transaction to set multisig as DAO authority
  return { multisig, dao }
}
