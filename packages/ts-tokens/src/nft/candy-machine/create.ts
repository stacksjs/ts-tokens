/**
 * Candy Machine Creation
 *
 * Create and configure Candy Machines for NFT drops.
 */

import type {
  TransactionInstruction} from '@solana/web3.js';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram
} from '@solana/web3.js'
import * as fs from 'node:fs'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'

/**
 * Candy Machine Program ID (Metaplex Candy Machine v3)
 */
const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')

/**
 * Candy Machine configuration
 */
export interface CandyMachineConfig {
  itemsAvailable: number
  sellerFeeBasisPoints: number
  symbol: string
  maxEditionSupply: number
  isMutable: boolean
  creators: Array<{ address: string; share: number }>
  collection: string
  configLineSettings?: {
    prefixName: string
    nameLength: number
    prefixUri: string
    uriLength: number
    isSequential: boolean
  }
  hiddenSettings?: {
    name: string
    uri: string
    hash: Uint8Array
  }
  guards?: CandyGuardConfig
}

/**
 * Candy Guard configuration
 */
export interface CandyGuardConfig {
  botTax?: { lamports: bigint; lastInstruction: boolean }
  solPayment?: { lamports: bigint; destination: string }
  tokenPayment?: { amount: bigint; mint: string; destinationAta: string }
  startDate?: { date: number }
  endDate?: { date: number }
  mintLimit?: { id: number; limit: number }
  nftPayment?: { requiredCollection: string; destination: string }
  redeemedAmount?: { maximum: number }
  addressGate?: { address: string }
  nftGate?: { requiredCollection: string }
  nftBurn?: { requiredCollection: string }
  tokenBurn?: { amount: bigint; mint: string }
  freezeSolPayment?: { lamports: bigint; destination: string }
  freezeTokenPayment?: { amount: bigint; mint: string; destinationAta: string }
  programGate?: { additional: string[] }
  allocation?: { id: number; limit: number }
  tokenGate?: { amount: bigint; mint: string }
  allowList?: { merkleRoot: Uint8Array }
}

/**
 * Candy Machine result
 */
export interface CandyMachineResult {
  candyMachine: string
  collection: string
  signature: string
}

/**
 * Create a new Candy Machine
 */
export async function createCandyMachine(
  config: CandyMachineConfig,
  tokenConfig: TokenConfig,
  options?: TransactionOptions
): Promise<CandyMachineResult> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  // Generate candy machine keypair
  const candyMachineKeypair = Keypair.generate()
  const candyMachine = candyMachineKeypair.publicKey

  // Calculate space needed for candy machine account
  const space = calculateCandyMachineSpace(config)
  const lamports = await connection.getMinimumBalanceForRentExemption(space)

  const instructions: TransactionInstruction[] = []

  // Create candy machine account
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: candyMachine,
      space,
      lamports,
      programId: CANDY_MACHINE_PROGRAM_ID,
    })
  )

  // Initialize candy machine instruction
  const initData = serializeInitializeCandyMachine(config, payer.publicKey)

  instructions.push({
    keys: [
      { pubkey: candyMachine, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: new PublicKey(config.collection), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: CANDY_MACHINE_PROGRAM_ID,
    data: initData,
  })

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    instructions,
    payer.publicKey,
    options
  )

  transaction.partialSign(candyMachineKeypair)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options)

  return {
    candyMachine: candyMachine.toBase58(),
    collection: config.collection,
    signature: result.signature,
  }
}

/**
 * Calculate space needed for candy machine account
 */
function calculateCandyMachineSpace(config: CandyMachineConfig): number {
  let space = 8 + // discriminator
    32 + // authority
    32 + // mint authority
    32 + // collection mint
    8 + // items redeemed
    1 + // items available option
    8 + // items available
    1 + // config line settings option
    1 + // hidden settings option
    2 + // seller fee basis points
    4 + // symbol length
    10 + // symbol
    1 + // max edition supply option
    8 + // max edition supply
    1 + // is mutable
    1 + // creators option
    4 // creators length

  // Add space for creators
  space += config.creators.length * (32 + 1 + 1) // pubkey + verified + share

  // Add space for config line settings if present
  if (config.configLineSettings) {
    space += 4 + config.configLineSettings.prefixName.length +
      4 + // name length
      4 + config.configLineSettings.prefixUri.length +
      4 + // uri length
      1 // is sequential
  }

  // Add space for hidden settings if present
  if (config.hiddenSettings) {
    space += 4 + config.hiddenSettings.name.length +
      4 + config.hiddenSettings.uri.length +
      32 // hash
  }

  return space
}

/**
 * Serialize initialize candy machine instruction data
 */
function serializeInitializeCandyMachine(
  config: CandyMachineConfig,
  authority: PublicKey
): Buffer {
  const buffer = Buffer.alloc(512)
  let offset = 0

  // Discriminator for Initialize (simplified)
  buffer.writeUInt8(0, offset)
  offset += 8

  // Items available
  buffer.writeBigUInt64LE(BigInt(config.itemsAvailable), offset)
  offset += 8

  // Symbol
  const symbolBytes = Buffer.from(config.symbol.slice(0, 10))
  buffer.writeUInt32LE(symbolBytes.length, offset)
  offset += 4
  symbolBytes.copy(buffer, offset)
  offset += symbolBytes.length

  // Seller fee basis points
  buffer.writeUInt16LE(config.sellerFeeBasisPoints, offset)
  offset += 2

  // Max edition supply
  buffer.writeBigUInt64LE(BigInt(config.maxEditionSupply), offset)
  offset += 8

  // Is mutable
  buffer.writeUInt8(config.isMutable ? 1 : 0, offset)
  offset += 1

  // Creators
  buffer.writeUInt32LE(config.creators.length, offset)
  offset += 4
  for (const creator of config.creators) {
    new PublicKey(creator.address).toBuffer().copy(buffer, offset)
    offset += 32
    buffer.writeUInt8(0, offset) // verified = false initially
    offset += 1
    buffer.writeUInt8(creator.share, offset)
    offset += 1
  }

  // Config line settings
  if (config.configLineSettings) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    const prefixNameBytes = Buffer.from(config.configLineSettings.prefixName)
    buffer.writeUInt32LE(prefixNameBytes.length, offset)
    offset += 4
    prefixNameBytes.copy(buffer, offset)
    offset += prefixNameBytes.length
    buffer.writeUInt32LE(config.configLineSettings.nameLength, offset)
    offset += 4
    const prefixUriBytes = Buffer.from(config.configLineSettings.prefixUri)
    buffer.writeUInt32LE(prefixUriBytes.length, offset)
    offset += 4
    prefixUriBytes.copy(buffer, offset)
    offset += prefixUriBytes.length
    buffer.writeUInt32LE(config.configLineSettings.uriLength, offset)
    offset += 4
    buffer.writeUInt8(config.configLineSettings.isSequential ? 1 : 0, offset)
    offset += 1
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  // Hidden settings
  if (config.hiddenSettings) {
    buffer.writeUInt8(1, offset) // Some
    offset += 1
    const nameBytes = Buffer.from(config.hiddenSettings.name)
    buffer.writeUInt32LE(nameBytes.length, offset)
    offset += 4
    nameBytes.copy(buffer, offset)
    offset += nameBytes.length
    const uriBytes = Buffer.from(config.hiddenSettings.uri)
    buffer.writeUInt32LE(uriBytes.length, offset)
    offset += 4
    uriBytes.copy(buffer, offset)
    offset += uriBytes.length
    Buffer.from(config.hiddenSettings.hash).copy(buffer, offset)
    offset += 32
  } else {
    buffer.writeUInt8(0, offset) // None
    offset += 1
  }

  return buffer.slice(0, offset)
}

/**
 * Add config lines to candy machine
 */
export async function addConfigLines(
  candyMachine: string,
  startIndex: number,
  configLines: Array<{ name: string; uri: string }>,
  tokenConfig: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  const candyMachinePubkey = new PublicKey(candyMachine)

  // Serialize add config lines instruction
  const data = serializeAddConfigLines(startIndex, configLines)

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: candyMachinePubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: CANDY_MACHINE_PROGRAM_ID,
    data,
  }

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
 * Serialize add config lines instruction data
 */
function serializeAddConfigLines(
  startIndex: number,
  configLines: Array<{ name: string; uri: string }>
): Buffer {
  const buffer = Buffer.alloc(4096)
  let offset = 0

  // Discriminator for AddConfigLines
  buffer.writeUInt8(1, offset)
  offset += 8

  // Start index
  buffer.writeUInt32LE(startIndex, offset)
  offset += 4

  // Config lines
  buffer.writeUInt32LE(configLines.length, offset)
  offset += 4

  for (const line of configLines) {
    const nameBytes = Buffer.from(line.name)
    buffer.writeUInt32LE(nameBytes.length, offset)
    offset += 4
    nameBytes.copy(buffer, offset)
    offset += nameBytes.length

    const uriBytes = Buffer.from(line.uri)
    buffer.writeUInt32LE(uriBytes.length, offset)
    offset += 4
    uriBytes.copy(buffer, offset)
    offset += uriBytes.length
  }

  return buffer.slice(0, offset)
}

/**
 * Mint from candy machine
 */
export async function mintFromCandyMachine(
  candyMachine: string,
  tokenConfig: TokenConfig,
  options?: TransactionOptions
): Promise<{ mint: string; signature: string }> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  const candyMachinePubkey = new PublicKey(candyMachine)

  // Generate new mint keypair
  const mintKeypair = Keypair.generate()

  // This is a simplified version - full implementation would include
  // all required accounts for minting (metadata, master edition, etc.)
  const data = Buffer.alloc(8)
  data.writeUInt8(2, 0) // Mint discriminator

  const instruction: TransactionInstruction = {
    keys: [
      { pubkey: candyMachinePubkey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
      // Additional accounts would be needed here
    ],
    programId: CANDY_MACHINE_PROGRAM_ID,
    data,
  }

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(mintKeypair)
  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, options)

  return {
    mint: mintKeypair.publicKey.toBase58(),
    signature: result.signature,
  }
}

/**
 * Add config lines from a JSON file
 *
 * The file should contain an array of { name, uri } objects.
 */
export async function addConfigLinesFromFile(
  candyMachine: string,
  filePath: string,
  tokenConfig: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const items: Array<{ name: string; uri: string }> = JSON.parse(content)

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Config file must contain a non-empty array of { name, uri } objects')
  }

  return addConfigLines(candyMachine, 0, items, tokenConfig, options)
}

/**
 * Mint multiple NFTs from a Candy Machine
 *
 * Mints sequentially with a delay between each mint to avoid rate limiting.
 */
export async function mintMultiple(
  candyMachine: string,
  count: number,
  tokenConfig: TokenConfig,
  options?: TransactionOptions & { delayMs?: number }
): Promise<Array<{ mint: string; signature: string }>> {
  const results: Array<{ mint: string; signature: string }> = []
  const delayMs = options?.delayMs ?? 2000

  for (let i = 0; i < count; i++) {
    const result = await mintFromCandyMachine(candyMachine, tokenConfig, options)
    results.push(result)

    if (i < count - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}
