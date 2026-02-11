/**
 * Compressed Token Queries
 *
 * Query compressed token balances via Photon indexer or DAS API.
 */

import type { TokenConfig } from '../types'
import type { CompressedTokenAccount, CompressedTokenProof } from './types'

/**
 * Query compressed token balances for an owner
 */
export async function getCompressedTokenBalances(
  owner: string,
  config: TokenConfig,
  options: { mint?: string } = {}
): Promise<CompressedTokenAccount[]> {
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-compressed-balances',
        method: 'getCompressedTokenAccountsByOwner',
        params: {
          owner,
          mint: options.mint,
        },
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    if (data.error || !data.result?.value) return []

    return data.result.value.map((account: any) => ({
      owner: account.owner ?? owner,
      mint: account.mint ?? options.mint ?? '',
      amount: BigInt(account.amount ?? 0),
      hash: account.hash ?? '',
      leafIndex: account.leafIndex ?? 0,
      tree: account.tree ?? '',
    }))
  } catch {
    return []
  }
}

/**
 * Get a merkle proof for a compressed token account
 */
export async function getCompressedTokenProof(
  hash: string,
  config: TokenConfig
): Promise<CompressedTokenProof | null> {
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-compressed-proof',
        method: 'getValidityProof',
        params: {
          hashes: [hash],
        },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data.error || !data.result) return null

    return {
      root: data.result.root ?? '',
      proof: data.result.proof ?? [],
      leafIndex: data.result.leafIndex ?? 0,
      hash,
    }
  } catch {
    return null
  }
}

/**
 * Get total compressed token supply for a mint
 */
export async function getCompressedTokenSupply(
  mint: string,
  config: TokenConfig
): Promise<bigint> {
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-compressed-supply',
        method: 'getCompressedTokenSupply',
        params: { mint },
      }),
    })

    if (!response.ok) return 0n

    const data = await response.json()
    if (data.error || !data.result) return 0n

    return BigInt(data.result.amount ?? 0)
  } catch {
    return 0n
  }
}
