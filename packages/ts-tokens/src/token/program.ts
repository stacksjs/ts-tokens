/**
 * Token Program Detection
 *
 * Resolve whether a mint or token account belongs to the classic SPL Token
 * program or Token-2022 by inspecting the on-chain account owner. This is
 * the only reliable detection method: it works for extensionless Token-2022
 * mints and never requires guessing the program up front.
 */

import { Connection, PublicKey } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
  unpackAccount,
} from '@solana/spl-token'
import type { Mint, Account } from '@solana/spl-token'

/**
 * Map an account owner to the token program it belongs to
 */
function tokenProgramFromOwner(owner: PublicKey, address: PublicKey): PublicKey {
  if (owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID
  }
  if (owner.equals(TOKEN_PROGRAM_ID)) {
    return TOKEN_PROGRAM_ID
  }
  throw new Error(
    `Account ${address.toBase58()} is not owned by a token program. ` +
    `Owner: ${owner.toBase58()}`
  )
}

/**
 * Resolve the token program that owns a mint (or token account).
 *
 * Fetches the account and returns TOKEN_2022_PROGRAM_ID or TOKEN_PROGRAM_ID
 * based on the account owner. Throws if the account does not exist or is
 * not owned by either token program.
 *
 * @param connection - Solana connection
 * @param mint - Mint address (any token-program-owned account works)
 * @returns The owning token program ID
 */
export async function resolveTokenProgram(
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> {
  const accountInfo = await connection.getAccountInfo(mint)

  if (!accountInfo) {
    throw new Error(`Account ${mint.toBase58()} does not exist`)
  }

  return tokenProgramFromOwner(accountInfo.owner, mint)
}

/**
 * Fetch and unpack a mint together with its owning token program.
 *
 * Uses a single getAccountInfo call, so it is cheaper than calling
 * resolveTokenProgram followed by getMint.
 *
 * @param connection - Solana connection
 * @param mint - Mint address
 * @returns The unpacked mint and its program ID
 */
export async function getMintWithProgram(
  connection: Connection,
  mint: PublicKey
): Promise<{ mint: Mint; programId: PublicKey }> {
  const accountInfo = await connection.getAccountInfo(mint)

  if (!accountInfo) {
    throw new Error(`Mint account ${mint.toBase58()} does not exist`)
  }

  const programId = tokenProgramFromOwner(accountInfo.owner, mint)

  return {
    mint: unpackMint(mint, accountInfo, programId),
    programId,
  }
}

/**
 * Fetch and unpack a token account together with its owning token program.
 *
 * Resolves the program from the token account's own owner, so it works for
 * both classic SPL and Token-2022 accounts with a single RPC call.
 *
 * @param connection - Solana connection
 * @param address - Token account address
 * @returns The unpacked token account and its program ID
 */
export async function getTokenAccountWithProgram(
  connection: Connection,
  address: PublicKey
): Promise<{ account: Account; programId: PublicKey }> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    throw new Error(`Token account ${address.toBase58()} does not exist`)
  }

  const programId = tokenProgramFromOwner(accountInfo.owner, address)

  return {
    account: unpackAccount(address, accountInfo, programId),
    programId,
  }
}
