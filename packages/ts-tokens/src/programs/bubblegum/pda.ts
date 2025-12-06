/**
 * Bubblegum PDA Derivation
 */

import { PublicKey } from '@solana/web3.js'

const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')
const ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK')

/**
 * Find the tree authority PDA
 */
export function findTreeAuthorityPda(merkleTree: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  )
}

/**
 * Find the voucher PDA for decompression
 */
export function findVoucherPda(merkleTree: PublicKey, nonce: bigint): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8)
  nonceBuffer.writeBigUInt64LE(nonce)

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('voucher'),
      merkleTree.toBuffer(),
      nonceBuffer,
    ],
    BUBBLEGUM_PROGRAM_ID,
  )
}

/**
 * Find the asset ID for a compressed NFT
 */
export function findAssetId(merkleTree: PublicKey, leafIndex: bigint): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8)
  indexBuffer.writeBigUInt64LE(leafIndex)

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('asset'),
      merkleTree.toBuffer(),
      indexBuffer,
    ],
    BUBBLEGUM_PROGRAM_ID,
  )
}

/**
 * Find the tree config PDA
 */
export function findTreeConfigPda(merkleTree: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    ACCOUNT_COMPRESSION_PROGRAM_ID,
  )
}

/**
 * Find the BGum signer PDA
 */
export function findBubblegumSignerPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('collection_cpi')],
    BUBBLEGUM_PROGRAM_ID,
  )
}
