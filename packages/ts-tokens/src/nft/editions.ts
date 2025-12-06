/**
 * NFT Editions (Prints)
 *
 * Create master editions and print limited editions.
 */

import type {
  TransactionInstruction,
} from '@solana/web3.js'
import type { TokenConfig, TransactionOptions, TransactionResult } from '../types'
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMintLen,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'
import { createConnection } from '../drivers/solana/connection'
import { buildTransaction, sendAndConfirmTransaction } from '../drivers/solana/transaction'
import { loadWallet } from '../drivers/solana/wallet'

/**
 * Token Metadata Program ID
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Get metadata account PDA
 */
function getMetadataAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return address
}

/**
 * Get master edition PDA
 */
function getMasterEditionAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return address
}

/**
 * Get edition PDA for a print
 */
function getEditionAddress(mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return address
}

/**
 * Get edition marker PDA
 */
function getEditionMarkerAddress(masterMint: PublicKey, editionNumber: bigint): PublicKey {
  const editionMarker = Math.floor(Number(editionNumber) / 248)
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      masterMint.toBuffer(),
      Buffer.from('edition'),
      Buffer.from(editionMarker.toString()),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return address
}

/**
 * Edition info
 */
export interface EditionInfo {
  mint: string
  parent: string
  edition: number
  maxSupply: number | null
  supply: number
}

/**
 * Master edition result
 */
export interface MasterEditionResult {
  mint: string
  metadata: string
  masterEdition: string
  signature: string
}

/**
 * Print edition result
 */
export interface PrintEditionResult {
  mint: string
  metadata: string
  edition: string
  editionNumber: number
  signature: string
}

/**
 * Create a master edition for an existing NFT
 */
export async function createMasterEdition(
  mint: string,
  maxSupply: number | null,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<TransactionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const mintPubkey = new PublicKey(mint)
  const metadataAddress = getMetadataAddress(mintPubkey)
  const masterEditionAddress = getMasterEditionAddress(mintPubkey)

  // Get token account
  const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey)

  // Build CreateMasterEditionV3 instruction
  const data = Buffer.alloc(10)
  data.writeUInt8(17, 0) // Discriminator

  if (maxSupply !== null) {
    data.writeUInt8(1, 1) // Some
    data.writeBigUInt64LE(BigInt(maxSupply), 2)
  }
  else {
    data.writeUInt8(0, 1) // None
  }

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: masterEditionAddress, isSigner: false, isWritable: true },
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options,
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Print an edition from a master edition
 */
export async function printEdition(
  masterMint: string,
  editionNumber: number,
  config: TokenConfig,
  options?: TransactionOptions,
): Promise<PrintEditionResult> {
  const connection = createConnection(config)
  const payer = loadWallet(config)

  const masterMintPubkey = new PublicKey(masterMint)
  const masterMetadata = getMetadataAddress(masterMintPubkey)
  const masterEdition = getMasterEditionAddress(masterMintPubkey)
  const editionMarker = getEditionMarkerAddress(masterMintPubkey, BigInt(editionNumber))

  // Generate new mint for the edition
  const editionMintKeypair = Keypair.generate()
  const editionMint = editionMintKeypair.publicKey
  const editionMetadata = getMetadataAddress(editionMint)
  const edition = getEditionAddress(editionMint)

  // Get master token account
  const masterAta = await getAssociatedTokenAddress(masterMintPubkey, payer.publicKey)

  // Create edition token account
  const editionAta = await getAssociatedTokenAddress(editionMint, payer.publicKey)

  const instructions: TransactionInstruction[] = []

  // 1. Create mint account
  const mintLen = getMintLen([])
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen)

  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: editionMint,
      space: mintLen,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
  )

  // 2. Initialize mint
  instructions.push(
    createInitializeMintInstruction(
      editionMint,
      0,
      payer.publicKey,
      payer.publicKey,
      TOKEN_PROGRAM_ID,
    ),
  )

  // 3. Create ATA
  instructions.push(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      editionAta,
      payer.publicKey,
      editionMint,
    ),
  )

  // 4. Mint 1 token
  instructions.push(
    createMintToInstruction(
      editionMint,
      editionAta,
      payer.publicKey,
      1n,
    ),
  )

  // 5. Print edition instruction
  const printData = Buffer.alloc(9)
  printData.writeUInt8(11, 0) // MintNewEditionFromMasterEditionViaToken discriminator
  printData.writeBigUInt64LE(BigInt(editionNumber), 1)

  instructions.push({
    keys: [
      { pubkey: editionMetadata, isSigner: false, isWritable: true },
      { pubkey: edition, isSigner: false, isWritable: true },
      { pubkey: masterEdition, isSigner: false, isWritable: true },
      { pubkey: editionMint, isSigner: false, isWritable: true },
      { pubkey: editionMarker, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: masterAta, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: false, isWritable: false },
      { pubkey: masterMetadata, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: printData,
  })

  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options,
  )

  transaction.partialSign(editionMintKeypair)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options)

  return {
    mint: editionMint.toBase58(),
    metadata: editionMetadata.toBase58(),
    edition: edition.toBase58(),
    editionNumber,
    signature: result.signature,
  }
}

/**
 * Get edition info
 */
export async function getEditionInfo(
  mint: string,
  config: TokenConfig,
): Promise<EditionInfo | null> {
  const connection = createConnection(config)
  const mintPubkey = new PublicKey(mint)
  const editionAddress = getEditionAddress(mintPubkey)

  const accountInfo = await connection.getAccountInfo(editionAddress)
  if (!accountInfo) {
    return null
  }

  const data = accountInfo.data
  const key = data[0]

  // Key 1 = MasterEditionV1, Key 6 = MasterEditionV2, Key 2 = Edition
  if (key === 1 || key === 6) {
    // Master edition
    const supply = data.readBigUInt64LE(1)
    const hasMaxSupply = data[9] === 1
    const maxSupply = hasMaxSupply ? Number(data.readBigUInt64LE(10)) : null

    return {
      mint,
      parent: mint,
      edition: 0,
      maxSupply,
      supply: Number(supply),
    }
  }
  else if (key === 2) {
    // Print edition
    const parent = new PublicKey(data.slice(1, 33)).toBase58()
    const edition = Number(data.readBigUInt64LE(33))

    return {
      mint,
      parent,
      edition,
      maxSupply: null,
      supply: 1,
    }
  }

  return null
}

/**
 * Get all editions printed from a master
 */
export async function getEditionsByMaster(
  masterMint: string,
  config: TokenConfig,
  limit: number = 100,
): Promise<EditionInfo[]> {
  const connection = createConnection(config)
  const masterMintPubkey = new PublicKey(masterMint)

  // Get master edition info first
  const masterInfo = await getEditionInfo(masterMint, config)
  if (!masterInfo || masterInfo.edition !== 0) {
    throw new Error('Not a master edition')
  }

  // Search for edition accounts that reference this master
  const accounts = await connection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        { dataSize: 41 }, // Edition account size
        {
          memcmp: {
            offset: 1, // Parent offset
            bytes: masterMintPubkey.toBase58(),
          },
        },
      ],
    },
  )

  const editions: EditionInfo[] = []

  for (const { account } of accounts.slice(0, limit)) {
    const data = account.data
    if (data[0] === 2) { // Edition key
      const parent = new PublicKey(data.slice(1, 33)).toBase58()
      const edition = Number(data.readBigUInt64LE(33))

      // Find the mint for this edition
      // This would require additional lookups in production
      editions.push({
        mint: '', // Would need to look up
        parent,
        edition,
        maxSupply: masterInfo.maxSupply,
        supply: 1,
      })
    }
  }

  return editions.sort((a, b) => a.edition - b.edition)
}
