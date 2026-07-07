/**
 * Solana Account Utilities
 *
 * Handles account queries and token account management.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import {
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  unpackAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import type { Account as TokenAccount } from '@solana/spl-token'
import type { TokenConfig, TokenAccountInfo } from '../../types'
import { retry } from '../../utils'
import { getMintWithProgram } from '../../token/program'

/**
 * Get account info for any account
 *
 * @param connection - Solana connection
 * @param address - Account address
 * @returns Account info or null if not found
 */
// eslint-disable-next-line no-unused-vars
export async function getAccountInfo(
  connection: Connection,
  address: string
): Promise<{
  lamports: bigint
  owner: string
  data: Uint8Array
  executable: boolean
  rentEpoch: number
} | null> {
  const pubkey = new PublicKey(address)
  const info = await retry(() => connection.getAccountInfo(pubkey), 3, 500)

  if (!info) {
    return null
  }

  return {
    lamports: BigInt(info.lamports),
    owner: info.owner.toBase58(),
    data: info.data,
    executable: info.executable,
    rentEpoch: typeof info.rentEpoch === 'number' ? info.rentEpoch : Number(info.rentEpoch),
  }
}

/**
 * Get multiple accounts in a single RPC call
 *
 * @param connection - Solana connection
 * @param addresses - Array of account addresses
 * @returns Array of account info (null for non-existent accounts)
 */
// eslint-disable-next-line no-unused-vars
export async function getMultipleAccounts(
  connection: Connection,
  addresses: string[]
): Promise<Array<{
  address: string
  lamports: bigint
  owner: string
  data: Uint8Array
} | null>> {
  const pubkeys = addresses.map(a => new PublicKey(a))
  const accounts = await retry(
    () => connection.getMultipleAccountsInfo(pubkeys),
    3,
    500
  )

  return accounts.map((info, i) => {
    if (!info) return null
    return {
      address: addresses[i],
      lamports: BigInt(info.lamports),
      owner: info.owner.toBase58(),
      data: info.data,
    }
  })
}

/**
 * Get SOL balance for an address
 *
 * @param connection - Solana connection
 * @param address - Wallet address
 * @returns Balance in lamports
 */
export async function getBalance(
  connection: Connection,
  address: string
): Promise<bigint> {
  const pubkey = new PublicKey(address)
  const balance = await retry(() => connection.getBalance(pubkey), 3, 500)
  return BigInt(balance)
}

/**
 * Get token balance for a specific mint
 *
 * @param connection - Solana connection
 * @param owner - Owner wallet address
 * @param mint - Token mint address
 * @returns Token balance in base units
 */
export async function getTokenBalance(
  connection: Connection,
  owner: string,
  mint: string
): Promise<bigint> {
  const ownerPubkey = new PublicKey(owner)
  const mintPubkey = new PublicKey(mint)

  // Determine which token program owns the mint so we derive the correct ATA
  // and parse the account with the right program. Deriving with the classic
  // token defaults reads Token-2022 balances as 0.
  let programId: PublicKey
  try {
    programId = (await getMintWithProgram(connection, mintPubkey)).programId
  } catch {
    // Mint doesn't exist (or can't be read) — treat balance as 0.
    return 0n
  }

  const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey, false, programId)

  try {
    const account = await getAccount(connection, ata, undefined, programId)
    return account.amount
  } catch {
    // Account doesn't exist, balance is 0
    return 0n
  }
}

/**
 * Get all token accounts for an owner
 *
 * @param connection - Solana connection
 * @param owner - Owner wallet address
 * @returns Array of token account info
 */
export async function getTokenAccounts(
  connection: Connection,
  owner: string
): Promise<TokenAccountInfo[]> {
  const ownerPubkey = new PublicKey(owner)

  // Get accounts from both token programs
  const [splAccounts, token2022Accounts] = await Promise.all([
    connection.getTokenAccountsByOwner(ownerPubkey, {
      programId: TOKEN_PROGRAM_ID,
    }),
    connection.getTokenAccountsByOwner(ownerPubkey, {
      programId: TOKEN_2022_PROGRAM_ID,
    }),
  ])

  // Tag each already-fetched account with its owning program so we can parse
  // the buffer we already have (no N+1 re-fetch) with the correct program.
  // Re-fetching Token-2022 accounts via getAccount() with the classic program
  // throws, which previously dropped every 2022 account.
  const allAccounts = [
    ...splAccounts.value.map(a => ({ ...a, programId: TOKEN_PROGRAM_ID })),
    ...token2022Accounts.value.map(a => ({ ...a, programId: TOKEN_2022_PROGRAM_ID })),
  ]
  const result: TokenAccountInfo[] = []

  for (const { pubkey, account, programId } of allAccounts) {
    try {
      // Parse the buffer we already fetched with the correct program.
      const tokenAccount = unpackAccount(pubkey, account, programId)

      result.push({
        address: pubkey.toBase58(),
        mint: tokenAccount.mint.toBase58(),
        owner: tokenAccount.owner.toBase58(),
        balance: tokenAccount.amount,
        delegate: tokenAccount.delegate?.toBase58() ?? null,
        delegatedAmount: tokenAccount.delegatedAmount,
        isFrozen: tokenAccount.isFrozen,
        isNative: tokenAccount.isNative,
        closeAuthority: tokenAccount.closeAuthority?.toBase58() ?? null,
      })
    } catch {
      // Skip accounts that can't be parsed
      continue
    }
  }

  return result
}

/**
 * Get all NFT accounts for an owner (tokens with 0 decimals and supply of 1)
 *
 * @param connection - Solana connection
 * @param owner - Owner wallet address
 * @returns Array of NFT token account info
 */
export async function getNFTAccounts(
  connection: Connection,
  owner: string
): Promise<TokenAccountInfo[]> {
  const tokenAccounts = await getTokenAccounts(connection, owner)

  // Filter for NFTs (balance of 1, and we'll check decimals)
  const nftAccounts: TokenAccountInfo[] = []

  for (const account of tokenAccounts) {
    if (account.balance === 1n) {
      try {
        const mintPubkey = new PublicKey(account.mint)
        const mintInfo = await getMint(connection, mintPubkey)

        // NFTs have 0 decimals and supply of 1
        if (mintInfo.decimals === 0 && mintInfo.supply === 1n) {
          nftAccounts.push(account)
        }
      } catch {
        // Skip if we can't get mint info
        continue
      }
    }
  }

  return nftAccounts
}

/**
 * Get associated token account address
 *
 * @param mint - Token mint address
 * @param owner - Owner wallet address
 * @param allowOwnerOffCurve - Allow owner to be off curve (for PDAs)
 * @returns Associated token account address
 */
export async function getAssociatedTokenAccountAddress(
  mint: string,
  owner: string,
  allowOwnerOffCurve: boolean = false
): Promise<string> {
  const mintPubkey = new PublicKey(mint)
  const ownerPubkey = new PublicKey(owner)

  const ata = await getAssociatedTokenAddress(
    mintPubkey,
    ownerPubkey,
    allowOwnerOffCurve
  )

  return ata.toBase58()
}

/**
 * Check if a token account exists
 *
 * @param connection - Solana connection
 * @param address - Token account address
 * @returns True if account exists
 */
export async function tokenAccountExists(
  connection: Connection,
  address: string
): Promise<boolean> {
  try {
    const pubkey = new PublicKey(address)
    await getAccount(connection, pubkey)
    return true
  } catch {
    return false
  }
}

/**
 * Get mint info for a token
 *
 * @param connection - Solana connection
 * @param mint - Token mint address
 * @returns Mint info
 */
// eslint-disable-next-line no-unused-vars
export async function getMintInfo(
  connection: Connection,
  mint: string
): Promise<{
  address: string
  supply: bigint
  decimals: number
  mintAuthority: string | null
  freezeAuthority: string | null
  isInitialized: boolean
}> {
  const mintPubkey = new PublicKey(mint)
  const mintInfo = await getMint(connection, mintPubkey)

  return {
    address: mint,
    supply: mintInfo.supply,
    decimals: mintInfo.decimals,
    mintAuthority: mintInfo.mintAuthority?.toBase58() ?? null,
    freezeAuthority: mintInfo.freezeAuthority?.toBase58() ?? null,
    isInitialized: mintInfo.isInitialized,
  }
}

/**
 * Get largest token holders for a mint
 *
 * @param connection - Solana connection
 * @param mint - Token mint address
 * @param limit - Maximum number of holders to return
 * @returns Array of token holders sorted by balance
 */
// eslint-disable-next-line no-unused-vars
export async function getLargestTokenHolders(
  connection: Connection,
  mint: string,
  limit: number = 20
): Promise<Array<{
  address: string
  balance: bigint
  percentage: number
}>> {
  const mintPubkey = new PublicKey(mint)
  const result = await connection.getTokenLargestAccounts(mintPubkey)

  // Get total supply for percentage calculation
  const mintInfo = await getMint(connection, mintPubkey)
  const totalSupply = Number(mintInfo.supply)

  return result.value.slice(0, limit).map(account => ({
    address: account.address.toBase58(),
    balance: BigInt(account.amount),
    percentage: totalSupply > 0
      ? (Number(account.amount) / totalSupply) * 100
      : 0,
  }))
}
