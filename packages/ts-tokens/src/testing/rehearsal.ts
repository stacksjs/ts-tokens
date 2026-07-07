/**
 * NFT drop dress-rehearsal harness.
 *
 * Runs the full collection-drop lifecycle against a live cluster (localnet or
 * devnet recommended) using the real library APIs, and returns a structured,
 * per-step report so a launch can be validated end-to-end before going to
 * mainnet. Every step is timed and its failure captured rather than thrown, so
 * a partial run still yields a diagnosable report.
 */

import { Keypair, PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { setWallet, clearWallet } from '../drivers/solana/wallet'
import { createCollection, mintNFTToCollection } from '../nft/create'
import { getNFTMetadata } from '../nft/metadata'
import { isInCollection } from '../nft/query'
import { airdropIfNeeded } from './airdrop'

/** Result of a single rehearsal step. */
export interface RehearsalStep {
  name: string
  ok: boolean
  ms: number
  detail?: string
  signature?: string
  address?: string
  error?: string
}

/** Full rehearsal report. */
export interface RehearsalReport {
  network: string
  wallet: string
  passed: boolean
  totalMs: number
  steps: RehearsalStep[]
  collection?: string
  nfts: string[]
  /** Build an explorer URL for a signature or address on this network. */
  explorer: (idOrSig: string) => string
}

/** Options for {@link rehearseNftDrop}. */
export interface RehearseOptions {
  /** Number of NFTs to mint into the collection. Default 3. */
  count?: number
  /** SOL to ensure the wallet holds before starting. Default 1. */
  fundSol?: number
  /** Collection name. Default 'Rehearsal Collection'. */
  collectionName?: string
  /** Metadata URI used for the collection and every NFT. Default a placeholder. */
  uri?: string
  /**
   * A pre-funded wallet to drive the drop. When omitted a fresh keypair is
   * generated and funded via the faucet (localnet/devnet only).
   */
  wallet?: Keypair
  /** Fetch each minted asset back from chain to confirm it landed. Default true. */
  verify?: boolean
  /** Progress logger. Default no-op. */
  logger?: (line: string) => void
}

const DEFAULT_URI = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'

function explorerFor(network: string): (idOrSig: string) => string {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network === 'localnet' ? 'custom' : network}`
  return (id: string) => `https://explorer.solana.com/address/${id}${cluster}`
}

/**
 * Run a full NFT drop dress rehearsal: fund a wallet, create a collection,
 * mint N NFTs into it, and verify each on-chain.
 *
 * @example
 * ```ts
 * const report = await rehearseNftDrop(
 *   { chain: 'solana', network: 'devnet', commitment: 'confirmed', verbose: false },
 *   { count: 3, logger: console.log },
 * )
 * if (!report.passed) process.exit(1)
 * ```
 */
export async function rehearseNftDrop(
  config: TokenConfig,
  options: RehearseOptions = {}
): Promise<RehearsalReport> {
  const count = options.count ?? 3
  const fundSol = options.fundSol ?? 1
  const uri = options.uri ?? DEFAULT_URI
  const collectionName = options.collectionName ?? 'Rehearsal Collection'
  const verify = options.verify ?? true
  const log = options.logger ?? (() => {})

  const connection = createConnection(config)
  const wallet = options.wallet ?? Keypair.generate()
  // Inject the wallet so every createNFT/createCollection call signs with it.
  setWallet(wallet)

  const steps: RehearsalStep[] = []
  const nfts: string[] = []
  let collection: string | undefined
  const startedAll = Date.now()

  const runStep = async <T>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
    const started = Date.now()
    log(`→ ${name}`)
    try {
      const result = await fn()
      steps.push({ name, ok: true, ms: Date.now() - started })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      steps.push({ name, ok: false, ms: Date.now() - started, error: message })
      log(`✗ ${name}: ${message}`)
      return undefined
    }
  }

  try {
    // 1. Fund the wallet.
    const funded = await runStep('fund wallet', async () => {
      const balance = await airdropIfNeeded(connection, wallet.publicKey, fundSol, { logger: log })
      const last = steps[steps.length - 1]
      if (last) last.detail = `${balance} SOL`
      return balance
    })
    if (funded === undefined) {
      return finalize()
    }

    // 2. Create the collection NFT.
    const collectionResult = await runStep('create collection', async () => {
      const result = await createCollection({ name: collectionName, symbol: 'REH', uri }, config)
      const last = steps[steps.length - 1]
      if (last) {
        last.signature = result.signature
        last.address = result.mint
      }
      return result
    })
    if (!collectionResult) {
      return finalize()
    }
    collection = collectionResult.mint

    // 3. Mint N NFTs into the collection.
    for (let i = 1; i <= count; i++) {
      const minted = await runStep(`mint NFT #${i}`, async () => {
        const result = await mintNFTToCollection(
          { name: `${collectionName} #${i}`, symbol: 'REH', uri, collection: collection! },
          config
        )
        const last = steps[steps.length - 1]
        if (last) {
          last.signature = result.signature
          last.address = result.mint
        }
        return result
      })
      if (minted) nfts.push(minted.mint)
    }

    // 4. Verify on-chain.
    if (verify) {
      await runStep('verify collection on-chain', async () => {
        const meta = await getNFTMetadata(collection!, config)
        if (!meta) throw new Error('collection metadata not found on-chain')
        const last = steps[steps.length - 1]
        if (last) last.detail = `name="${meta.name}"`
      })

      await runStep('verify minted NFTs on-chain', async () => {
        let verified = 0
        for (const mint of nfts) {
          const meta = await getNFTMetadata(mint, config)
          if (!meta) throw new Error(`NFT ${mint} not found on-chain`)
          if (!(await isInCollection(mint, collection!, config))) {
            throw new Error(`NFT ${mint} does not reference collection ${collection}`)
          }
          verified++
        }
        const last = steps[steps.length - 1]
        if (last) last.detail = `${verified}/${nfts.length} verified`
      })
    }

    return finalize()
  } finally {
    clearWallet()
  }

  function finalize(): RehearsalReport {
    return {
      network: config.network,
      wallet: wallet.publicKey.toBase58(),
      passed: steps.length > 0 && steps.every(s => s.ok),
      totalMs: Date.now() - startedAll,
      steps,
      collection,
      nfts,
      explorer: explorerFor(config.network),
    }
  }
}

/**
 * Format a {@link RehearsalReport} as a human-readable multi-line string.
 */
export function formatRehearsalReport(report: RehearsalReport): string {
  const lines: string[] = []
  lines.push(`NFT drop rehearsal — ${report.network} — ${report.passed ? 'PASSED' : 'FAILED'}`)
  lines.push(`wallet: ${report.wallet}`)
  if (report.collection) lines.push(`collection: ${report.collection}`)
  lines.push(`minted: ${report.nfts.length} NFT(s)`)
  lines.push('')
  for (const step of report.steps) {
    const status = step.ok ? '✓' : '✗'
    const extra = step.detail ?? step.error ?? ''
    lines.push(`  ${status} ${step.name.padEnd(28)} ${String(step.ms).padStart(6)}ms  ${extra}`)
  }
  lines.push('')
  lines.push(`total: ${report.totalMs}ms`)
  return lines.join('\n')
}
