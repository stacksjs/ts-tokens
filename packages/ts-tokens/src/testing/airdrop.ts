/**
 * Programmatic airdrop helpers for test/dev clusters.
 *
 * Unlike the CLI-shelling helpers in the `dev` command, these talk to the RPC
 * directly via web3.js, so they work in any environment (CI, scripts, browsers)
 * without the Solana CLI installed. Devnet/testnet faucets are rate-limited and
 * frequently return transient "Internal error" responses, so every request is
 * retried with backoff and failures are surfaced with actionable messages.
 */

import type { Commitment, Connection } from '@solana/web3.js'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

/**
 * Options controlling a single airdrop request.
 */
export interface AirdropOptions {
  /** SOL to request per airdrop attempt. Default 1. */
  sol?: number
  /** Maximum attempts before giving up. Default 6. */
  maxRetries?: number
  /** Base backoff between retries in ms (grows linearly). Default 2000. */
  retryDelayMs?: number
  /** Commitment level for confirmation. Default 'confirmed'. */
  commitment?: Commitment
  /** Optional progress logger. */
  logger?: (message: string) => void
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Read an address's balance in whole SOL.
 */
export async function getBalanceSol(connection: Connection, address: PublicKey): Promise<number> {
  const lamports = await connection.getBalance(address)
  return lamports / LAMPORTS_PER_SOL
}

/**
 * Request an airdrop, retrying on transient faucet failures.
 *
 * @returns The confirmed transaction signatures and the resulting balance.
 * @throws If no airdrop confirmed after `maxRetries` attempts (e.g. faucet down
 *   or rate-limited), with guidance on alternatives.
 */
export async function airdrop(
  connection: Connection,
  address: PublicKey,
  options: AirdropOptions = {}
): Promise<{ signatures: string[]; balanceSol: number }> {
  const sol = options.sol ?? 1
  const maxRetries = options.maxRetries ?? 6
  const retryDelayMs = options.retryDelayMs ?? 2000
  const commitment = options.commitment ?? 'confirmed'
  const log = options.logger ?? (() => {})

  const signatures: string[] = []
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const sig = await connection.requestAirdrop(address, Math.round(sol * LAMPORTS_PER_SOL))
      const latest = await connection.getLatestBlockhash(commitment)
      await connection.confirmTransaction(
        { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
        commitment
      )
      signatures.push(sig)
      log(`airdrop confirmed (attempt ${attempt}): ${sig}`)
      return { signatures, balanceSol: await getBalanceSol(connection, address) }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      log(`airdrop attempt ${attempt}/${maxRetries} failed: ${lastError.message}`)
      if (attempt < maxRetries) {
        await sleep(retryDelayMs * attempt)
      }
    }
  }

  throw new Error(
    `Airdrop failed after ${maxRetries} attempts: ${lastError?.message ?? 'unknown error'}. ` +
    'Devnet/testnet faucets are rate-limited — retry later, use a funded keypair via ' +
    'config.wallet, or a web faucet (https://faucet.solana.com).'
  )
}

/**
 * Ensure an address holds at least `minBalanceSol`, airdropping the shortfall
 * (in `topUpSol`-sized requests) if it does not. A no-op when already funded.
 *
 * @returns The final balance in SOL.
 */
export async function airdropIfNeeded(
  connection: Connection,
  address: PublicKey,
  minBalanceSol: number,
  options: AirdropOptions = {}
): Promise<number> {
  const log = options.logger ?? (() => {})
  let balance = await getBalanceSol(connection, address)
  if (balance >= minBalanceSol) {
    log(`balance ${balance} SOL already >= ${minBalanceSol} SOL; skipping airdrop`)
    return balance
  }

  const topUpSol = options.sol ?? Math.max(minBalanceSol, 1)
  const maxRounds = options.maxRetries ?? 6
  for (let round = 1; round <= maxRounds && balance < minBalanceSol; round++) {
    const result = await airdrop(connection, address, { ...options, sol: topUpSol })
    balance = result.balanceSol
    log(`after round ${round}: ${balance} SOL`)
  }

  if (balance < minBalanceSol) {
    throw new Error(
      `Could not fund ${address.toBase58()} to ${minBalanceSol} SOL (stuck at ${balance} SOL). ` +
      'The faucet is likely rate-limited; try again later or supply a pre-funded wallet.'
    )
  }
  return balance
}
