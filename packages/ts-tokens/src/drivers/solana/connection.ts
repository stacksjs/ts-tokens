/**
 * Solana Connection Management
 *
 * Handles RPC connection creation, pooling, and health monitoring.
 */

import { Connection } from '@solana/web3.js'
import type { Commitment } from '@solana/web3.js'
import type { TokenConfig, SolanaNetwork } from '../../types'
import { DEFAULT_RPC_ENDPOINTS } from '../../types'
import { retry } from '../../utils'

/**
 * Connection pool for managing multiple connections
 */
const connectionPool = new Map<string, Connection>()

/**
 * Get RPC URL for a network
 */
export function getRpcUrl(network: SolanaNetwork, customUrl?: string): string {
  return customUrl || DEFAULT_RPC_ENDPOINTS[network]
}

/**
 * Create a new Solana connection
 *
 * @param config - Token configuration
 * @returns Solana Connection instance
 */
export function createConnection(config: TokenConfig): Connection {
  const url = config.rpcUrl || getRpcUrl(config.network)
  const commitment = config.commitment as Commitment

  // Check pool first
  const poolKey = `${url}:${commitment}`
  const existing = connectionPool.get(poolKey)
  if (existing) {
    return existing
  }

  // Create new connection
  const connection = new Connection(url, {
    commitment,
    confirmTransactionInitialTimeout: config.confirmOptions?.timeout || 30000,
  })

  // Add to pool
  connectionPool.set(poolKey, connection)

  return connection
}

/**
 * Get cached connection or create new one
 *
 * @param config - Token configuration
 * @returns Solana Connection instance
 */
export function getConnection(config: TokenConfig): Connection {
  return createConnection(config)
}

/**
 * Clear connection pool
 */
export function clearConnectionPool(): void {
  connectionPool.clear()
}

/**
 * Check connection health
 *
 * @param connection - Solana connection
 * @returns True if connection is healthy
 */
export async function checkConnectionHealth(connection: Connection): Promise<boolean> {
  try {
    const version = await connection.getVersion()
    return version !== null
  } catch {
    return false
  }
}

/**
 * Get latest blockhash with retry
 *
 * @param connection - Solana connection
 * @param commitment - Commitment level
 * @returns Blockhash and last valid block height
 */
export async function getLatestBlockhash(
  connection: Connection,
  commitment?: Commitment
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  return retry(async () => {
    const result = await connection.getLatestBlockhash(commitment)
    return {
      blockhash: result.blockhash,
      lastValidBlockHeight: result.lastValidBlockHeight,
    }
  }, 3, 500)
}

/**
 * Get slot with retry
 *
 * @param connection - Solana connection
 * @returns Current slot
 */
export async function getSlot(connection: Connection): Promise<number> {
  return retry(() => connection.getSlot(), 3, 500)
}

/**
 * Get minimum balance for rent exemption
 *
 * @param connection - Solana connection
 * @param dataLength - Account data length
 * @returns Minimum lamports for rent exemption
 */
export async function getMinimumBalanceForRentExemption(
  connection: Connection,
  dataLength: number
): Promise<number> {
  return retry(() => connection.getMinimumBalanceForRentExemption(dataLength), 3, 500)
}

/**
 * Connection wrapper with additional utilities
 */
export class SolanaConnection {
  private connection: Connection
  private config: TokenConfig

  constructor(config: TokenConfig) {
    this.config = config
    this.connection = createConnection(config)
  }

  /**
   * Get the underlying Connection instance
   */
  get raw(): Connection {
    return this.connection
  }

  /**
   * Get RPC endpoint URL
   */
  get endpoint(): string {
    return this.connection.rpcEndpoint
  }

  /**
   * Get commitment level
   */
  get commitment(): Commitment {
    return this.connection.commitment || 'confirmed'
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    return checkConnectionHealth(this.connection)
  }

  /**
   * Get latest blockhash
   */
  async getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return getLatestBlockhash(this.connection, this.commitment)
  }

  /**
   * Get current slot
   */
  async getSlot(): Promise<number> {
    return getSlot(this.connection)
  }

  /**
   * Get balance in lamports
   */
  async getBalance(address: string): Promise<bigint> {
    const { PublicKey } = await import('@solana/web3.js')
    const pubkey = new PublicKey(address)
    const balance = await retry(() => this.connection.getBalance(pubkey), 3, 500)
    return BigInt(balance)
  }

  /**
   * Get account info
   */
  async getAccountInfo(address: string): Promise<{
    lamports: bigint
    owner: string
    data: Uint8Array
    executable: boolean
  } | null> {
    const { PublicKey } = await import('@solana/web3.js')
    const pubkey = new PublicKey(address)
    const info = await retry(() => this.connection.getAccountInfo(pubkey), 3, 500)

    if (!info) {
      return null
    }

    return {
      lamports: BigInt(info.lamports),
      owner: info.owner.toBase58(),
      data: info.data,
      executable: info.executable,
    }
  }

  /**
   * Get multiple accounts
   */
  async getMultipleAccounts(addresses: string[]): Promise<Array<{
    address: string
    lamports: bigint
    owner: string
    data: Uint8Array
  } | null>> {
    const { PublicKey } = await import('@solana/web3.js')
    const pubkeys = addresses.map(a => new PublicKey(a))
    const accounts = await retry(
      () => this.connection.getMultipleAccountsInfo(pubkeys),
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
   * Request airdrop (devnet/testnet only)
   */
  async requestAirdrop(address: string, lamports: number): Promise<string> {
    const { PublicKey } = await import('@solana/web3.js')
    const pubkey = new PublicKey(address)
    const signature = await this.connection.requestAirdrop(pubkey, lamports)

    // Wait for confirmation
    await this.connection.confirmTransaction(signature, this.commitment)

    return signature
  }

  /**
   * Get minimum rent exemption
   */
  async getMinRentExemption(dataLength: number): Promise<number> {
    return getMinimumBalanceForRentExemption(this.connection, dataLength)
  }
}

/**
 * Create a SolanaConnection instance
 */
export function createSolanaConnection(config: TokenConfig): SolanaConnection {
  return new SolanaConnection(config)
}
