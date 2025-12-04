/**
 * Candy Machine v3 Types
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Candy Machine account data
 */
export interface CandyMachine {
  version: number
  tokenStandard: number
  features: bigint
  authority: PublicKey
  mintAuthority: PublicKey
  collectionMint: PublicKey
  itemsRedeemed: bigint
  data: CandyMachineData
}

/**
 * Candy Machine configuration data
 */
export interface CandyMachineData {
  itemsAvailable: bigint
  symbol: string
  sellerFeeBasisPoints: number
  maxSupply: bigint
  isMutable: boolean
  creators: Creator[]
  configLineSettings: ConfigLineSettings | null
  hiddenSettings: HiddenSettings | null
}

/**
 * Creator info
 */
export interface Creator {
  address: PublicKey
  verified: boolean
  percentageShare: number
}

/**
 * Config line settings
 */
export interface ConfigLineSettings {
  prefixName: string
  nameLength: number
  prefixUri: string
  uriLength: number
  isSequential: boolean
}

/**
 * Hidden settings for reveal
 */
export interface HiddenSettings {
  name: string
  uri: string
  hash: Uint8Array
}

/**
 * Config line for NFT
 */
export interface ConfigLine {
  name: string
  uri: string
}

/**
 * Initialize Candy Machine options
 */
export interface InitializeCandyMachineOptions {
  candyMachine: PublicKey
  authority: PublicKey
  payer: PublicKey
  collectionMint: PublicKey
  collectionUpdateAuthority: PublicKey
  data: CandyMachineData
  tokenStandard: number
}

/**
 * Add config lines options
 */
export interface AddConfigLinesOptions {
  candyMachine: PublicKey
  authority: PublicKey
  index: number
  configLines: ConfigLine[]
}

/**
 * Mint from Candy Machine options
 */
export interface MintFromCandyMachineOptions {
  candyMachine: PublicKey
  authority: PublicKey
  payer: PublicKey
  nftMint: PublicKey
  nftMintAuthority: PublicKey
  nftMetadata: PublicKey
  nftMasterEdition: PublicKey
  collectionMint: PublicKey
  collectionMetadata: PublicKey
  collectionMasterEdition: PublicKey
  collectionUpdateAuthority: PublicKey
  tokenAccount: PublicKey
}

/**
 * Update Candy Machine options
 */
export interface UpdateCandyMachineOptions {
  candyMachine: PublicKey
  authority: PublicKey
  data: CandyMachineData
}

/**
 * Withdraw options
 */
export interface WithdrawOptions {
  candyMachine: PublicKey
  authority: PublicKey
}
