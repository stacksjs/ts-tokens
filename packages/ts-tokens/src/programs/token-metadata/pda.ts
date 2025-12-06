/**
 * Token Metadata Program PDA Derivation
 */

import { PublicKey } from '@solana/web3.js'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
const METADATA_PREFIX = 'metadata'
const EDITION_PREFIX = 'edition'

/**
 * Find the metadata PDA for a mint
 */
export function findMetadataPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
}

/**
 * Find the master edition PDA for a mint
 */
export function findMasterEditionPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from(EDITION_PREFIX),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
}

/**
 * Find the edition PDA for a mint
 */
export function findEditionPda(mint: PublicKey): [PublicKey, number] {
  return findMasterEditionPda(mint)
}

/**
 * Find the edition marker PDA
 */
export function findEditionMarkerPda(mint: PublicKey, edition: bigint): [PublicKey, number] {
  const editionNumber = edition / 248n
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from(EDITION_PREFIX),
      Buffer.from(editionNumber.toString()),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
}

/**
 * Find the collection authority record PDA
 */
export function findCollectionAuthorityPda(
  mint: PublicKey,
  authority: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('collection_authority'),
      authority.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
}

/**
 * Find the use authority record PDA
 */
export function findUseAuthorityPda(
  mint: PublicKey,
  authority: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('user'),
      authority.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
}

/**
 * Find the token record PDA (for pNFTs)
 */
export function findTokenRecordPda(
  mint: PublicKey,
  token: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('token_record'),
      token.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
}
