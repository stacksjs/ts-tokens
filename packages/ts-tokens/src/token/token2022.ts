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
import type { TransactionInstruction } from '@solana/web3.js'
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeDefaultAccountStateInstruction,
  createInitializeMetadataPointerInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  AccountState,
  getMintLen,
  ExtensionType,
} from '@solana/spl-token'
import type { TokenConfig, TokenExtension } from '../types'
import { createConnection } from '../drivers/solana/connection'
import { loadWallet } from '../drivers/solana/wallet'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { createInitializeTokenMetadataInstruction } from './embedded-metadata'

/**
 * Thrown when createToken2022 is asked for an extension it cannot initialize
 * yet. Never silently ignore requested extensions — that produces mints that
 * do not match what the caller asked for.
 */
export class UnsupportedExtensionError extends Error {
  /** The extension type names that are not implemented */
  readonly extensions: string[]

  constructor(extensions: string[]) {
    super(
      `createToken2022 does not yet support these Token-2022 extensions: ` +
      `${extensions.join(', ')}. Supported extensions: transferFee, ` +
      `interestBearing, nonTransferable, permanentDelegate, defaultAccountState ` +
      `(plus embedded metadata via the name/symbol/uri options). Use the ` +
      `low-level builders in programs/token-2022/instructions for the rest.`
    )
    this.name = 'UnsupportedExtensionError'
    this.extensions = extensions
  }
}

/**
 * Extensions whose init instructions are not implemented by this helper.
 * Requesting any of these throws UnsupportedExtensionError instead of being
 * silently dropped (while mapExtensionType would still count them for space).
 */
const UNSUPPORTED_EXTENSIONS = new Set([
  'transferHook',
  'metadataPointer',
  'confidentialTransfer',
  'memoRequired',
  'cpiGuard',
  'groupPointer',
  'groupMemberPointer',
])

/**
 * Options for creating a Token-2022 token with extensions
 */
export interface Token2022CreateOptions {
  name: string
  symbol: string
  decimals?: number
  /**
   * Amount to mint to the payer's associated token account, in base units.
   * Requires the mint authority to be the loaded wallet.
   */
  initialSupply?: bigint | number
  extensions: TokenExtension[]
  mintAuthority?: string
  freezeAuthority?: string | null
  uri?: string
}

/** Result of {@link createToken2022}. */
export interface CreateToken2022Result {
  mint: string
  signature: string
}

/**
 * Create a Token-2022 token with multiple extensions in a single transaction
 *
 * When any of name/symbol/uri are non-empty, the mint is created with the
 * metadata-pointer extension pointing at the mint itself and the embedded
 * TokenMetadata is initialized in the same transaction.
 */
export async function createToken2022(
  options: Token2022CreateOptions,
  config: TokenConfig
): Promise<CreateToken2022Result> {
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

  // (a) Refuse unsupported extensions loudly rather than silently dropping
  // them while still allocating space for them.
  const unsupported = [
    ...new Set(
      options.extensions
        .map(ext => ext.type)
        .filter(type => UNSUPPORTED_EXTENSIONS.has(type))
    ),
  ]
  if (unsupported.length > 0) {
    throw new UnsupportedExtensionError(unsupported)
  }

  // (b) Embedded metadata: any non-empty name/symbol/uri initializes the
  // metadata pointer (to the mint itself) + the TokenMetadata extension.
  const name = options.name ?? ''
  const symbol = options.symbol ?? ''
  const uri = options.uri ?? ''
  const wantsMetadata = name.length > 0 || symbol.length > 0 || uri.length > 0

  // (c) Initial supply, in base units.
  const initialSupply = options.initialSupply === undefined
    ? 0n
    : BigInt(options.initialSupply)
  if (initialSupply < 0n) {
    throw new Error(`initialSupply must not be negative (got ${initialSupply})`)
  }

  // Embedded-metadata initialization and initial-supply minting both require
  // the mint authority's signature; this helper only has the payer's keypair.
  if ((wantsMetadata || initialSupply > 0n) && !mintAuthority.equals(payer.publicKey)) {
    throw new Error(
      'createToken2022: name/symbol/uri metadata and a nonzero initialSupply ' +
      'both require the mint authority to sign. Omit mintAuthority (so it ' +
      'defaults to the configured wallet) or use the low-level builders with ' +
      'the authority keypair.'
    )
  }

  // Map extensions to ExtensionType for space calculation
  const extensionTypes = options.extensions.map(ext => mapExtensionType(ext))
  if (wantsMetadata) {
    extensionTypes.push(ExtensionType.MetadataPointer)
  }
  const mintLen = getMintLen(extensionTypes)

  // The embedded TokenMetadata lives in a second TLV entry after the metadata
  // pointer: header(4) + updateAuthority(32) + mint(32) + name/symbol/uri
  // (u32 length-prefixed) + additional-fields vec length(4, empty).
  let space = mintLen
  if (wantsMetadata) {
    const packLen = (s: string) => 4 + Buffer.byteLength(s, 'utf-8')
    space += 4 + 32 + 32 + packLen(name) + packLen(symbol) + packLen(uri) + 4
  }

  const lamports = await connection.getMinimumBalanceForRentExemption(space)

  const instructions: TransactionInstruction[] = []

  // 1. Create account
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  )

  // 2. Metadata pointer (extension inits must come BEFORE initializeMint).
  // The pointer targets the mint itself — the metadata is embedded.
  if (wantsMetadata) {
    instructions.push(
      createInitializeMetadataPointerInstruction(
        mintKeypair.publicKey,
        payer.publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    )
  }

  // 3. Initialize extensions (must come BEFORE initializeMint)
  for (const ext of options.extensions) {
    const extInstructions = buildExtensionInitInstructions(
      mintKeypair.publicKey,
      payer.publicKey,
      ext
    )
    instructions.push(...extInstructions)
  }

  // 4. Initialize mint
  instructions.push(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_2022_PROGRAM_ID
    )
  )

  // 5. Embedded token metadata (must come AFTER initializeMint)
  if (wantsMetadata) {
    instructions.push(
      createInitializeTokenMetadataInstruction(
        mintKeypair.publicKey,
        payer.publicKey,
        mintAuthority,
        name,
        symbol,
        uri
      )
    )
  }

  // 6. Initial supply to the payer's associated token account
  if (initialSupply > 0n) {
    const ata = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        payer.publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      createMintToInstruction(
        mintKeypair.publicKey,
        ata,
        mintAuthority,
        initialSupply,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    )
  }

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
