/**
 * Legacy Burn & Close Facade
 *
 * Burn NFTs and close empty token accounts.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { ProgressCallback, BatchResult } from '../types/legacy'
import { executeBatch } from './batch'

/**
 * Burn an NFT with full cleanup
 */
export async function burnNFT(
  mint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { burnNFTFull } = await import('../nft/burn')
  return burnNFTFull(mint, config, options)
}

/**
 * Burn a print edition NFT
 *
 * Uses the BurnEditionNft instruction to burn a printed edition
 * and decrement the master edition supply counter.
 */
export async function burnEdition(
  editionMint: string,
  masterMint: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
  } = await import('@solana/spl-token')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { findMetadataPda, findMasterEditionPda } = await import('../programs/token-metadata/pda')
  const { burnEditionNft } = await import('../programs/token-metadata/instructions')

  const connection = createConnection(config)
  const payer = loadWallet(config)

  const editionMintPubkey = new PublicKey(editionMint)
  const masterMintPubkey = new PublicKey(masterMint)

  const [editionMetadata] = findMetadataPda(editionMintPubkey)
  const [printEditionAccount] = findMasterEditionPda(editionMintPubkey)
  const [masterEditionAccount] = findMasterEditionPda(masterMintPubkey)

  const printEditionTokenAccount = await getAssociatedTokenAddress(editionMintPubkey, payer.publicKey)
  const masterEditionTokenAccount = await getAssociatedTokenAddress(masterMintPubkey, payer.publicKey)

  // Calculate edition marker PDA
  // Need to read the edition number first
  const editionAccountInfo = await connection.getAccountInfo(printEditionAccount)
  if (!editionAccountInfo) {
    throw new Error(`Edition account not found for mint: ${editionMint}`)
  }

  const editionNumber = editionAccountInfo.data.readBigUInt64LE(33)
  const editionMarkerNumber = Number(editionNumber) / 248
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

  const [editionMarkerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      masterMintPubkey.toBuffer(),
      Buffer.from('edition'),
      Buffer.from(Math.floor(editionMarkerNumber).toString()),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )

  const instruction = burnEditionNft({
    metadata: editionMetadata,
    owner: payer.publicKey,
    printEditionMint: editionMintPubkey,
    masterEditionMint: masterMintPubkey,
    printEditionTokenAccount,
    masterEditionTokenAccount,
    masterEditionAccount,
    printEditionAccount,
    editionMarkerPda,
  })

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
 * Batch burn multiple NFTs
 */
export async function batchBurnNFTs(
  mints: string[],
  config: TokenConfig,
  options?: {
    batchSize?: number
    delayMs?: number
    onProgress?: ProgressCallback
  }
): Promise<BatchResult<string>> {
  return executeBatch({
    items: mints,
    processor: async (mint) => {
      const result = await burnNFT(mint, config)
      return result.signature
    },
    batchSize: options?.batchSize,
    delayMs: options?.delayMs,
    onProgress: options?.onProgress,
  })
}

/**
 * Close empty token accounts and reclaim SOL
 *
 * Scans for token accounts with zero balance owned by the wallet
 * and closes them to reclaim rent.
 */
export async function closeEmptyAccounts(
  config: TokenConfig,
  options?: {
    mint?: string
    onProgress?: ProgressCallback
  }
): Promise<BatchResult<string>> {
  const { PublicKey } = await import('@solana/web3.js')
  const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { closeTokenAccount } = await import('../token/account')

  const connection = createConnection(config)
  const payer = loadWallet(config)

  // Get all token accounts for the wallet
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    payer.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  )

  // Filter to empty accounts
  const emptyAccounts = tokenAccounts.value
    .filter(ta => {
      const info = ta.account.data.parsed.info
      const isEmpty = info.tokenAmount.uiAmount === 0
      const matchesMint = options?.mint
        ? info.mint === options.mint
        : true
      return isEmpty && matchesMint
    })
    .map(ta => ta.pubkey.toBase58())

  return executeBatch({
    items: emptyAccounts,
    processor: async (account) => {
      const result = await closeTokenAccount(account, config)
      return result.signature
    },
    batchSize: 5,
    delayMs: 500,
    onProgress: options?.onProgress,
  })
}
