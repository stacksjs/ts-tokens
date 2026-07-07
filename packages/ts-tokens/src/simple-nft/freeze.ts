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
 * Ensure the loaded wallet is the mint's freeze authority.
 *
 * For master-edition NFTs the freeze authority is the edition PDA, not the
 * wallet, so a plain SPL freeze/thaw signed by the wallet would always fail.
 * This guard fetches the mint and throws a clear error in that case.
 */
async function assertWalletIsFreezeAuthority(
  mint: PublicKey,
  operation: string,
  config: TokenConfig
): Promise<void> {
  const { getMint } = await import('@solana/spl-token')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')

  const connection = createConnection(config)
  const wallet = loadWallet(config)
  const mintInfo = await getMint(connection, mint)

  if (!mintInfo.freezeAuthority) {
    throw new Error(
      `${operation} is not possible: mint ${mint.toBase58()} has no freeze authority.`
    )
  }

  if (!mintInfo.freezeAuthority.equals(wallet.publicKey)) {
    throw new Error(
      `${operation} is not possible with this wallet: the mint's freeze authority is ${mintInfo.freezeAuthority.toBase58()}, not ${wallet.publicKey.toBase58()}. ` +
        `Master-edition NFTs delegate freeze authority to the edition PDA and must be frozen/thawed via the Token Metadata freezeDelegatedAccount/thawDelegatedAccount instructions, not a raw SPL freeze.`
    )
  }
}

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
  _connection: Connection,
  mint: PublicKey,
  tokenAccount: PublicKey,
  config: TokenConfig
): Promise<FreezeResult> {
  await assertWalletIsFreezeAuthority(mint, 'freezeNFT', config)

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
  _connection: Connection,
  mint: PublicKey,
  tokenAccount: PublicKey,
  config: TokenConfig
): Promise<FreezeResult> {
  await assertWalletIsFreezeAuthority(mint, 'thawNFT', config)

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
