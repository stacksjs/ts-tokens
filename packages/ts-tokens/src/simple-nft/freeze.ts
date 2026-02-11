/**
 * Simple NFT Freeze, Thaw, Delegate, and Revoke
 *
 * Token account freeze/thaw and SPL token delegation operations.
 * Delegates to token/authority.ts for freeze/thaw and spl-token for delegation.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { FreezeResult, DelegateResult } from './types'
import type { TokenConfig } from '../types'

/**
 * Freeze an NFT token account
 *
 * Prevents the NFT from being transferred. Requires freeze authority.
 * Delegates to `freezeAccount()` from `token/authority.ts`.
 *
 * @param connection - Solana connection
 * @param mint - NFT mint address
 * @param tokenAccount - Token account to freeze
 * @param config - ts-tokens configuration
 * @returns Freeze result with signature, mint, account
 */
export async function freezeNFT(
  connection: Connection,
  mint: PublicKey,
  tokenAccount: PublicKey,
  config: TokenConfig
): Promise<FreezeResult> {
  const { freezeAccount } = await import('../token/authority')

  const result = await freezeAccount(
    mint.toBase58(),
    tokenAccount.toBase58(),
    config
  )

  return {
    signature: result.signature,
    mint: mint.toBase58(),
    account: tokenAccount.toBase58(),
  }
}

/**
 * Thaw (unfreeze) an NFT token account
 *
 * Re-enables transfers for a frozen NFT. Requires freeze authority.
 * Delegates to `thawAccount()` from `token/authority.ts`.
 *
 * @param connection - Solana connection
 * @param mint - NFT mint address
 * @param tokenAccount - Token account to thaw
 * @param config - ts-tokens configuration
 * @returns Freeze result with signature, mint, account
 */
export async function thawNFT(
  connection: Connection,
  mint: PublicKey,
  tokenAccount: PublicKey,
  config: TokenConfig
): Promise<FreezeResult> {
  const { thawAccount } = await import('../token/authority')

  const result = await thawAccount(
    mint.toBase58(),
    tokenAccount.toBase58(),
    config
  )

  return {
    signature: result.signature,
    mint: mint.toBase58(),
    account: tokenAccount.toBase58(),
  }
}

/**
 * Delegate an NFT to another address
 *
 * Approves a delegate to transfer the NFT on behalf of the owner.
 * Uses SPL Token approve instruction.
 *
 * @param connection - Solana connection
 * @param mint - NFT mint address
 * @param delegate - Address to delegate to
 * @param config - ts-tokens configuration
 * @returns Delegate result with signature, mint, delegate
 */
export async function delegateNFT(
  connection: Connection,
  mint: PublicKey,
  delegate: PublicKey,
  config: TokenConfig
): Promise<DelegateResult> {
  const { getAssociatedTokenAddress, createApproveInstruction } = await import('@solana/spl-token')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { loadWallet } = await import('../drivers/solana/wallet')

  const payer = loadWallet(config)
  const ata = await getAssociatedTokenAddress(mint, payer.publicKey)

  const instruction = createApproveInstruction(
    ata,
    delegate,
    payer.publicKey,
    1n // NFT amount is always 1
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    signature: result.signature,
    mint: mint.toBase58(),
    delegate: delegate.toBase58(),
  }
}

/**
 * Revoke NFT delegation
 *
 * Removes a delegate's ability to transfer the NFT.
 * Uses SPL Token revoke instruction.
 *
 * @param connection - Solana connection
 * @param mint - NFT mint address
 * @param config - ts-tokens configuration
 * @returns Delegate result with signature, mint, delegate (empty string)
 */
export async function revokeNFTDelegate(
  connection: Connection,
  mint: PublicKey,
  config: TokenConfig
): Promise<DelegateResult> {
  const { getAssociatedTokenAddress, createRevokeInstruction } = await import('@solana/spl-token')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { loadWallet } = await import('../drivers/solana/wallet')

  const payer = loadWallet(config)
  const ata = await getAssociatedTokenAddress(mint, payer.publicKey)

  const instruction = createRevokeInstruction(
    ata,
    payer.publicKey
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    signature: result.signature,
    mint: mint.toBase58(),
    delegate: '',
  }
}
