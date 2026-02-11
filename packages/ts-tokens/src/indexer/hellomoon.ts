/**
 * Hello Moon Analytics Integration
 *
 * NFT and DeFi analytics via Hello Moon API.
 */

export interface HelloMoonConfig {
  apiKey: string
}

const HELLO_MOON_API = 'https://rest-api.hellomoon.io/v0'

export class HelloMoonClient {
  private apiKey: string

  constructor(config: HelloMoonConfig) {
    this.apiKey = config.apiKey
  }

  private async post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${HELLO_MOON_API}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) throw new Error(`Hello Moon API error: ${response.statusText}`)
    const data = await response.json()
    return data.data ?? data
  }

  /** Get NFT collection stats */
  async getCollectionStats(collectionId: string): Promise<{
    floorPrice: number
    avgPrice: number
    volume24h: number
    volume7d: number
    holders: number
    listed: number
    supply: number
  }> {
    const data: any = await this.post('/nft/collection/stats', {
      helloMoonCollectionId: collectionId,
    })
    const stats = Array.isArray(data) ? data[0] : data
    return {
      floorPrice: stats?.floor_price ?? 0,
      avgPrice: stats?.avg_price ?? 0,
      volume24h: stats?.volume_24h ?? stats?.volume ?? 0,
      volume7d: stats?.volume_7d ?? 0,
      holders: stats?.num_holders ?? stats?.current_owner_count ?? 0,
      listed: stats?.num_listed ?? stats?.current_listing_count ?? 0,
      supply: stats?.supply ?? stats?.current_supply ?? 0,
    }
  }

  /** Get NFT collection mints over time */
  async getCollectionMintStats(collectionId: string): Promise<Array<{
    date: string
    mints: number
    uniqueMinters: number
  }>> {
    const data: any = await this.post('/nft/collection/mint-stats', {
      helloMoonCollectionId: collectionId,
    })
    return (Array.isArray(data) ? data : []).map((d: any) => ({
      date: d.date ?? d.block_date ?? '',
      mints: d.num_mints ?? d.mint_count ?? 0,
      uniqueMinters: d.num_unique_minters ?? d.unique_minter_count ?? 0,
    }))
  }

  /** Get token price history */
  async getTokenPriceHistory(mint: string, options?: { granularity?: 'FIVE_MIN' | 'ONE_HOUR' | 'ONE_DAY'; limit?: number }): Promise<Array<{
    timestamp: number
    price: number
    volume: number
  }>> {
    const data: any = await this.post('/token/price/history', {
      mint,
      granularity: options?.granularity ?? 'ONE_HOUR',
      limit: options?.limit ?? 24,
    })
    return (Array.isArray(data) ? data : []).map((d: any) => ({
      timestamp: d.timestamp ?? new Date(d.block_date ?? 0).getTime() / 1000,
      price: d.price ?? d.close_price ?? 0,
      volume: d.volume ?? 0,
    }))
  }

  /** Get DeFi program daily stats */
  async getDeFiProgramStats(programId: string): Promise<{
    tvl: number
    volume24h: number
    uniqueUsers24h: number
    transactions24h: number
  }> {
    const data: any = await this.post('/defi/program/stats', { programId })
    const stats = Array.isArray(data) ? data[0] : data
    return {
      tvl: stats?.tvl ?? 0,
      volume24h: stats?.volume_24h ?? 0,
      uniqueUsers24h: stats?.unique_users_24h ?? stats?.num_unique_wallets ?? 0,
      transactions24h: stats?.transactions_24h ?? stats?.num_txns ?? 0,
    }
  }

  /** Get wallet DeFi positions */
  async getWalletDeFiPositions(wallet: string): Promise<Array<{
    protocol: string
    programId: string
    positionType: string
    value: number
  }>> {
    const data: any = await this.post('/defi/wallet/positions', { ownerAccount: wallet })
    return (Array.isArray(data) ? data : []).map((d: any) => ({
      protocol: d.protocol_name ?? d.program_name ?? '',
      programId: d.program_id ?? '',
      positionType: d.position_type ?? '',
      value: d.value_usd ?? d.value ?? 0,
    }))
  }
}
