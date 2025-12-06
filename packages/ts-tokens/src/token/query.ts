/**
 * Token Query Operations
 *
 * Query token information, supply, holders, and history.
 */

import type { TokenConfig } from '../types'
import { getAccount, getMint } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { getCurrentConfig } from '../config'
import { createConnection } from '../drivers/solana/connection'

/**
 * Token mint information
 */
export interface TokenInfo {
  /**
   * Token mint address
   */
  mint: string

  /**
   * Mint authority (if any)
   */
  mintAuthority: string | null

  /**
   * Freeze authority (if any)
   */
  freezeAuthority: string | null

  /**
   * Decimal places
   */
  decimals: number

  /**
   * Current supply
   */
  supply: string

  /**
   * Whether token is initialized
   */
  isInitialized: boolean
}

/**
 * Token holder information
 */
export interface TokenHolder {
  /**
   * Holder wallet address
   */
  owner: string

  /**
   * Token account address
   */
  account: string

  /**
   * Balance (in base units)
   */
  balance: string

  /**
   * Balance (in human-readable format with decimals)
   */
  uiBalance: string

  /**
   * Percentage of total supply
   */
  percentage: number
}

/**
 * Get token mint information
 *
 * @param mint - Token mint address
 * @param config - Optional configuration override
 * @returns Token mint information
 *
 * @example
 * ```ts
 * const info = await getTokenInfo('TokenMintAddress...')
 * console.log(`Decimals: ${info.decimals}`)
 * console.log(`Supply: ${info.supply}`)
 * ```
 */
export async function getTokenInfo(
  mint: string | PublicKey,
  config?: TokenConfig,
): Promise<TokenInfo> {
  const activeConfig = config || getCurrentConfig()
  const connection = createConnection(activeConfig)

  const mintKey = typeof mint === 'string' ? new PublicKey(mint) : mint
  const mintInfo = await getMint(connection, mintKey)

  return {
    mint: mintKey.toBase58(),
    mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
    freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
    decimals: mintInfo.decimals,
    supply: mintInfo.supply.toString(),
    isInitialized: mintInfo.isInitialized,
  }
}

/**
 * Get current token supply
 *
 * @param mint - Token mint address
 * @param config - Optional configuration override
 * @returns Current supply as string (in base units)
 *
 * @example
 * ```ts
 * const supply = await getTokenSupply('TokenMintAddress...')
 * console.log(`Total supply: ${supply}`)
 * ```
 */
export async function getTokenSupply(
  mint: string | PublicKey,
  config?: TokenConfig,
): Promise<string> {
  const info = await getTokenInfo(mint, config)
  return info.supply
}

/**
 * Get all token holders (paginated)
 *
 * Note: This function queries all token accounts on-chain and can be slow/expensive for tokens with many holders.
 * Consider using a Solana indexer API (like Helius, Shyft, or QuickNode) for production applications.
 *
 * @param mint - Token mint address
 * @param config - Optional configuration override
 * @param limit - Maximum number of holders to return
 * @returns Array of token holders
 *
 * @example
 * ```ts
 * const holders = await getTokenHolders('TokenMintAddress...', undefined, 100)
 * for (const holder of holders) {
 *   console.log(`${holder.owner}: ${holder.uiBalance}`)
 * }
 * ```
 */
export async function getTokenHolders(
  mint: string | PublicKey,
  config?: TokenConfig,
  limit: number = 1000,
): Promise<TokenHolder[]> {
  const activeConfig = config || getCurrentConfig()
  const connection = createConnection(activeConfig)

  const mintKey = typeof mint === 'string' ? new PublicKey(mint) : mint
  const mintInfo = await getMint(connection, mintKey)

  // Get all token accounts for this mint using getProgramAccounts
  const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      {
        dataSize: 165, // Size of token account
      },
      {
        memcmp: {
          offset: 0,
          bytes: mintKey.toBase58(),
        },
      },
    ],
  })

  const holders: TokenHolder[] = []
  const totalSupply = Number(mintInfo.supply)

  for (const { pubkey, account: accountInfo } of accounts.slice(0, limit)) {
    try {
      const account = await getAccount(connection, pubkey)

      if (account.amount > 0n) {
        const balance = account.amount.toString()
        const uiBalance = (Number(account.amount) / (10 ** mintInfo.decimals)).toString()
        const percentage = totalSupply > 0 ? (Number(account.amount) / totalSupply) * 100 : 0

        holders.push({
          owner: account.owner.toBase58(),
          account: pubkey.toBase58(),
          balance,
          uiBalance,
          percentage,
        })
      }
    }
    catch (error) {
      // Skip accounts that can't be parsed (might be closed or invalid)
      continue
    }
  }

  // Sort by balance (descending)
  holders.sort((a, b) => Number(b.balance) - Number(a.balance))

  return holders
}

/**
 * Get transaction history for a token mint
 *
 * Note: This is a basic implementation that gets recent signatures.
 * For complete transaction history with parsed data, use a Solana indexer API.
 *
 * @param mint - Token mint address
 * @param config - Optional configuration override
 * @param limit - Maximum number of signatures to return
 * @returns Array of transaction signatures
 *
 * @example
 * ```ts
 * const history = await getTokenHistory('TokenMintAddress...', undefined, 10)
 * console.log(`Recent transactions: ${history.length}`)
 * ```
 */
export async function getTokenHistory(
  mint: string | PublicKey,
  config?: TokenConfig,
  limit: number = 10,
): Promise<string[]> {
  const activeConfig = config || getCurrentConfig()
  const connection = createConnection(activeConfig)

  const mintKey = typeof mint === 'string' ? new PublicKey(mint) : mint

  // Get signatures for the mint account
  const signatures = await connection.getSignaturesForAddress(mintKey, { limit })

  return signatures.map((sig: any) => sig.signature)
}

/**
 * Get largest token holders
 *
 * @param mint - Token mint address
 * @param config - Optional configuration override
 * @param limit - Number of top holders to return
 * @returns Array of largest token holders
 *
 * @example
 * ```ts
 * const topHolders = await getLargestAccounts('TokenMintAddress...', undefined, 20)
 * console.log('Top 20 holders:')
 * topHolders.forEach((holder, i) => {
 *   console.log(`${i + 1}. ${holder.owner}: ${holder.uiBalance} (${holder.percentage.toFixed(2)}%)`)
 * })
 * ```
 */
export async function getLargestAccounts(
  mint: string | PublicKey,
  config?: TokenConfig,
  limit: number = 20,
): Promise<TokenHolder[]> {
  const holders = await getTokenHolders(mint, config, 10000) // Get more to ensure we have enough
  return holders.slice(0, limit)
}

/**
 * Get token account balance
 *
 * @param account - Token account address
 * @param config - Optional configuration override
 * @returns Balance information
 *
 * @example
 * ```ts
 * const balance = await getTokenAccountBalance('AccountAddress...')
 * console.log(`Balance: ${balance.uiBalance}`)
 * ```
 */
export async function getTokenAccountBalance(
  account: string | PublicKey,
  config?: TokenConfig,
): Promise<{
  balance: string
  uiBalance: string
  decimals: number
}> {
  const activeConfig = config || getCurrentConfig()
  const connection = createConnection(activeConfig)

  const accountKey = typeof account === 'string' ? new PublicKey(account) : account
  const accountInfo = await getAccount(connection, accountKey)

  const balance = accountInfo.amount.toString()
  const mintInfo = await getMint(connection, accountInfo.mint)
  const decimals = mintInfo.decimals
  const uiBalance = (Number(accountInfo.amount) / (10 ** decimals)).toString()

  return {
    balance,
    uiBalance,
    decimals,
  }
}
