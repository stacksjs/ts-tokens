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
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import type { Account as TokenAccount } from '@solana/spl-token'
import type { TokenConfig, TokenAccountInfo } from '../../types'
import { retry } from '../../utils'

/**
 * Get account info for any account
 *
 * @param connection - Solana connection
 * @param address - Account address
 * @returns Account info or null if not found
 */
export async function getAccountInfo(
  _connection: Connection,
  _address: string
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
export async function getMultipleAccounts(
  _connection: Connection,
  _addresses: string[]
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

  // Try to get the associated token account
  const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)

  try {
    const account = await getAccount(connection, ata)
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

  const allAccounts = [...splAccounts.value, ...token2022Accounts.value]
  const result: TokenAccountInfo[] = []

  for (const { pubkey, account } of allAccounts) {
    try {
      // Parse the account data
      const tokenAccount = await getAccount(connection, pubkey)

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
export async function getMintInfo(
  _connection: Connection,
  _mint: string
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
export async function getLargestTokenHolders(
  _connection: Connection,
  _mint: string,
  _limit: number = 20
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
