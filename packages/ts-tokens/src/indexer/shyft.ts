/**
 * Shyft API Integration
 *
 * NFT and token data via Shyft's REST API.
 */

import { PublicKey } from '@solana/web3.js'
import type { DASAsset } from './types'

export interface ShyftConfig {
  apiKey: string
  network?: 'mainnet-beta' | 'devnet'
}

const SHYFT_API = 'https://api.shyft.to/sol/v1'

export class ShyftClient {
  private apiKey: string
  private network: string

  constructor(config: ShyftConfig) {
    this.apiKey = config.apiKey
    this.network = config.network ?? 'mainnet-beta'
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${SHYFT_API}${path}`)
    url.searchParams.set('network', this.network)
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    }

    const response = await fetch(url.toString(), {
      headers: { 'x-api-key': this.apiKey },
    })

    if (!response.ok) throw new Error(`Shyft API error: ${response.statusText}`)
    const data = await response.json()
    if (!data.success) throw new Error(`Shyft API error: ${data.message}`)
    return data.result
  }

  /** Get NFT details */
  async getNFT(mint: string): Promise<any> {
    return this.get('/nft/read', { token_address: mint })
  }

  /** Get all NFTs owned by an address */
  async getNFTsByOwner(owner: string, options?: { page?: number; size?: number }): Promise<any[]> {
    return this.get('/nft/read_all', {
      owner,
      page: String(options?.page ?? 1),
      size: String(options?.size ?? 20),
    })
  }

  /** Get token balance */
  async getTokenBalance(owner: string, mint: string): Promise<{ balance: number; address: string }> {
    return this.get('/token/balance', { wallet: owner, token: mint })
  }

  /** Get all token balances for a wallet */
  async getAllTokenBalances(owner: string): Promise<Array<{ address: string; balance: number; info: any }>> {
    return this.get('/wallet/all_tokens', { wallet: owner })
  }

  /** Get transaction history */
  async getTransactions(address: string, options?: { limit?: number; before?: string }): Promise<any[]> {
    const params: Record<string, string> = { account: address }
    if (options?.limit) params.tx_num = String(options.limit)
    if (options?.before) params.before_tx_signature = options.before
    return this.get('/transaction/history', params)
  }

  /** Get collection NFTs */
  async getCollectionNFTs(collectionAddress: string, options?: { page?: number; size?: number }): Promise<any[]> {
    return this.get('/nft/read_all', {
      collection_address: collectionAddress,
      page: String(options?.page ?? 1),
      size: String(options?.size ?? 20),
    })
  }
}
