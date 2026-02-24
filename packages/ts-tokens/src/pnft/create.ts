/**
 * Programmable NFT Creation
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import { Keypair } from '@solana/web3.js'
import type { TokenConfig, TransactionOptions } from '../types'
import type {
  ProgrammableNFT,
  CreatePNFTOptions,
  RuleSet,
  CreateRuleSetOptions,
  PNFTResult,
} from './types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { getPNFTAddress, getRuleSetAddress, serializeRuleData } from './program'
import {
  createCreatePNFTInstruction,
  createCreateSoulboundInstruction,
  createCreateRuleSetInstruction,
  createLockPNFTInstruction,
  createUnlockPNFTInstruction,
  createRecoverSoulboundInstruction,
} from './instructions'
import { validateRule } from './rules'

/**
 * Create a programmable NFT
 */
export async function createPNFT(
  options: CreatePNFTOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  if (options.rules) {
    for (const rule of options.rules) {
      const validation = validateRule(rule)
      if (!validation.valid) {
        throw new Error(`Invalid rule ${rule.type}: ${validation.errors.join(', ')}`)
      }
    }
  }

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintKeypair = Keypair.generate()
  const pnftAccount = getPNFTAddress(mintKeypair.publicKey)

  const rulesData = options.rules
    ? Buffer.concat(options.rules.map(serializeRuleData))
    : Buffer.alloc(0)

  const instruction = createCreatePNFTInstruction(
    payer.publicKey,
    pnftAccount,
    mintKeypair.publicKey,
    options.name,
    options.symbol,
    options.uri,
    rulesData
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
    mint: mintKeypair.publicKey.toBase58(),
    pnftAccount: pnftAccount.toBase58(),
  }
}

/**
 * Create a soulbound token (non-transferable NFT)
 */
export async function createSoulbound(
  options: Omit<CreatePNFTOptions, 'rules'> & {
    recoveryAuthority?: PublicKey
  },
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintKeypair = Keypair.generate()
  const pnftAccount = getPNFTAddress(mintKeypair.publicKey)

  const instruction = createCreateSoulboundInstruction(
    payer.publicKey,
    pnftAccount,
    mintKeypair.publicKey,
    options.name,
    options.symbol,
    options.uri,
    options.recoveryAuthority
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
    mint: mintKeypair.publicKey.toBase58(),
    pnftAccount: pnftAccount.toBase58(),
  }
}

/**
 * Create a rule set for a collection
 */
export async function createRuleSet(
  options: CreateRuleSetOptions,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const collection = options.collection ?? Keypair.generate().publicKey
  const ruleSetAccount = getRuleSetAddress(payer.publicKey, collection)

  const rulesData = Buffer.concat(options.rules.map(serializeRuleData))

  const instruction = createCreateRuleSetInstruction(
    payer.publicKey,
    ruleSetAccount,
    collection,
    options.isMutable ?? true,
    rulesData
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
    ruleSet: ruleSetAccount.toBase58(),
  }
}

/**
 * Get pNFT data
 */
export async function getPNFT(
  _connection: Connection,
  _mint: PublicKey
): Promise<ProgrammableNFT | null> {
  // In production, would fetch and parse pNFT account
  return null
}

/**
 * Get rule set
 */
export async function getRuleSetData(
  _connection: Connection,
  _address: PublicKey
): Promise<RuleSet | null> {
  // In production, would fetch and parse rule set account
  return null
}

/**
 * Check if NFT is programmable
 */
export async function isProgrammableNFT(
  connection: Connection,
  mint: PublicKey
): Promise<boolean> {
  const pnft = await getPNFT(connection, mint)
  return pnft !== null
}

/**
 * Check if NFT is soulbound
 */
export async function isSoulbound(
  connection: Connection,
  mint: PublicKey
): Promise<boolean> {
  const pnft = await getPNFT(connection, mint)
  if (!pnft) return false

  return pnft.rules.some(r => r.type === 'soulbound' && r.enabled)
}

/**
 * Get pNFT state
 */
export async function getPNFTState(
  connection: Connection,
  mint: PublicKey
): Promise<'unlocked' | 'listed' | 'staked' | 'frozen' | null> {
  const pnft = await getPNFT(connection, mint)
  return pnft?.state ?? null
}

/**
 * Lock pNFT (for staking, listing, etc.)
 */
export async function lockPNFT(
  mint: PublicKey,
  state: 'listed' | 'staked',
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const pnftAccount = getPNFTAddress(mint)

  const instruction = createLockPNFTInstruction(payer.publicKey, pnftAccount, state)

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
 * Unlock pNFT
 */
export async function unlockPNFT(
  mint: PublicKey,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const pnftAccount = getPNFTAddress(mint)

  const instruction = createUnlockPNFTInstruction(payer.publicKey, pnftAccount)

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
 * Recover soulbound token (emergency recovery)
 */
export async function recoverSoulbound(
  mint: PublicKey,
  newOwner: PublicKey,
  config: TokenConfig,
  txOptions?: TransactionOptions
): Promise<PNFTResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const pnftAccount = getPNFTAddress(mint)

  const { getAssociatedTokenAddress } = await import('@solana/spl-token')
  const fromToken = await getAssociatedTokenAddress(mint, payer.publicKey)
  const toToken = await getAssociatedTokenAddress(mint, newOwner)

  const instruction = createRecoverSoulboundInstruction(
    payer.publicKey,
    pnftAccount,
    mint,
    fromToken,
    toToken,
    newOwner
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
 * Get pNFTs by _owner
 */
export async function getPNFTsByOwner(
  _connection: Connection,
  _owner: PublicKey
): Promise<ProgrammableNFT[]> {
  // In production, would query pNFT accounts
  return []
}

/**
 * Get pNFTs by rule set
 */
export async function getPNFTsByRuleSet(
  _connection: Connection,
  _ruleSet: PublicKey
): Promise<ProgrammableNFT[]> {
  // In production, would query pNFTs using this rule set
  return []
}
