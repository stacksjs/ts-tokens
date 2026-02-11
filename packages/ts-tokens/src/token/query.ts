/**
 * Token Queries
 *
 * Query token info, supply, holders, and transaction history.
 */

import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, AccountLayout } from '@solana/spl-token'
import type { TokenConfig, TokenInfo, TokenHolder, TokenTransferEvent } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { getTokenMetadata } from './metadata'

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  /** Number of items to skip */
  offset?: number
  /** Maximum number of items to return */
  limit?: number
}

/**
 * Token history pagination options
 */
export interface HistoryOptions {
  /** Maximum number of signatures to return */
  limit?: number
  /** Fetch signatures before this transaction signature (cursor-based pagination) */
  before?: string
}

/**
 * Token supply result
 */
export interface TokenSupplyResult {
  /** Raw supply in base units */
  supply: bigint
  /** Number of decimals */
  decimals: number
  /** Human-readable amount */
  uiAmount: number | null
}

/**
 * Get comprehensive token info (mint data + metadata)
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Token info or null if mint doesn't exist
 */
export async function getTokenInfo(
  mint: string,
  config: TokenConfig
): Promise<TokenInfo | null> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  // Try to get mint account info
  const accountInfo = await connection.getAccountInfo(mintPubkey)
  if (!accountInfo) {
    return null
  }

  // Determine if this is a Token-2022 token
  const isToken2022 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)

  // Parse mint data using getParsedAccountInfo for cleaner access
  const parsedInfo = await connection.getParsedAccountInfo(mintPubkey)
  if (!parsedInfo.value) {
    return null
  }

  const parsed = (parsedInfo.value.data as any).parsed
  if (!parsed || parsed.type !== 'mint') {
    return null
  }

  const mintData = parsed.info

  // Fetch metadata (may not exist)
  let metadata: TokenInfo['metadata'] | undefined
  try {
    const tokenMetadata = await getTokenMetadata(mint, config)
    if (tokenMetadata) {
      metadata = {
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        uri: tokenMetadata.uri,
        sellerFeeBasisPoints: tokenMetadata.sellerFeeBasisPoints,
        creators: tokenMetadata.creators.map(c => ({
          address: c.address,
          verified: c.verified,
          share: c.share,
        })),
        isMutable: tokenMetadata.isMutable,
        updateAuthority: tokenMetadata.updateAuthority,
      }
    }
  } catch {
    // Metadata fetch failed - continue without it
  }

  return {
    mint,
    supply: BigInt(mintData.supply),
    decimals: mintData.decimals,
    mintAuthority: mintData.mintAuthority ?? null,
    freezeAuthority: mintData.freezeAuthority ?? null,
    isToken2022,
    metadata,
  }
}

/**
 * Get token supply information
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @returns Token supply details
 */
export async function getTokenSupply(
  mint: string,
  config: TokenConfig
): Promise<TokenSupplyResult> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  const supply = await connection.getTokenSupply(mintPubkey)

  return {
    supply: BigInt(supply.value.amount),
    decimals: supply.value.decimals,
    uiAmount: supply.value.uiAmount,
  }
}

/**
 * Get all token holders with balances
 *
 * Supports both Token and Token-2022 programs.
 * Uses client-side pagination via offset/limit.
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @param options - Pagination options
 * @returns Array of token holders
 */
export async function getTokenHolders(
  mint: string,
  config: TokenConfig,
  options?: PaginationOptions
): Promise<TokenHolder[]> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 100

  // Get total supply for percentage calculation
  const supplyResult = await connection.getTokenSupply(mintPubkey)
  const totalSupply = BigInt(supplyResult.value.amount)

  // Try both Token and Token-2022 programs
  const holders: TokenHolder[] = []

  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        { dataSize: AccountLayout.span },
        {
          memcmp: {
            offset: 0,
            bytes: mintPubkey.toBase58(),
          },
        },
      ],
    })

    for (const { pubkey, account } of accounts) {
      const decoded = AccountLayout.decode(account.data)
      const balance = BigInt(decoded.amount.toString())

      if (balance > 0n) {
        const percentage = totalSupply > 0n
          ? Number((balance * 10000n) / totalSupply) / 100
          : 0

        holders.push({
          owner: new PublicKey(decoded.owner).toBase58(),
          tokenAccount: pubkey.toBase58(),
          balance,
          percentage,
        })
      }
    }
  }

  // Sort by balance descending
  holders.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0))

  // Apply client-side pagination
  return holders.slice(offset, offset + limit)
}

/**
 * Get transaction history for a token mint
 *
 * Uses cursor-based pagination via `before` signature.
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @param options - History options
 * @returns Array of transaction signatures with metadata
 */
export async function getTokenHistory(
  mint: string,
  config: TokenConfig,
  options?: HistoryOptions
): Promise<Array<{
  signature: string
  slot: number
  blockTime: number | null
  err: any | null
}>> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  const signatures = await connection.getSignaturesForAddress(mintPubkey, {
    limit: options?.limit ?? 20,
    before: options?.before,
  })

  return signatures.map(sig => ({
    signature: sig.signature,
    slot: sig.slot,
    blockTime: sig.blockTime ?? null,
    err: sig.err ?? null,
  }))
}

/**
 * Get the largest token accounts (top holders)
 *
 * Resolves owner addresses for each account.
 *
 * @param mint - Token mint address
 * @param config - Token configuration
 * @param limit - Maximum number of accounts to return (default 20)
 * @returns Array of token holders sorted by balance descending
 */
export async function getLargestAccounts(
  mint: string,
  config: TokenConfig,
  limit: number = 20
): Promise<TokenHolder[]> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)

  // Get total supply for percentage calculation
  const supplyResult = await connection.getTokenSupply(mintPubkey)
  const totalSupply = BigInt(supplyResult.value.amount)

  // Get largest accounts from RPC
  const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey)

  const holders: TokenHolder[] = []

  // Resolve owner addresses via getParsedAccountInfo
  const accountAddresses = largestAccounts.value
    .slice(0, limit)
    .map(a => a.address)

  // Batch fetch parsed account info
  const parsedAccounts = await connection.getMultipleParsedAccounts(accountAddresses)

  for (let i = 0; i < accountAddresses.length; i++) {
    const account = largestAccounts.value[i]
    const parsedAccount = parsedAccounts.value[i]
    const balance = BigInt(account.amount)

    if (balance === 0n) continue

    let owner = ''
    if (parsedAccount) {
      const parsed = (parsedAccount.data as any).parsed
      if (parsed?.info?.owner) {
        owner = parsed.info.owner
      }
    }

    const percentage = totalSupply > 0n
      ? Number((balance * 10000n) / totalSupply) / 100
      : 0

    holders.push({
      owner,
      tokenAccount: accountAddresses[i].toBase58(),
      balance,
      percentage,
    })
  }

  return holders
}
