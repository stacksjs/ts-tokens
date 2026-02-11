/**
 * Distribution Types
 *
 * Types for link-based token distribution (TipLink pattern).
 */

/**
 * Claim link status
 */
export type ClaimStatus = 'pending' | 'funded' | 'claimed' | 'expired' | 'reclaimed'

/**
 * A claim link containing an ephemeral keypair
 */
export interface ClaimLink {
  id: string
  url: string
  publicKey: string
  amount: bigint
  mint?: string
  status: ClaimStatus
  claimedBy?: string
  fundSignature?: string
  claimSignature?: string
  createdAt: number
  expiresAt?: number
}

/**
 * Distribution campaign
 */
export interface DistributionCampaign {
  id: string
  name: string
  mint?: string
  amountPerLink: bigint
  totalLinks: number
  fundedLinks: number
  claimedLinks: number
  links: string[]
  createdAt: number
}

/**
 * Options for creating a claim link
 */
export interface CreateClaimLinkOptions {
  amount: bigint
  mint?: string
  expiresInSeconds?: number
  baseUrl?: string
}

/**
 * Options for creating a distribution campaign
 */
export interface CreateCampaignOptions {
  name: string
  mint?: string
  amountPerLink: bigint
  numberOfLinks: number
  expiresInSeconds?: number
  baseUrl?: string
}

/**
 * Serialized claim link for persistence
 */
export interface SerializedClaimLink {
  id: string
  url: string
  publicKey: string
  secretKey: string
  amount: string
  mint?: string
  status: ClaimStatus
  claimedBy?: string
  fundSignature?: string
  claimSignature?: string
  createdAt: number
  expiresAt?: number
}

/**
 * Serialized campaign for persistence
 */
export interface SerializedCampaign {
  id: string
  name: string
  mint?: string
  amountPerLink: string
  totalLinks: number
  fundedLinks: number
  claimedLinks: number
  links: string[]
  createdAt: number
}

/**
 * Distribution state
 */
export interface DistributionState {
  links: Record<string, SerializedClaimLink>
  campaigns: Record<string, SerializedCampaign>
}
