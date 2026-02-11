/**
 * Distribution Campaigns
 *
 * Bulk link generation, campaign management, and analytics.
 */

import type { TokenConfig } from '../types'
import type {
  DistributionCampaign,
  CreateCampaignOptions,
  ClaimLink,
} from './types'
import {
  createClaimLink,
  fundClaimLink,
  getClaimLinkStatus,
  loadDistributionState,
  saveDistributionState,
} from './link'

/**
 * Generate a unique campaign ID
 */
function generateCampaignId(): string {
  return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create a distribution campaign with bulk link generation
 */
export async function createCampaign(
  options: CreateCampaignOptions,
  config: TokenConfig
): Promise<DistributionCampaign> {
  const linkIds: string[] = []

  // Generate all claim links
  for (let i = 0; i < options.numberOfLinks; i++) {
    const link = await createClaimLink({
      amount: options.amountPerLink,
      mint: options.mint,
      expiresInSeconds: options.expiresInSeconds,
      baseUrl: options.baseUrl,
    }, config)

    linkIds.push(link.id)
  }

  const campaign: DistributionCampaign = {
    id: generateCampaignId(),
    name: options.name,
    mint: options.mint,
    amountPerLink: options.amountPerLink,
    totalLinks: options.numberOfLinks,
    fundedLinks: 0,
    claimedLinks: 0,
    links: linkIds,
    createdAt: Date.now(),
  }

  // Persist campaign
  const state = loadDistributionState()
  state.campaigns[campaign.id] = {
    id: campaign.id,
    name: campaign.name,
    mint: campaign.mint,
    amountPerLink: campaign.amountPerLink.toString(),
    totalLinks: campaign.totalLinks,
    fundedLinks: campaign.fundedLinks,
    claimedLinks: campaign.claimedLinks,
    links: campaign.links,
    createdAt: campaign.createdAt,
  }
  saveDistributionState(state)

  return campaign
}

/**
 * Fund all pending links in a campaign
 */
export async function fundCampaign(
  campaignId: string,
  config: TokenConfig
): Promise<{ funded: number; failed: number; signatures: string[] }> {
  const state = loadDistributionState()
  const campaign = state.campaigns[campaignId]
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`)

  let funded = 0
  let failed = 0
  const signatures: string[] = []

  for (const linkId of campaign.links) {
    const link = state.links[linkId]
    if (!link || link.status !== 'pending') continue

    try {
      const result = await fundClaimLink(linkId, config)
      signatures.push(result.signature)
      funded++
    } catch {
      failed++
    }
  }

  // Update campaign state
  campaign.fundedLinks = (campaign.fundedLinks ?? 0) + funded
  saveDistributionState(state)

  return { funded, failed, signatures }
}

/**
 * Get campaign statistics
 */
export function getCampaignStats(campaignId: string): {
  campaign: DistributionCampaign
  pending: number
  funded: number
  claimed: number
  expired: number
} | null {
  const state = loadDistributionState()
  const serialized = state.campaigns[campaignId]
  if (!serialized) return null

  let pending = 0
  let funded = 0
  let claimed = 0
  let expired = 0

  for (const linkId of serialized.links) {
    const link = state.links[linkId]
    if (!link) continue

    switch (link.status) {
      case 'pending': pending++; break
      case 'funded': funded++; break
      case 'claimed': claimed++; break
      case 'expired': expired++; break
    }
  }

  return {
    campaign: {
      id: serialized.id,
      name: serialized.name,
      mint: serialized.mint,
      amountPerLink: BigInt(serialized.amountPerLink),
      totalLinks: serialized.totalLinks,
      fundedLinks: funded,
      claimedLinks: claimed,
      links: serialized.links,
      createdAt: serialized.createdAt,
    },
    pending,
    funded,
    claimed,
    expired,
  }
}

/**
 * List all campaigns
 */
export function listCampaigns(): DistributionCampaign[] {
  const state = loadDistributionState()
  return Object.values(state.campaigns).map(s => ({
    id: s.id,
    name: s.name,
    mint: s.mint,
    amountPerLink: BigInt(s.amountPerLink),
    totalLinks: s.totalLinks,
    fundedLinks: s.fundedLinks,
    claimedLinks: s.claimedLinks,
    links: s.links,
    createdAt: s.createdAt,
  }))
}

/**
 * Get all claim link URLs from a campaign
 */
export function getCampaignLinks(campaignId: string): string[] {
  const state = loadDistributionState()
  const campaign = state.campaigns[campaignId]
  if (!campaign) return []

  return campaign.links
    .map(linkId => state.links[linkId]?.url)
    .filter(Boolean) as string[]
}
