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
 * Mint from Candy Machine options (mint_v2)
 *
 * Accounts follow the mpl-candy-machine `MintV2` account order. Compared to
 * the deprecated `mint` instruction this adds the token account, token record,
 * collection delegate record, recent-slothashes sysvar and the optional
 * authorization-rules accounts.
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
   * The program creates and initializes the mint account via CPI, which
   * requires the mint to sign — keep this true when passing a freshly
   * generated keypair (the usual flow). Set to false only when the mint
   * account already exists and is initialized on-chain.
   */
  nftMintIsSigner?: boolean
  nftMintAuthority: PublicKey
  nftMetadata: PublicKey
  nftMasterEdition: PublicKey
  /**
   * Token account receiving the NFT (usually the payer's ATA). When omitted,
   * the program creates the associated token account via CPI; the account
   * slot then carries the program-id "None" placeholder.
   */
  tokenAccount?: PublicKey
  /** Token record PDA (programmable NFTs only) */
  tokenRecord?: PublicKey
  /** Collection metadata delegate record (V2 seeds) — required */
  collectionDelegateRecord: PublicKey
  collectionMint: PublicKey
  collectionMetadata: PublicKey
  collectionMasterEdition: PublicKey
  collectionUpdateAuthority: PublicKey
  /**
   * Legacy collection authority record — only for legacy (V1) collections
   * delegated via `approve_collection_authority`. Leave unset for machines
   * initialized with initialize_v2 (they use the V2 delegate record).
   */
  collectionAuthorityRecord?: PublicKey
  /** Optional token auth rules program (programmable NFTs only) */
  authorizationRulesProgram?: PublicKey
  /** Optional token auth rules account (programmable NFTs only) */
  authorizationRules?: PublicKey
  /** Mint arguments (serialized guard data, usually empty for direct mints) */
  mintArgs?: Buffer
  /** Guard group label (only relevant for guarded machines) */
  group?: string
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
