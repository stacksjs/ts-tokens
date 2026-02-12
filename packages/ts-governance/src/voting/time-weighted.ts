/**
 * Time-Weighted Voting Power
 *
 * Reward long-term holders with increased voting power.
 */

export type CurveType = 'linear' | 'exponential'

export interface TimeWeightConfig {
  curve: CurveType
  maxMultiplier: number
  maxDurationSeconds: bigint
}

const DEFAULT_CONFIG: TimeWeightConfig = {
  curve: 'linear',
  maxMultiplier: 3.0,
  maxDurationSeconds: 31536000n, // 1 year
}

/**
 * Get the time-weighted multiplier for a holding duration
 */
export function getTimeWeightedMultiplier(
  holdDurationSeconds: bigint,
  config: TimeWeightConfig = DEFAULT_CONFIG
): number {
  if (holdDurationSeconds <= 0n) return 1.0

  const ratio = Number(holdDurationSeconds) / Number(config.maxDurationSeconds)
  const clampedRatio = Math.min(ratio, 1.0)

  if (config.curve === 'linear') {
    // Linear: 1x at 0, maxMultiplier at maxDuration
    return 1.0 + (config.maxMultiplier - 1.0) * clampedRatio
  }

  // Exponential: 1x at 0, maxMultiplier at maxDuration
  // Using exponential growth: 1 * (maxMultiplier ^ ratio)
  return Math.pow(config.maxMultiplier, clampedRatio)
}

/**
 * Calculate time-weighted voting power
 */
export function calculateTimeWeightedPower(
  baseVotingPower: bigint,
  holdDurationSeconds: bigint,
  config: TimeWeightConfig = DEFAULT_CONFIG
): bigint {
  if (baseVotingPower <= 0n) return 0n

  const multiplier = getTimeWeightedMultiplier(holdDurationSeconds, config)
  // Scale by 10000 for precision, then divide back
  const scaledMultiplier = BigInt(Math.floor(multiplier * 10000))
  return (baseVotingPower * scaledMultiplier) / 10000n
}
