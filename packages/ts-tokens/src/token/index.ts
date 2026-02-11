/**
 * Token Operations
 *
 * Main entry point for fungible token operations.
 */

export * from './create'
export * from './mint'
export * from './transfer'
export * from './burn'
export * from './authority'
export * from './account'
export * from './metadata'
export * from './query'

// Re-export convenience functions
export { createToken, createSimpleToken } from './create'
export { mintTokens, mintTokensToMany } from './mint'
export { transferTokens, transferTokensToMany, transfer } from './transfer'
export { burnTokens, burnAll, burn } from './burn'
export {
  setMintAuthority,
  revokeMintAuthority,
  setFreezeAuthority,
  revokeFreezeAuthority,
  freezeAccount,
  thawAccount,
} from './authority'
export {
  getOrCreateAssociatedTokenAccount,
  createTokenAccount,
  closeTokenAccount,
  getTokenAccountInfo,
  getAssociatedTokenAccountAddress,
  tokenAccountExists,
} from './account'
export {
  createTokenMetadata,
  updateTokenMetadata,
  getTokenMetadata,
} from './metadata'
export {
  getTokenInfo,
  getTokenSupply,
  getTokenHolders,
  getTokenHistory,
  getLargestAccounts,
} from './query'

// Token-2022 Enhanced
export { createToken2022 } from './token2022'
export type { Token2022CreateOptions } from './token2022'
export { setEmbeddedMetadata, updateEmbeddedMetadataField, getEmbeddedMetadata } from './embedded-metadata'
export type { EmbeddedMetadata } from './embedded-metadata'
export { createTokenGroup, addGroupMember, updateGroupMaxSize } from './token-group'
export type { TokenGroup, TokenGroupMember } from './token-group'
export { harvestTransferFees, findAccountsWithWithheldFees } from './fee-harvester'
export type { HarvestResult } from './fee-harvester'
