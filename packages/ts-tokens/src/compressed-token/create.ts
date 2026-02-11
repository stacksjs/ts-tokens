/**
 * Compressed Token Creation
 *
 * Create compressed token mints via Light Protocol.
 */

import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type { CreateCompressedTokenOptions, CompressedToken } from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'

// Light Protocol Compressed Token program ID
const COMPRESSED_TOKEN_PROGRAM_ID = 'cTokenmWW8bLPjZEBAUgYGZQKP8yvBa7kCAuYRbSgQ2'
const LIGHT_SYSTEM_PROGRAM_ID = 'SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7'

/**
 * Create a compressed token mint
 *
 * Note: This requires the Light Protocol programs to be deployed on the target network.
 * The implementation creates a regular SPL mint that will be registered with the
 * compressed token program for compression support.
 */
export async function createCompressedTokenMint(
  options: CreateCompressedTokenOptions,
  config: TokenConfig
): Promise<{ mint: string; signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintKeypair = Keypair.generate()
  const decimals = options.decimals ?? 9

  // Create the mint account through the compressed token program
  // This registers the mint for use with compressed token accounts
  const programId = new PublicKey(COMPRESSED_TOKEN_PROGRAM_ID)
  const authority = options.authority
    ? new PublicKey(options.authority)
    : payer.publicKey

  // Build the create compressed mint instruction
  const discriminator = Buffer.from([0]) // createMint discriminator
  const data = Buffer.alloc(1 + 1 + 32)
  discriminator.copy(data, 0)
  data.writeUInt8(decimals, 1)
  authority.toBuffer().copy(data, 2)

  const instruction = {
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(LIGHT_SYSTEM_PROGRAM_ID), isSigner: false, isWritable: false },
    ],
    programId,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(mintKeypair, payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    mint: mintKeypair.publicKey.toBase58(),
    signature: result.signature,
  }
}
