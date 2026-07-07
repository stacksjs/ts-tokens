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
 * Initialize Candy Machine (v2) options
 *
 * Accounts follow the mpl-candy-machine `initializeV2` instruction order.
 * `authorityPda` and the collection delegate record are derived PDAs; if
 * omitted they are computed from `candyMachine`/`collectionMint`.
 */
export interface InitializeCandyMachineOptions {
  candyMachine: PublicKey
  /** Candy Machine authority PDA (derived from candyMachine if omitted) */
  authorityPda?: PublicKey
  authority: PublicKey
  payer: PublicKey
  /** Optional token-metadata rule set for programmable NFTs */
  ruleSet?: PublicKey
  collectionMint: PublicKey
  /** Collection metadata account (derived if omitted) */
  collectionMetadata?: PublicKey
  /** Collection master edition account (derived if omitted) */
  collectionMasterEdition?: PublicKey
  collectionUpdateAuthority: PublicKey
  /** Collection metadata delegate record (derived if omitted) */
  collectionDelegateRecord?: PublicKey
  /** Optional pNFT authorization rules program */
  authorizationRulesProgram?: PublicKey
  /** Optional pNFT authorization rules account */
  authorizationRules?: PublicKey
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
  /** Candy Machine authority PDA (derived from candyMachine if omitted) */
  authorityPda?: PublicKey
  /** Mint authority (must sign) — the candy machine authority or guard PDA */
  mintAuthority: PublicKey
  payer: PublicKey
  nftMint: PublicKey
  /**
   * Whether the NFT mint is a transaction signer (default true).
   *
   * The program only creates the mint account when it signs, so this must be
   * true when passing a freshly generated keypair (the usual flow). Set to
   * false only when the mint account already exists on-chain.
   */
  nftMintIsSigner?: boolean
  nftMintAuthority: PublicKey
  nftMetadata: PublicKey
  nftMasterEdition: PublicKey
  /** Collection authority record (delegate) PDA */
  collectionAuthorityRecord: PublicKey
  collectionMint: PublicKey
  collectionMetadata: PublicKey
  collectionMasterEdition: PublicKey
  collectionUpdateAuthority: PublicKey
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
