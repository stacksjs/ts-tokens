/**
 * Token Creation
 *
 * Create new SPL tokens with metadata.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMintLen,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializePermanentDelegateInstruction,
} from '@solana/spl-token'
import type { TokenConfig, CreateTokenOptions, TokenResult, TransactionOptions } from '../types'
import { sendAndConfirmTransaction, buildTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'
import { createConnection } from '../drivers/solana/connection'

/**
 * Token Metadata Program ID (Metaplex)
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Get metadata account address for a mint
 */
function getMetadataAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return address
}

/**
 * Create metadata instruction data
 */
function createMetadataInstructionData(
  name: string,
  symbol: string,
  uri: string,
  sellerFeeBasisPoints: number = 0,
  creators: Array<{ address: string; verified: boolean; share: number }> | null = null,
  isMutable: boolean = true
): Buffer {
  // Instruction discriminator for CreateMetadataAccountV3
  const discriminator = Buffer.from([33, 0, 0, 0, 0, 0, 0, 0])

  // Encode the data struct
  const nameBuffer = Buffer.from(name)
  const symbolBuffer = Buffer.from(symbol)
  const uriBuffer = Buffer.from(uri)

  // Calculate total size
  let size = 8 + // discriminator
    4 + nameBuffer.length + // name (string with length prefix)
    4 + symbolBuffer.length + // symbol
    4 + uriBuffer.length + // uri
    2 + // seller_fee_basis_points
    1 + // creators option
    1 + // collection option
    1 + // uses option
    1 + // is_mutable
    1   // collection_details option

  if (creators) {
    size += 4 + creators.length * (32 + 1 + 1) // vec length + (pubkey + verified + share) per creator
  }

  const buffer = Buffer.alloc(size)
  let offset = 0

  // Write discriminator
  discriminator.copy(buffer, offset)
  offset += 8

  // Write name
  buffer.writeUInt32LE(nameBuffer.length, offset)
  offset += 4
  nameBuffer.copy(buffer, offset)
  offset += nameBuffer.length

  // Write symbol
  buffer.writeUInt32LE(symbolBuffer.length, offset)
  offset += 4
  symbolBuffer.copy(buffer, offset)
  offset += symbolBuffer.length

  // Write uri
  buffer.writeUInt32LE(uriBuffer.length, offset)
  offset += 4
  uriBuffer.copy(buffer, offset)
  offset += uriBuffer.length

  // Write seller_fee_basis_points
  buffer.writeUInt16LE(sellerFeeBasisPoints, offset)
  offset += 2

  // Write creators option
  if (creators && creators.length > 0) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    buffer.writeUInt32LE(creators.length, offset)
    offset += 4
    for (const creator of creators) {
      const creatorPubkey = new PublicKey(creator.address)
      creatorPubkey.toBuffer().copy(buffer, offset)
      offset += 32
      buffer.writeUInt8(creator.verified ? 1 : 0, offset)
      offset += 1
      buffer.writeUInt8(creator.share, offset)
      offset += 1
    }
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  // Write collection option (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Write uses option (None)
  buffer.writeUInt8(0, offset)
  offset += 1

  // Write is_mutable
  buffer.writeUInt8(isMutable ? 1 : 0, offset)
  offset += 1

  // Write collection_details option (None)
  buffer.writeUInt8(0, offset)

  return buffer.slice(0, offset + 1)
}

/**
 * Create a new SPL token
 *
 * @param options - Token creation options
 * @param config - Token configuration
 * @returns Token creation result
 */
export async function createToken(
  options: CreateTokenOptions,
  config: TokenConfig
): Promise<TokenResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  // Generate new mint keypair
  const mintKeypair = Keypair.generate()
  const mint = mintKeypair.publicKey

  // Determine program ID
  const programId = options.useToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

  // Calculate mint account size
  let mintLen = getMintLen([])
  if (options.extensions && options.useToken2022) {
    const extensionTypes: ExtensionType[] = []
    for (const ext of options.extensions) {
      switch (ext.type) {
        case 'transferFee':
          extensionTypes.push(ExtensionType.TransferFeeConfig)
          break
        case 'interestBearing':
          extensionTypes.push(ExtensionType.InterestBearingConfig)
          break
        case 'nonTransferable':
          extensionTypes.push(ExtensionType.NonTransferable)
          break
        case 'permanentDelegate':
          extensionTypes.push(ExtensionType.PermanentDelegate)
          break
        // Add more extension types as needed
      }
    }
    mintLen = getMintLen(extensionTypes)
  }

  // Get minimum rent
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen)

  // Build instructions
  const instructions = []

  // Create mint account
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId,
    })
  )

  // Add extension initialization instructions for Token-2022
  if (options.extensions && options.useToken2022) {
    for (const ext of options.extensions) {
      switch (ext.type) {
        case 'transferFee':
          instructions.push(
            createInitializeTransferFeeConfigInstruction(
              mint,
              ext.feeAuthority ? new PublicKey(ext.feeAuthority) : payer.publicKey,
              ext.withdrawAuthority ? new PublicKey(ext.withdrawAuthority) : payer.publicKey,
              ext.feeBasisPoints,
              ext.maxFee,
              programId
            )
          )
          break
        case 'interestBearing':
          instructions.push(
            createInitializeInterestBearingMintInstruction(
              mint,
              ext.rateAuthority ? new PublicKey(ext.rateAuthority) : payer.publicKey,
              ext.rate,
              programId
            )
          )
          break
        case 'nonTransferable':
          instructions.push(
            createInitializeNonTransferableMintInstruction(mint, programId)
          )
          break
        case 'permanentDelegate':
          instructions.push(
            createInitializePermanentDelegateInstruction(
              mint,
              new PublicKey(ext.delegate),
              programId
            )
          )
          break
      }
    }
  }

  // Initialize mint
  const mintAuthority = options.mintAuthority
    ? new PublicKey(options.mintAuthority)
    : payer.publicKey
  const freezeAuthority = options.freezeAuthority === null
    ? null
    : options.freezeAuthority
      ? new PublicKey(options.freezeAuthority)
      : payer.publicKey

  instructions.push(
    createInitializeMintInstruction(
      mint,
      options.decimals ?? 9,
      mintAuthority,
      freezeAuthority,
      programId
    )
  )

  // Create metadata if name/symbol provided
  let metadataAddress: string | undefined
  if (options.name && options.symbol) {
    const metadataPDA = getMetadataAddress(mint)
    metadataAddress = metadataPDA.toBase58()

    const metadataData = createMetadataInstructionData(
      options.name,
      options.symbol,
      options.uri || '',
      0,
      options.creators?.map(c => ({
        address: c.address,
        verified: c.verified,
        share: c.share,
      })) || null,
      options.isMutable ?? true
    )

    instructions.push({
      keys: [
        { pubkey: metadataPDA, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: true, isWritable: false },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: TOKEN_METADATA_PROGRAM_ID,
      data: metadataData,
    })
  }

  // Mint initial supply if specified
  if (options.initialSupply && BigInt(options.initialSupply) > 0n) {
    // Create associated token account for payer
    const ata = await getAssociatedTokenAddress(mint, payer.publicKey, false, programId)

    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        payer.publicKey,
        mint,
        programId
      )
    )

    instructions.push(
      createMintToInstruction(
        mint,
        ata,
        mintAuthority,
        BigInt(options.initialSupply),
        [],
        programId
      )
    )
  }

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options.options
  )

  // Sign with mint keypair
  transaction.partialSign(mintKeypair)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options.options)

  return {
    mint: mint.toBase58(),
    signature: result.signature,
    metadataAddress,
  }
}

/**
 * Helper to create a simple token with defaults
 */
export async function createSimpleToken(
  name: string,
  symbol: string,
  decimals: number = 9,
  initialSupply?: bigint | number,
  config?: TokenConfig
): Promise<TokenResult> {
  const defaultConfig: TokenConfig = config || {
    chain: 'solana',
    network: 'devnet',
    commitment: 'confirmed',
    verbose: false,
    dryRun: false,
    ipfsGateway: 'https://ipfs.io',
    arweaveGateway: 'https://arweave.net',
    storageProvider: 'arweave',
    securityChecks: true,
    autoCreateAccounts: true,
  }

  return createToken(
    {
      name,
      symbol,
      decimals,
      initialSupply,
    },
    defaultConfig
  )
}
