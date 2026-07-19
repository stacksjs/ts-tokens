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
import { harvestWithheldTokensToMint, withdrawWithheldTokensFromMint } from '../programs/token-2022/instructions'

/**
 * Harvest result
 */
export interface HarvestResult {
  accountsProcessed: number
  harvestSignature?: string
  /** All harvest transaction signatures, one per source-account batch */
  harvestSignatures: string[]
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

  // Token accounts of a transfer-fee mint always carry the TransferFeeAmount
  // extension, so they are larger than the legacy 165-byte layout — filtering
  // on dataSize 165 would match nothing. Match only on the mint at offset 0
  // and check the withheld amount client-side.
  const { unpackAccount, getTransferFeeAmount } = await import('@solana/spl-token')
  const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: mint } },
    ],
  })

  const withFees: string[] = []
  for (const { pubkey, account } of accounts) {
    try {
      const parsed = unpackAccount(pubkey, account, TOKEN_2022_PROGRAM_ID)
      const feeAmount = getTransferFeeAmount(parsed)
      if (feeAmount && feeAmount.withheldAmount > 0n) {
        withFees.push(pubkey.toBase58())
      }
    } catch {
      // Not a valid Token-2022 account (or no transfer-fee extension) — skip.
      continue
    }
  }

  return withFees
}

/**
 * Harvest withheld transfer fees from all token accounts to the mint,
 * then optionally withdraw them to a destination account.
 *
 * Pass `sources` to harvest from an explicit account list instead of
 * discovering every account with withheld fees for the mint.
 */
export async function harvestTransferFees(
  mint: string,
  config: TokenConfig,
  options: {
    withdraw?: boolean
    destination?: string
    maxAccountsPerTx?: number
    sources?: string[]
  } = {}
): Promise<HarvestResult> {
  const { withdraw = true, maxAccountsPerTx = 20 } = options
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintPubkey = new PublicKey(mint)

  // Find accounts with withheld fees (unless the caller supplied sources)
  const accountAddresses = options.sources
    ?? await findAccountsWithWithheldFees(mint, config)

  if (accountAddresses.length === 0) {
    return { accountsProcessed: 0, harvestSignatures: [] }
  }

  // Harvest in batches
  const sources = accountAddresses.map(a => new PublicKey(a))
  const batches: PublicKey[][] = []

  for (let i = 0; i < sources.length; i += maxAccountsPerTx) {
    batches.push(sources.slice(i, i + maxAccountsPerTx))
  }

  let lastHarvestSig: string | undefined
  const harvestSignatures: string[] = []
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
    harvestSignatures.push(result.signature)
    totalProcessed += batch.length
  }

  const harvestResult: HarvestResult = {
    accountsProcessed: totalProcessed,
    harvestSignature: lastHarvestSig,
    harvestSignatures,
  }

  // Optionally withdraw fees from mint to a destination
  if (withdraw) {
    const destination = options.destination
      ? new PublicKey(options.destination)
      : undefined

    if (destination) {
      // Fees were harvested to the mint above, so withdraw from the mint
      const withdrawInstruction = withdrawWithheldTokensFromMint({
        mint: mintPubkey,
        destination,
        authority: payer.publicKey,
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
