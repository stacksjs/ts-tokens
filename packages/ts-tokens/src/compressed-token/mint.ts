/**
 * Compressed Token Minting
 *
 * Mint compressed tokens to recipients.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type { MintCompressedTokenOptions } from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'

const COMPRESSED_TOKEN_PROGRAM_ID = 'cTokenmWW8bLPjZEBAUgYGZQKP8yvBa7kCAuYRbSgQ2'

/**
 * Mint compressed tokens to a destination address
 */
export async function mintCompressedTokens(
  options: MintCompressedTokenOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const programId = new PublicKey(COMPRESSED_TOKEN_PROGRAM_ID)
  const mintPubkey = new PublicKey(options.mint)
  const destination = new PublicKey(options.destination)

  // Build mint instruction
  const discriminator = Buffer.from([1]) // mintTo discriminator
  const amountBuf = Buffer.alloc(8)
  amountBuf.writeBigUInt64LE(options.amount)
  const data = Buffer.concat([discriminator, amountBuf])

  const instruction = {
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return { signature: result.signature }
}
