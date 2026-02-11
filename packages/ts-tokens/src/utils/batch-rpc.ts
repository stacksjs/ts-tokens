/**
 * Batch RPC & Connection Pooling
 */
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

export interface BatchRpcOptions {
  connection: Connection
  batchSize?: number // default 100 (Solana max for getMultipleAccounts)
}

/**
 * Batch fetch multiple accounts in a single RPC call
 */
export async function getMultipleAccountsBatched(
  connection: Connection,
  addresses: PublicKey[],
  batchSize = 100,
): Promise<Map<string, { data: Buffer; executable: boolean; lamports: number; owner: PublicKey } | null>> {
  const results = new Map<string, any>()

  // Chunk addresses into batches of batchSize
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize)
    const accounts = await connection.getMultipleAccountsInfo(batch)

    batch.forEach((addr, idx) => {
      const account = accounts[idx]
      results.set(addr.toBase58(), account ? {
        data: account.data,
        executable: account.executable,
        lamports: account.lamports,
        owner: account.owner,
      } : null)
    })
  }

  return results
}

/**
 * Prefetch related accounts for a token operation
 * Given a mint and owner, fetches mint account, token account, and metadata in one batch
 */
export async function prefetchTokenAccounts(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
): Promise<{ mint: any; tokenAccount: any; metadata: any }> {
  // Derive associated token account
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID,
  )

  const accounts = await getMultipleAccountsBatched(connection, [mint, ata, metadataAddress])

  return {
    mint: accounts.get(mint.toBase58()),
    tokenAccount: accounts.get(ata.toBase58()),
    metadata: accounts.get(metadataAddress.toBase58()),
  }
}

/**
 * Connection pool for high-throughput operations
 */
export class ConnectionPool {
  private connections: Connection[]
  private currentIndex = 0

  constructor(endpoints: string[], config?: { commitment?: 'processed' | 'confirmed' | 'finalized' }) {
    if (endpoints.length === 0) throw new Error('At least one endpoint is required')
    this.connections = endpoints.map(url => new Connection(url, config?.commitment ?? 'confirmed'))
  }

  /** Get next connection (round-robin) */
  getConnection(): Connection {
    const conn = this.connections[this.currentIndex % this.connections.length]
    this.currentIndex++
    return conn
  }

  /** Get all connections */
  getAll(): Connection[] {
    return [...this.connections]
  }

  /** Pool size */
  get size(): number {
    return this.connections.length
  }
}

/**
 * Send multiple transactions in parallel with configurable concurrency
 */
export async function sendTransactionsParallel(
  connection: Connection,
  transactions: (Transaction | VersionedTransaction)[],
  options?: {
    maxConcurrency?: number
    skipPreflight?: boolean
    onProgress?: (completed: number, total: number) => void
  },
): Promise<{ signatures: string[]; errors: Array<{ index: number; error: Error }> }> {
  const { maxConcurrency = 5, skipPreflight = false, onProgress } = options ?? {}
  const signatures: string[] = []
  const errors: Array<{ index: number; error: Error }> = []
  let completed = 0

  // Process in chunks of maxConcurrency
  for (let i = 0; i < transactions.length; i += maxConcurrency) {
    const batch = transactions.slice(i, i + maxConcurrency)
    const promises = batch.map(async (tx, batchIdx) => {
      const globalIdx = i + batchIdx
      try {
        let sig: string
        if (tx instanceof Transaction) {
          sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight })
        } else {
          sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight })
        }
        signatures[globalIdx] = sig
      } catch (error) {
        errors.push({ index: globalIdx, error: error as Error })
        signatures[globalIdx] = ''
      } finally {
        completed++
        onProgress?.(completed, transactions.length)
      }
    })
    await Promise.all(promises)
  }

  return { signatures, errors }
}
