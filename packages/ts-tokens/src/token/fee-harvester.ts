/**
 * Transfer Fee Harvester
 *
 * Automatically harvest accumulated transfer fees from all holder accounts.
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { harvestWithheldTokensToMint, withdrawWithheldTokensFromAccounts } from '../programs/token-2022/instructions'

/**
 * Harvest result
 */
export interface HarvestResult {
  accountsProcessed: number
  harvestSignature?: string
  withdrawSignature?: string
  error?: string
}

/**
 * Discover all token accounts with withheld transfer fees
 */
export async function findAccountsWithWithheldFees(
  mint: string,
  config: TokenConfig
): Promise<string[]> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: mint } },
    ],
  })

  return accounts.map(a => a.pubkey.toBase58())
}

/**
 * Harvest withheld transfer fees from all token accounts to the mint,
 * then optionally withdraw them to a destination account.
 */
export async function harvestTransferFees(
  mint: string,
  config: TokenConfig,
  options: {
    withdraw?: boolean
    destination?: string
    maxAccountsPerTx?: number
  } = {}
): Promise<HarvestResult> {
  const { withdraw = true, maxAccountsPerTx = 20 } = options
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(mint)

  // Find accounts with withheld fees
  const accountAddresses = await findAccountsWithWithheldFees(mint, config)

  if (accountAddresses.length === 0) {
    return { accountsProcessed: 0 }
  }

  // Harvest in batches
  const sources = accountAddresses.map(a => new PublicKey(a))
  const batches: PublicKey[][] = []

  for (let i = 0; i < sources.length; i += maxAccountsPerTx) {
    batches.push(sources.slice(i, i + maxAccountsPerTx))
  }

  let lastHarvestSig: string | undefined
  let totalProcessed = 0

  for (const batch of batches) {
    const instruction = harvestWithheldTokensToMint({
      mint: mintPubkey,
      sources: batch,
    })

    const transaction = await buildTransaction(
      connection,
      [instruction],
      payer.publicKey
    )

    transaction.partialSign(payer)

    const result = await sendAndConfirmTransaction(connection, transaction)
    lastHarvestSig = result.signature
    totalProcessed += batch.length
  }

  const harvestResult: HarvestResult = {
    accountsProcessed: totalProcessed,
    harvestSignature: lastHarvestSig,
  }

  // Optionally withdraw fees from mint to a destination
  if (withdraw) {
    const destination = options.destination
      ? new PublicKey(options.destination)
      : undefined

    if (destination) {
      const withdrawInstruction = withdrawWithheldTokensFromAccounts({
        mint: mintPubkey,
        destination,
        authority: payer.publicKey,
        sources: [],
      })

      const withdrawTx = await buildTransaction(
        connection,
        [withdrawInstruction],
        payer.publicKey
      )

      withdrawTx.partialSign(payer)

      const withdrawResult = await sendAndConfirmTransaction(connection, withdrawTx)
      harvestResult.withdrawSignature = withdrawResult.signature
    }
  }

  return harvestResult
}
