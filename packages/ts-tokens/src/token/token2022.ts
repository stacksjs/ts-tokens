/**
 * Token-2022 High-Level Helpers
 *
 * Creates Token-2022 tokens with multiple extensions in a single transaction.
 */

import {
  Keypair,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import type { Connection, TransactionInstruction } from '@solana/web3.js'
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeDefaultAccountStateInstruction,
  AccountState,
  getMintLen,
  ExtensionType,
} from '@solana/spl-token'
import type { TokenConfig, TokenExtension } from '../types'
import type { TransactionResult } from '../types/transaction'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'

/**
 * Options for creating a Token-2022 token with extensions
 */
export interface Token2022CreateOptions {
  name: string
  symbol: string
  decimals?: number
  initialSupply?: bigint | number
  extensions: TokenExtension[]
  mintAuthority?: string
  freezeAuthority?: string | null
  uri?: string
}

/**
 * Create a Token-2022 token with multiple extensions in a single transaction
 */
export async function createToken2022(
  _options: Token2022CreateOptions,
  _config: TokenConfig
): Promise<{
  mint: string
  signature: string
}> {
  const connection = createConnection(config)
  const payer = loadWallet(config)
  const mintKeypair = Keypair.generate()
  const decimals = options.decimals ?? 9
  const mintAuthority = options.mintAuthority
    ? new PublicKey(options.mintAuthority)
    : payer.publicKey
  const freezeAuthority = options.freezeAuthority === null
    ? null
    : options.freezeAuthority
      ? new PublicKey(options.freezeAuthority)
      : payer.publicKey

  // Map extensions to ExtensionType for space calculation
  const extensionTypes = options.extensions.map(ext => mapExtensionType(ext))
  const mintLen = getMintLen(extensionTypes)

  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen)

  const instructions: TransactionInstruction[] = []

  // 1. Create account
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  )

  // 2. Initialize extensions (must come BEFORE initializeMint)
  for (const ext of options.extensions) {
    const extInstructions = buildExtensionInitInstructions(
      mintKeypair.publicKey,
      payer.publicKey,
      ext
    )
    instructions.push(...extInstructions)
  }

  // 3. Initialize mint
  instructions.push(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_2022_PROGRAM_ID
    )
  )

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey
  )

  transaction.partialSign(mintKeypair, payer)

  const result = await sendAndConfirmTransaction(connection, transaction)

  return {
    mint: mintKeypair.publicKey.toBase58(),
    signature: result.signature,
  }
}

/**
 * Map a TokenExtension to an SPL ExtensionType for space calculation
 */
function mapExtensionType(ext: TokenExtension): ExtensionType {
  switch (ext.type) {
    case 'transferFee': return ExtensionType.TransferFeeConfig
    case 'interestBearing': return ExtensionType.InterestBearingConfig
    case 'nonTransferable': return ExtensionType.NonTransferable
    case 'permanentDelegate': return ExtensionType.PermanentDelegate
    case 'transferHook': return ExtensionType.TransferHook
    case 'metadataPointer': return ExtensionType.MetadataPointer
    case 'confidentialTransfer': return ExtensionType.ConfidentialTransferMint
    case 'defaultAccountState': return ExtensionType.DefaultAccountState
    case 'memoRequired': return ExtensionType.MemoTransfer
    case 'cpiGuard': return ExtensionType.CpiGuard
    case 'groupPointer': return ExtensionType.GroupPointer
    case 'groupMemberPointer': return ExtensionType.GroupMemberPointer
  }
}

/**
 * Build initialization instructions for a specific extension
 */
function buildExtensionInitInstructions(
  mint: PublicKey,
  authority: PublicKey,
  ext: TokenExtension
): TransactionInstruction[] {
  switch (ext.type) {
    case 'transferFee':
      return [
        createInitializeTransferFeeConfigInstruction(
          mint,
          ext.feeAuthority ? new PublicKey(ext.feeAuthority) : authority,
          ext.withdrawAuthority ? new PublicKey(ext.withdrawAuthority) : authority,
          ext.feeBasisPoints,
          ext.maxFee,
          TOKEN_2022_PROGRAM_ID
        ),
      ]
    case 'interestBearing':
      return [
        createInitializeInterestBearingMintInstruction(
          mint,
          ext.rateAuthority ? new PublicKey(ext.rateAuthority) : authority,
          ext.rate,
          TOKEN_2022_PROGRAM_ID
        ),
      ]
    case 'nonTransferable':
      return [
        createInitializeNonTransferableMintInstruction(
          mint,
          TOKEN_2022_PROGRAM_ID
        ),
      ]
    case 'permanentDelegate':
      return [
        createInitializePermanentDelegateInstruction(
          mint,
          new PublicKey(ext.delegate),
          TOKEN_2022_PROGRAM_ID
        ),
      ]
    case 'defaultAccountState':
      return [
        createInitializeDefaultAccountStateInstruction(
          mint,
          ext.state === 'frozen' ? AccountState.Frozen : AccountState.Initialized,
          TOKEN_2022_PROGRAM_ID
        ),
      ]
    default:
      return []
  }
}
