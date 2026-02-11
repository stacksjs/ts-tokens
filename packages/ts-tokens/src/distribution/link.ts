/**
 * Claim Link Generation
 *
 * Generate claim links with embedded keypairs, fund links, and check status.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import type { TokenConfig } from '../types'
import type {
  ClaimLink,
  CreateClaimLinkOptions,
  DistributionState,
  SerializedClaimLink,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
// @ts-ignore - bs58 has no type declarations
import bs58 from 'bs58'

const DEFAULT_BASE_URL = 'https://claim.ts-tokens.dev'

/**
 * Get distribution state file path
 */
export function getDistributionStatePath(): string {
  return path.join(os.homedir(), '.ts-tokens', 'distribution-state.json')
}

/**
 * Load distribution state
 */
export function loadDistributionState(storePath?: string): DistributionState {
  const filePath = storePath ?? getDistributionStatePath()
  if (!fs.existsSync(filePath)) return { links: {}, campaigns: {} }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/**
 * Save distribution state
 */
export function saveDistributionState(state: DistributionState, storePath?: string): void {
  const filePath = storePath ?? getDistributionStatePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), { mode: 0o600 })
}

/**
 * Generate a unique link ID
 */
function generateId(): string {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create a claim link with an embedded ephemeral keypair
 */
export async function createClaimLink(
  options: CreateClaimLinkOptions,
  config: TokenConfig
): Promise<ClaimLink> {
  const ephemeralKeypair = Keypair.generate()
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL
  const secretKeyBase58 = bs58.encode(ephemeralKeypair.secretKey)

  const url = `${baseUrl}#${secretKeyBase58}`

  const link: ClaimLink = {
    id: generateId(),
    url,
    publicKey: ephemeralKeypair.publicKey.toBase58(),
    amount: options.amount,
    mint: options.mint,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: options.expiresInSeconds
      ? Date.now() + options.expiresInSeconds * 1000
      : undefined,
  }

  // Persist
  const state = loadDistributionState()
  state.links[link.id] = serializeLink(link, ephemeralKeypair.secretKey)
  saveDistributionState(state)

  return link
}

/**
 * Fund a claim link by sending SOL/tokens to the ephemeral address
 */
export async function fundClaimLink(
  linkId: string,
  config: TokenConfig
): Promise<{ signature: string }> {
  const state = loadDistributionState()
  const serialized = state.links[linkId]
  if (!serialized) throw new Error(`Claim link not found: ${linkId}`)
  if (serialized.status !== 'pending') {
    throw new Error(`Link is already ${serialized.status}`)
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const ephemeralPubkey = new PublicKey(serialized.publicKey)

  const instructions = []

  if (serialized.mint) {
    // SPL token: transfer tokens to ephemeral ATA
    const mintPubkey = new PublicKey(serialized.mint)
    const sourceAta = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)
    const destAta = await getAssociatedTokenAddress(mintPubkey, ephemeralPubkey)

    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destAta,
        ephemeralPubkey,
        mintPubkey
      )
    )

    instructions.push(
      createTransferInstruction(
        sourceAta,
        destAta,
        payer.publicKey,
        BigInt(serialized.amount)
      )
    )

    // Also send some SOL for claim transaction fees
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: ephemeralPubkey,
        lamports: BigInt(LAMPORTS_PER_SOL / 100), // 0.01 SOL for fees
      })
    )
  } else {
    // SOL transfer
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: ephemeralPubkey,
        lamports: BigInt(serialized.amount),
      })
    )
  }

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  // Update state
  serialized.status = 'funded'
  serialized.fundSignature = result.signature
  saveDistributionState(state)

  return { signature: result.signature }
}

/**
 * Get claim link status
 */
export function getClaimLinkStatus(linkId: string): ClaimLink | null {
  const state = loadDistributionState()
  const serialized = state.links[linkId]
  if (!serialized) return null

  return {
    id: serialized.id,
    url: serialized.url,
    publicKey: serialized.publicKey,
    amount: BigInt(serialized.amount),
    mint: serialized.mint,
    status: serialized.status,
    claimedBy: serialized.claimedBy,
    fundSignature: serialized.fundSignature,
    claimSignature: serialized.claimSignature,
    createdAt: serialized.createdAt,
    expiresAt: serialized.expiresAt,
  }
}

/**
 * List all claim links
 */
export function listClaimLinks(filter?: { status?: string }): ClaimLink[] {
  const state = loadDistributionState()
  let links = Object.values(state.links).map(s => ({
    id: s.id,
    url: s.url,
    publicKey: s.publicKey,
    amount: BigInt(s.amount),
    mint: s.mint,
    status: s.status,
    claimedBy: s.claimedBy,
    fundSignature: s.fundSignature,
    claimSignature: s.claimSignature,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  })) as ClaimLink[]

  if (filter?.status) {
    links = links.filter(l => l.status === filter.status)
  }

  return links
}

/**
 * Serialize a claim link for storage
 */
function serializeLink(link: ClaimLink, secretKey: Uint8Array): SerializedClaimLink {
  return {
    id: link.id,
    url: link.url,
    publicKey: link.publicKey,
    secretKey: Buffer.from(secretKey).toString('base64'),
    amount: link.amount.toString(),
    mint: link.mint,
    status: link.status,
    claimedBy: link.claimedBy,
    fundSignature: link.fundSignature,
    claimSignature: link.claimSignature,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  }
}
