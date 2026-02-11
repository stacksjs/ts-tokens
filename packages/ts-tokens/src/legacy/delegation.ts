/**
 * Legacy Delegation Management
 *
 * Delegate, revoke, and query SPL Token delegation for NFTs.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { DelegateInfo } from '../types/legacy'

/**
 * Delegate an NFT to another address
 *
 * Uses SPL Token approve instruction to set a delegate on the NFT's token account.
 */
export async function delegateNFT(
  mint: string,
  delegate: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const {
    createApproveInstruction,
    getAssociatedTokenAddress,
  } = await import('@solana/spl-token')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')

  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const delegatePubkey = new PublicKey(delegate)

  // Get the ATA for this NFT
  const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  // Approve 1 token to the delegate
  const instruction = createApproveInstruction(
    ata,
    delegatePubkey,
    payer.publicKey,
    1n
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Revoke delegation on an NFT
 */
export async function revokeDelegate(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const {
    createRevokeInstruction,
    getAssociatedTokenAddress,
  } = await import('@solana/spl-token')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')

  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  const instruction = createRevokeInstruction(
    ata,
    payer.publicKey
  )

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Get delegation info for an NFT
 */
export async function getDelegateInfo(
  mint: string,
  owner: string,
  config: TokenConfig
): Promise<DelegateInfo> {
  const { PublicKey } = await import('@solana/web3.js')
  const {
    getAssociatedTokenAddress,
    getAccount,
  } = await import('@solana/spl-token')
  const { createConnection } = await import('../drivers/solana/connection')

  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)
  const ownerPubkey = new PublicKey(owner)

  const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
  const account = await getAccount(connection, ata)

  return {
    tokenAccount: ata.toBase58(),
    mint,
    owner,
    delegate: account.delegate?.toBase58() ?? null,
    delegatedAmount: account.delegatedAmount,
    isFrozen: account.isFrozen,
  }
}
