/**
 * Compressed Token Transfers
 *
 * Transfer compressed tokens with proof verification.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import type { TransferCompressedTokenOptions, CompressedTokenProof } from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'

const COMPRESSED_TOKEN_PROGRAM_ID = 'cTokenmWW8bLPjZEBAUgYGZQKP8yvBa7kCAuYRbSgQ2'

/**
 * Transfer compressed tokens
 */
export async function transferCompressedTokens(
  options: TransferCompressedTokenOptions,
  config: TokenConfig
): Promise<{ signature: string }> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const programId = new PublicKey(COMPRESSED_TOKEN_PROGRAM_ID)
  const mintPubkey = new PublicKey(options.mint)
  const destination = new PublicKey(options.to)

  // Build transfer instruction with proof
  const discriminator = Buffer.from([2]) // transfer discriminator
  const amountBuf = Buffer.alloc(8)
  amountBuf.writeBigUInt64LE(options.amount)

  const dataParts: Buffer[] = [discriminator, amountBuf]

  // Include proof data if provided
  if (options.proof) {
    const proofBuf = serializeProof(options.proof)
    dataParts.push(proofBuf)
  }

  const data = Buffer.concat(dataParts)

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

/**
 * Serialize a merkle proof for instruction data
 */
function serializeProof(proof: CompressedTokenProof): Buffer {
  const rootBuf = Buffer.from(proof.root, 'hex')
  const indexBuf = Buffer.alloc(4)
  indexBuf.writeUInt32LE(proof.leafIndex)

  const proofNodes = proof.proof.map(p => Buffer.from(p, 'hex'))
  const proofLenBuf = Buffer.alloc(4)
  proofLenBuf.writeUInt32LE(proofNodes.length)

  return Buffer.concat([rootBuf, indexBuf, proofLenBuf, ...proofNodes])
}
