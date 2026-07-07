/**
 * Token Minting
 *
 * Mint tokens to addresses.
 */

import { Connection, PublicKey } from '@solana/web3.js'
import {
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from '@solana/spl-token'
import type { TokenConfig, MintOptions, TransactionResult } from '../types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'

/**
 * Mint new tokens to a destination address.
 *
 * Automatically detects Token Program vs Token-2022 and creates the
 * associated token account for the destination if it does not exist.
 *
 * @param options - Mint options (mint address, amount, destination)
 * @param config - ts-tokens configuration
 * @returns Transaction result with signature
 *
 * @example
 * ```ts
 * const result = await mintTokens({ mint: 'Abc...', amount: 1000n, destination: 'Def...' }, config)
 * ```
 */
export async function mintTokens(
  options: MintOptions,
  config: TokenConfig
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mint = new PublicKey(options.mint)
  const destination = options.destination
    ? new PublicKey(options.destination)
    : payer.publicKey
  const mintAuthority = options.mintAuthority
    ? new PublicKey(options.mintAuthority)
    : payer.publicKey

  // Determine program ID by checking the mint account
  const mintInfo = await getMint(connection, mint)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  // Get or create associated token account
  const ata = await getAssociatedTokenAddress(mint, destination, false, programId)

  const instructions = []

  if (config.autoCreateAccounts) {
    // Idempotent create avoids the check-then-create race: it is a no-op
    // when the ATA already exists
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        payer.publicKey,
        ata,
        destination,
        mint,
        programId
      )
    )
  } else {
    try {
      await getAccount(connection, ata, undefined, programId)
    } catch {
      throw new Error(
        `Associated token account ${ata.toBase58()} does not exist. ` +
        `Set autoCreateAccounts: true in config to create it automatically.`
      )
    }
  }

  // Add mint instruction
  instructions.push(
    createMintToInstruction(
      mint,
      ata,
      mintAuthority,
      BigInt(options.amount),
      [],
      programId
    )
  )

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options.options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options.options)
}

/**
 * Mint tokens to multiple addresses in a single transaction
 *
 * @param mint - Token mint address
 * @param recipients - Array of { address, amount }
 * @param config - Token configuration
 * @returns Transaction result
 */
export async function mintTokensToMany(
  mint: string,
  recipients: Array<{ address: string; amount: bigint | number }>,
  config: TokenConfig
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)

  // Determine program ID
  const mintInfo = await getMint(connection, mintPubkey)
  const programId = mintInfo.tlvData && mintInfo.tlvData.length > 0
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID

  const instructions = []
  const createdAtas = new Set<string>()

  for (const recipient of recipients) {
    const destination = new PublicKey(recipient.address)
    const ata = await getAssociatedTokenAddress(mintPubkey, destination, false, programId)

    // Idempotent create is a no-op when the ATA exists; dedupe so duplicate
    // recipients don't add redundant instructions
    if (!createdAtas.has(ata.toBase58())) {
      createdAtas.add(ata.toBase58())
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          payer.publicKey,
          ata,
          destination,
          mintPubkey,
          programId
        )
      )
    }

    // Add mint instruction
    instructions.push(
      createMintToInstruction(
        mintPubkey,
        ata,
        payer.publicKey, // Assumes payer is mint authority
        BigInt(recipient.amount),
        [],
        programId
      )
    )
  }

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction)
}
