/**
 * Candy Machine Creation
 *
 * Create and configure Candy Machines for NFT drops.
 */

import type {
  TransactionInstruction} from '@solana/web3.js';
import {
  Keypair,
  PublicKey,
  SystemProgram
} from '@solana/web3.js'
import * as fs from 'node:fs'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'
import {
  initializeCandyMachine as initializeCandyMachineInstruction,
  addConfigLines as addConfigLinesInstruction,
  mintFromCandyMachine as mintFromCandyMachineInstruction,
} from '../../programs/candy-machine/instructions'
import {
  findCandyMachineAuthorityPda,
  findCollectionDelegateRecordPda,
} from '../../programs/candy-machine/pda'
import {
  findMetadataPda,
  findMasterEditionPda,
} from '../../programs/token-metadata/pda'
import type { CandyMachineData } from '../../programs/candy-machine/types'
import { addGuards } from './guards'
import type { GuardSet } from '../../programs/candy-machine/guards'

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

  const collectionMint = new PublicKey(config.collection)

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

  // Initialize candy machine (v2) instruction — routed through the shared
  // program instruction builder so the discriminator and account list stay
  // correct.
  instructions.push(
    initializeCandyMachineInstruction({
      candyMachine,
      authority: payer.publicKey,
      payer: payer.publicKey,
      collectionMint,
      collectionUpdateAuthority: payer.publicKey,
      data: toCandyMachineData(config),
      // TokenStandard::NonFungible
      tokenStandard: 0,
    })
  )

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

  // Wire up guards, if any were provided. This is a follow-up transaction
  // (initialize a Candy Guard and wrap the Candy Machine).
  if (config.guards) {
    await addGuards(
      candyMachine.toBase58(),
      toGuardSet(config.guards),
      tokenConfig,
      options
    )
  }

  return {
    candyMachine: candyMachine.toBase58(),
    collection: config.collection,
    signature: result.signature,
  }
}

/**
 * Build on-chain CandyMachineData from the high-level config.
 */
function toCandyMachineData(config: CandyMachineConfig): CandyMachineData {
  return {
    itemsAvailable: BigInt(config.itemsAvailable),
    symbol: config.symbol,
    sellerFeeBasisPoints: config.sellerFeeBasisPoints,
    maxSupply: BigInt(config.maxEditionSupply),
    isMutable: config.isMutable,
    creators: config.creators.map(c => ({
      address: new PublicKey(c.address),
      verified: false,
      percentageShare: c.share,
    })),
    configLineSettings: config.configLineSettings ?? null,
    hiddenSettings: config.hiddenSettings ?? null,
  }
}

/**
 * Convert the high-level CandyGuardConfig into the low-level GuardSet
 * consumed by the guard serializers.
 */
function toGuardSet(guards: CandyGuardConfig): GuardSet {
  const set: GuardSet = {}

  if (guards.botTax) set.botTax = guards.botTax
  if (guards.solPayment) {
    set.solPayment = {
      lamports: guards.solPayment.lamports,
      destination: new PublicKey(guards.solPayment.destination),
    }
  }
  if (guards.tokenPayment) {
    set.tokenPayment = {
      amount: guards.tokenPayment.amount,
      mint: new PublicKey(guards.tokenPayment.mint),
      destinationAta: new PublicKey(guards.tokenPayment.destinationAta),
    }
  }
  if (guards.startDate) set.startDate = { date: BigInt(guards.startDate.date) }
  if (guards.endDate) set.endDate = { date: BigInt(guards.endDate.date) }
  if (guards.mintLimit) set.mintLimit = guards.mintLimit
  if (guards.nftPayment) {
    set.nftPayment = {
      requiredCollection: new PublicKey(guards.nftPayment.requiredCollection),
      destination: new PublicKey(guards.nftPayment.destination),
    }
  }
  if (guards.redeemedAmount) set.redeemedAmount = { maximum: BigInt(guards.redeemedAmount.maximum) }
  if (guards.addressGate) set.addressGate = { address: new PublicKey(guards.addressGate.address) }
  if (guards.nftGate) {
    set.nftGate = { requiredCollection: new PublicKey(guards.nftGate.requiredCollection) }
  }
  if (guards.nftBurn) {
    set.nftBurn = { requiredCollection: new PublicKey(guards.nftBurn.requiredCollection) }
  }
  if (guards.tokenBurn) {
    set.tokenBurn = { amount: guards.tokenBurn.amount, mint: new PublicKey(guards.tokenBurn.mint) }
  }
  if (guards.freezeSolPayment) {
    set.freezeSolPayment = {
      lamports: guards.freezeSolPayment.lamports,
      destination: new PublicKey(guards.freezeSolPayment.destination),
    }
  }
  if (guards.freezeTokenPayment) {
    set.freezeTokenPayment = {
      amount: guards.freezeTokenPayment.amount,
      mint: new PublicKey(guards.freezeTokenPayment.mint),
      destinationAta: new PublicKey(guards.freezeTokenPayment.destinationAta),
    }
  }
  if (guards.programGate) {
    set.programGate = { additional: guards.programGate.additional.map(a => new PublicKey(a)) }
  }
  if (guards.allocation) set.allocation = guards.allocation
  if (guards.tokenGate) {
    set.tokenGate = { amount: guards.tokenGate.amount, mint: new PublicKey(guards.tokenGate.mint) }
  }
  if (guards.allowList) set.allowList = guards.allowList

  return set
}

/**
 * Calculate space needed for candy machine account
 */
function calculateCandyMachineSpace(config: CandyMachineConfig): number {
  // The on-chain program reserves a fixed hidden section sized with the MAX
  // lengths for every header field (symbol, creators, config-line prefixes),
  // regardless of the actual string lengths — see
  // CandyMachineData::get_space_for_candy in mpl-candy-machine.
  const HIDDEN_SECTION = 816

  // Hidden-settings drops store no config lines on-chain
  if (config.hiddenSettings) {
    return HIDDEN_SECTION
  }

  const items = config.itemsAvailable
  const nameLength = config.configLineSettings?.nameLength ?? 32
  const uriLength = config.configLineSettings?.uriLength ?? 200

  return HIDDEN_SECTION +
    4 + // config lines vec length
    items * (nameLength + uriLength) + // config lines
    Math.floor(items / 8) + 1 + // taken bitmask
    items * 4 // mint indices
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

  // Routed through the shared program instruction builder so the
  // discriminator and serialization stay correct.
  const instruction = addConfigLinesInstruction({
    candyMachine: candyMachinePubkey,
    authority: payer.publicKey,
    index: startIndex,
    configLines,
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

  // Fetch the candy machine to resolve collection info.
  const accountInfo = await connection.getAccountInfo(candyMachinePubkey)
  if (!accountInfo) {
    throw new Error('Candy Machine account not found')
  }
  const { deserializeCandyMachine } = await import('../../programs/candy-machine/accounts')
  const cm = deserializeCandyMachine(accountInfo.data as Buffer)

  // Generate new mint keypair
  const mintKeypair = Keypair.generate()

  const [authorityPda] = findCandyMachineAuthorityPda(candyMachinePubkey)
  const [nftMetadata] = findMetadataPda(mintKeypair.publicKey)
  const [nftMasterEdition] = findMasterEditionPda(mintKeypair.publicKey)
  const [collectionMetadata] = findMetadataPda(cm.collectionMint)
  const [collectionMasterEdition] = findMasterEditionPda(cm.collectionMint)
  // mint_v2 uses the token-metadata *collection delegate* record (V2 seeds),
  // not the legacy collection authority record.
  const [collectionDelegateRecord] = findCollectionDelegateRecordPda(
    cm.collectionMint,
    cm.authority,
    authorityPda
  )

  // The minter's ATA receives the NFT.
  const nftTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    payer.publicKey
  )

  const instruction = mintFromCandyMachineInstruction({
    candyMachine: candyMachinePubkey,
    authorityPda,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    nftMint: mintKeypair.publicKey,
    nftMintAuthority: payer.publicKey,
    nftMetadata,
    nftMasterEdition,
    tokenAccount: nftTokenAccount,
    collectionDelegateRecord,
    collectionMint: cm.collectionMint,
    collectionMetadata,
    collectionMasterEdition,
    collectionUpdateAuthority: cm.authority,
  })

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
