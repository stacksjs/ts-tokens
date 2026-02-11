/**
 * Solana Actions Creator
 *
 * Generate Action URLs for token transfers, NFT mints, and swaps.
 */

import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import type { ActionSpec, ActionResponse, ActionLink, ActionParameter } from './types'

/**
 * Create an ActionSpec for a SOL transfer
 */
export function createTransferAction(params: {
  recipient: string
  label?: string
  icon?: string
  amounts?: number[]
}): ActionSpec {
  const { recipient, label, icon, amounts } = params

  const actions: ActionLink[] = amounts?.length
    ? amounts.map(amount => ({
        label: `Send ${amount} SOL`,
        href: `/api/actions/transfer?to=${recipient}&amount=${amount}`,
      }))
    : [{
        label: label || 'Send SOL',
        href: `/api/actions/transfer?to=${recipient}`,
        parameters: [{
          name: 'amount',
          label: 'Amount (SOL)',
          required: true,
          type: 'number' as const,
          min: 0.001,
        }],
      }]

  return {
    icon: icon || 'https://solana.com/favicon.ico',
    title: `Transfer SOL to ${recipient.slice(0, 8)}...`,
    description: `Send SOL to ${recipient}`,
    label: label || 'Transfer',
    links: { actions },
  }
}

/**
 * Create an ActionSpec for an NFT mint
 */
export function createNFTMintAction(params: {
  name: string
  price: number
  icon: string
  maxSupply?: number
}): ActionSpec {
  return {
    icon: params.icon,
    title: `Mint: ${params.name}`,
    description: `Mint ${params.name} for ${params.price} SOL`,
    label: `Mint for ${params.price} SOL`,
    links: {
      actions: [{
        label: `Mint for ${params.price} SOL`,
        href: `/api/actions/mint?price=${params.price}`,
      }],
    },
  }
}

/**
 * Create an ActionSpec for a token swap
 */
export function createSwapAction(params: {
  inputMint: string
  outputMint: string
  inputSymbol: string
  outputSymbol: string
  icon?: string
}): ActionSpec {
  return {
    icon: params.icon || 'https://jup.ag/favicon.ico',
    title: `Swap ${params.inputSymbol} to ${params.outputSymbol}`,
    description: `Swap ${params.inputSymbol} for ${params.outputSymbol} via Jupiter`,
    label: 'Swap',
    links: {
      actions: [{
        label: 'Swap',
        href: `/api/actions/swap?inputMint=${params.inputMint}&outputMint=${params.outputMint}`,
        parameters: [{
          name: 'amount',
          label: `Amount (${params.inputSymbol})`,
          required: true,
          type: 'number' as const,
        }],
      }],
    },
  }
}

/**
 * Build a SOL transfer transaction for an action response
 */
export async function buildTransferActionTransaction(
  connection: Connection,
  from: string,
  to: string,
  amountSol: number
): Promise<ActionResponse> {
  const fromPubkey = new PublicKey(from)
  const toPubkey = new PublicKey(to)

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL)),
    })
  )

  transaction.feePayer = fromPubkey
  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  })

  return {
    transaction: serialized.toString('base64'),
    message: `Sending ${amountSol} SOL to ${to.slice(0, 8)}...`,
  }
}

/**
 * Build an SPL token transfer transaction for an action response
 */
export async function buildTokenTransferActionTransaction(
  connection: Connection,
  from: string,
  to: string,
  mint: string,
  amount: bigint
): Promise<ActionResponse> {
  const fromPubkey = new PublicKey(from)
  const toPubkey = new PublicKey(to)
  const mintPubkey = new PublicKey(mint)

  const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey)
  const destAta = await getAssociatedTokenAddress(mintPubkey, toPubkey)

  const transaction = new Transaction()

  // Create destination ATA if needed
  const destAccount = await connection.getAccountInfo(destAta)
  if (!destAccount) {
    transaction.add(
      createAssociatedTokenAccountInstruction(fromPubkey, destAta, toPubkey, mintPubkey)
    )
  }

  transaction.add(
    createTransferInstruction(sourceAta, destAta, fromPubkey, amount)
  )

  transaction.feePayer = fromPubkey
  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  })

  return {
    transaction: serialized.toString('base64'),
  }
}

/**
 * Generate a shareable action URL (blink)
 */
export function createActionUrl(baseUrl: string, actionPath: string): string {
  return `solana-action:${baseUrl}${actionPath}`
}

/**
 * Generate the actions.json manifest
 */
export function createActionsJson(rules: Array<{ pathPattern: string; apiPath: string }>): object {
  return { rules }
}
