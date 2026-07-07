/**
 * Compressed Token Queries
 *
 * Query compressed token balances via Photon indexer or DAS API.
 */

import type { TokenConfig } from '../types'
import type { CompressedTokenAccount, CompressedTokenProof } from './types'

/**
 * Query compressed token balances for an owner.
 *
 * Calls the Photon `getCompressedTokenAccountsByOwner` RPC method. Errors are
 * propagated (rather than swallowed into an empty array) so callers can tell a
 * genuinely-empty account list apart from a failed/misconfigured RPC.
 */
export async function getCompressedTokenBalances(
  owner: string,
  config: TokenConfig,
  options: { mint?: string } = {}
): Promise<CompressedTokenAccount[]> {
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'

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

  if (!response.ok) {
    throw new Error(
      `getCompressedTokenAccountsByOwner RPC failed: ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()
  if (data.error) {
    throw new Error(
      `getCompressedTokenAccountsByOwner RPC error: ${data.error.message ?? JSON.stringify(data.error)}`
    )
  }

  const value = data.result?.value
  if (!value) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return value.map((account: any) => ({
    owner: account.owner ?? owner,
    mint: account.mint ?? options.mint ?? '',
    amount: BigInt(account.amount ?? 0),
    hash: account.hash ?? '',
    leafIndex: account.leafIndex ?? 0,
    tree: account.tree ?? '',
  }))
}

/**
 * Get a merkle proof for a compressed token account.
 *
 * Not implemented. The Photon `getValidityProof` method does not return the flat
 * `{ root, proof, leafIndex }` shape this used to parse — it returns a groth16
 * `compressedProof` (a/b/c field elements) alongside `roots`, `rootIndices`,
 * and `leafIndices` arrays, which cannot be mapped to `CompressedTokenProof`
 * without a compression SDK. Returning a fabricated `{ root: '', proof: [], ... }`
 * would masquerade as a valid proof, so fail loudly.
 */
export async function getCompressedTokenProof(
  _hash: string,
  _config: TokenConfig
): Promise<CompressedTokenProof | null> {
  throw new Error(
    'getCompressedTokenProof is not implemented: the Photon getValidityProof ' +
    'method returns a groth16 compressedProof plus roots/leafIndices arrays, ' +
    'not a flat { root, proof, leafIndex }. Use the @lightprotocol/stateless.js ' +
    'SDK to obtain a usable validity proof.'
  )
}

/**
 * Get total compressed token supply for a mint.
 *
 * Not implemented. There is no `getCompressedTokenSupply` Photon RPC method, so
 * the previous call always returned the error branch (silently coerced to 0n),
 * making every mint look like it had zero supply. Fail loudly instead.
 */
export async function getCompressedTokenSupply(
  _mint: string,
  _config: TokenConfig
): Promise<bigint> {
  throw new Error(
    'getCompressedTokenSupply is not implemented: there is no getCompressedTokenSupply ' +
    'Photon RPC method. Aggregate supply from getCompressedTokenAccountsByOwner/mint ' +
    'queries or use the @lightprotocol/stateless.js SDK.'
  )
}
