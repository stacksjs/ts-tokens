/**
 * Programmable NFT Transfers
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  ProgrammableNFT,
  TransferRule,
  TransferValidation,
  PNFTTransferOptions,
  PNFTResult,
  PNFTTransferResult,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { getPNFTAddress } from './program'
import {
  createTransferPNFTInstruction,
  createDelegateTransferInstruction,
  createRevokeDelegateInstruction,
} from './instructions'
import { getPNFT } from './create'
import { getAllRules } from './rules'

/**
 * Validate if transfer is allowed
 */
export async function canTransfer(
  connection: Connection,
  mint: PublicKey,
  from: PublicKey,
  to: PublicKey
): Promise<TransferValidation> {
  const pnft = await getPNFT(connection, mint)

  if (!pnft) {
    return { allowed: true, failedRules: [] }
  }

  const rules = await getAllRules(connection, mint)
  const failedRules: TransferValidation['failedRules'] = []
  let royaltyAmount: bigint | undefined

  for (const rule of rules) {
    if (!rule.enabled) continue

    const result = await validateTransferRule(connection, rule, pnft, from, to)
    if (!result.allowed) {
      failedRules.push(rule.type)
    }
    if (rule.type === 'royalty_enforcement') {
      royaltyAmount = result.royaltyAmount
    }
  }

  if (failedRules.length > 0) {
    return {
      allowed: false,
      reason: getFailureReason(failedRules, pnft),
      failedRules,
      royaltyAmount,
    }
  }

  return { allowed: true, failedRules: [], royaltyAmount }
}

/**
 * Validate a single rule
 */
async function validateTransferRule(
  connection: Connection,
  rule: TransferRule,
  pnft: ProgrammableNFT,
  from: PublicKey,
  to: PublicKey
): Promise<{ allowed: boolean; royaltyAmount?: bigint }> {
  switch (rule.type) {
    case 'soulbound':
      return { allowed: false }

    case 'allow_list':
      return {
        allowed: rule.addresses.some(a => a.equals(to)),
      }

    case 'deny_list':
      return {
        allowed: !rule.addresses.some(a => a.equals(to)),
      }

    case 'cooldown_period': {
      const now = Math.floor(Date.now() / 1000)
      const elapsed = now - pnft.lastTransfer
      return { allowed: elapsed >= rule.periodSeconds }
    }

    case 'max_transfers':
      return { allowed: pnft.transferCount < rule.maxTransfers }

    case 'holder_gate': {
      // Would check if recipient holds required token
      return { allowed: true }
    }

    case 'royalty_enforcement':
      // Royalty is always "allowed" but requires payment
      return { allowed: true, royaltyAmount: 0n } // Would calculate actual amount

    case 'program_gate':
      // Would check transaction includes required program
      return { allowed: true }

    case 'creator_approval':
      // Would check for creator signature
      return { allowed: true }

    default:
      return { allowed: true }
  }
}

/**
 * Get human-readable failure reason
 */
function getFailureReason(
  failedRules: TransferValidation['failedRules'],
  pnft: ProgrammableNFT
): string {
  const reasons: string[] = []

  for (const ruleType of failedRules) {
    switch (ruleType) {
      case 'soulbound':
        reasons.push('NFT is soulbound and cannot be transferred')
        break
      case 'allow_list':
        reasons.push('Recipient is not on the allow list')
        break
      case 'deny_list':
        reasons.push('Recipient is on the deny list')
        break
      case 'cooldown_period': {
        const rule = pnft.rules.find(r => r.type === 'cooldown_period')
        if (rule && rule.type === 'cooldown_period') {
          const now = Math.floor(Date.now() / 1000)
          const remaining = rule.periodSeconds - (now - pnft.lastTransfer)
          reasons.push(`Cooldown period active (${formatDuration(remaining)} remaining)`)
        }
        break
      }
      case 'max_transfers': {
        const rule = pnft.rules.find(r => r.type === 'max_transfers')
        if (rule && rule.type === 'max_transfers') {
          reasons.push(`Maximum transfers reached (${pnft.transferCount}/${rule.maxTransfers})`)
        }
        break
      }
      case 'holder_gate':
        reasons.push('Recipient does not hold required token')
        break
      case 'creator_approval':
        reasons.push('Creator approval required')
        break
      default:
        reasons.push(`Transfer blocked by ${ruleType} rule`)
    }
  }

  return reasons.join('; ')
}

/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

/**
 * Transfer programmable NFT
 */
export async function transferPNFT(
  options: PNFTTransferOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTTransferResult> {
  const { mint, from, to, payRoyalty = true } = options

  const connection = createConnection(config)
  const payer = loadWallet(config)

  // Validate transfer
  const validation = await canTransfer(connection, mint, from, to)

  if (!validation.allowed) {
    throw new Error(`Transfer not allowed: ${validation.reason}`)
  }

  const pnftAccount = getPNFTAddress(mint)

  const { getAssociatedTokenAddress } = await import('@solana/spl-token')
  const fromToken = await getAssociatedTokenAddress(mint, from)
  const toToken = await getAssociatedTokenAddress(mint, to)

  const instruction = createTransferPNFTInstruction(
    payer.publicKey,
    pnftAccount,
    mint,
    fromToken,
    toToken,
    to,
    payRoyalty
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    royaltyPaid: validation.royaltyAmount,
  }
}

/**
 * Delegate transfer authority
 */
export async function delegateTransfer(
  mint: PublicKey,
  delegate: PublicKey,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const pnftAccount = getPNFTAddress(mint)

  const instruction = createDelegateTransferInstruction(
    payer.publicKey,
    pnftAccount,
    delegate
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    pnftAccount: pnftAccount.toBase58(),
  }
}

/**
 * Revoke transfer delegation
 */
export async function revokeDelegate(
  mint: PublicKey,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const pnftAccount = getPNFTAddress(mint)

  const instruction = createRevokeDelegateInstruction(payer.publicKey, pnftAccount)

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    txOptions
  )

  transaction.partialSign(payer)
  const result = await sendAndConfirmTransaction(connection, transaction, txOptions)

  return {
    signature: result.signature,
    confirmed: result.confirmed,
    pnftAccount: pnftAccount.toBase58(),
  }
}

/**
 * Get transfer history for pNFT
 */
export async function getTransferHistory(
  connection: Connection,
  mint: PublicKey,
  limit: number = 20
): Promise<Array<{
  from: PublicKey
  to: PublicKey
  timestamp: number
  signature: string
  royaltyPaid?: bigint
}>> {
  // In production, would fetch transfer history
  return []
}

/**
 * Estimate royalty for transfer
 */
export async function estimateRoyalty(
  connection: Connection,
  mint: PublicKey,
  salePrice: bigint
): Promise<{ amount: bigint; recipients: Array<{ address: PublicKey; amount: bigint }> }> {
  const pnft = await getPNFT(connection, mint)

  if (!pnft) {
    return { amount: 0n, recipients: [] }
  }

  const royaltyRule = pnft.rules.find(r => r.type === 'royalty_enforcement')
  if (!royaltyRule || royaltyRule.type !== 'royalty_enforcement') {
    return { amount: 0n, recipients: [] }
  }

  const totalRoyalty = (salePrice * BigInt(royaltyRule.royaltyBps)) / 10000n

  const recipients = royaltyRule.recipients.map(r => ({
    address: r.address,
    amount: (totalRoyalty * BigInt(r.share)) / 100n,
  }))

  return { amount: totalRoyalty, recipients }
}
