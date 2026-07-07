/**
 * QuickNode Integration
 *
 * QuickNode RPC and add-on features.
 */

import type { DASAsset } from './types'

/**
 * Signature info as returned by the `getSignaturesForAddress` RPC method.
 *
 * This is the shape QuickNode actually returns from the standard RPC — it is
 * NOT the enriched/enhanced transaction shape. Consumers wanting decoded
 * transfers/events should fetch and parse each transaction separately.
 */
export interface SignatureInfo {
  signature: string
  slot: number
  err: unknown | null
  memo: string | null
  blockTime?: number | null
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized'
}

export interface QuickNodeConfig {
  endpoint: string
  apiKey?: string
}

export class QuickNodeClient {
  private endpoint: string
  private apiKey?: string

  constructor(config: QuickNodeConfig) {
    this.endpoint = config.endpoint
    this.apiKey = config.apiKey
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['x-api-key'] = this.apiKey

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })

    if (!response.ok) {
      throw new Error(`QuickNode RPC error: ${response.statusText}`)
    }

    const data = await response.json()
    if (data.error) throw new Error(`QuickNode RPC error: ${data.error.message}`)
    return data.result
  }

  /** Get asset by ID (DAS-compatible) */
  async getAsset(id: string): Promise<DASAsset> {
    return this.rpc('getAsset', [{ id }])
  }

  /** Get assets by owner */
  async getAssetsByOwner(owner: string, options?: { page?: number; limit?: number }): Promise<{ items: DASAsset[]; total: number }> {
    return this.rpc('getAssetsByOwner', [{ ownerAddress: owner, page: options?.page ?? 1, limit: options?.limit ?? 100 }])
  }

  /**
   * Get signatures for an address via the standard `getSignaturesForAddress` RPC.
   *
   * Returns the raw signature-info shape (signature, slot, err, memo, blockTime),
   * not an enriched/decoded transaction. This is what the underlying RPC produces.
   */
  async getTransactionHistory(address: string, options?: { limit?: number; before?: string }): Promise<SignatureInfo[]> {
    return this.rpc('getSignaturesForAddress', [address, { limit: options?.limit ?? 20, before: options?.before }])
  }

  /** Get token accounts by owner (QuickNode enhanced) */
  async getTokenAccountsByOwner(owner: string): Promise<Array<{ mint: string; amount: string; decimals: number }>> {
    const result: any = await this.rpc('getTokenAccountsByOwner', [
      owner,
      { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      { encoding: 'jsonParsed' },
    ])
    return (result.value ?? []).map((a: any) => ({
      mint: a.account.data.parsed.info.mint,
      amount: a.account.data.parsed.info.tokenAmount.amount,
      decimals: a.account.data.parsed.info.tokenAmount.decimals,
    }))
  }

  /** Get priority fee estimate (QuickNode add-on) */
  async getPriorityFeeEstimate(options?: { percentile?: number }): Promise<{ low: number; medium: number; high: number }> {
    const params: Record<string, unknown> = { last_n_blocks: 100 }
    if (options?.percentile !== undefined) params.percentile = options.percentile

    const result: any = await this.rpc('qn_estimatePriorityFees', [params])
    return {
      low: result.per_compute_unit?.low ?? 0,
      medium: result.per_compute_unit?.medium ?? 0,
      high: result.per_compute_unit?.high ?? 0,
    }
  }
}
