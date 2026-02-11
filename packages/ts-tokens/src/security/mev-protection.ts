/**
 * MEV Protection
 *
 * Checks and recommendations for protecting against MEV
 * (Maximum Extractable Value) attacks like sandwich attacks.
 */

import type { SecurityCheckResult } from './checks'

/**
 * Recommend private transaction submission for high-value transactions
 */
export function recommendPrivateSubmission(txValue: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (txValue > 1000) {
    recommendations.push('Consider using a private transaction submission service (e.g. Jito) for high-value transactions')
    recommendations.push('Private submission prevents front-running and sandwich attacks')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check timing randomization
 */
export function checkTimingRandomization(): SecurityCheckResult {
  return {
    safe: true,
    warnings: [],
    recommendations: [
      'Add random delays between transactions to reduce predictability',
      'Avoid submitting large swaps at predictable times',
    ],
  }
}

/**
 * Check MEV vulnerability for a transaction type
 */
export function checkMevVulnerability(txType: string, value: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  const mevVulnerable = ['swap', 'liquidation', 'arbitrage', 'nft-mint']
  if (mevVulnerable.includes(txType)) {
    warnings.push(`Transaction type "${txType}" is vulnerable to MEV extraction`)
    recommendations.push('Use slippage protection and private transaction submission')
  }

  if (value > 100) {
    warnings.push('High-value transaction — higher MEV incentive')
    recommendations.push('Split large transactions into smaller ones to reduce MEV exposure')
  }

  return { safe: true, warnings, recommendations }
}

/**
 * Check slippage tolerance
 */
export function checkSlippageTolerance(slippageBps: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (slippageBps > 500) {
    warnings.push(`Slippage tolerance is ${slippageBps / 100}% — very high`)
    recommendations.push('High slippage makes sandwich attacks more profitable')
    recommendations.push('Use the minimum slippage necessary for the trade')
  } else if (slippageBps > 100) {
    warnings.push(`Slippage tolerance is ${slippageBps / 100}%`)
    recommendations.push('Consider reducing slippage tolerance if possible')
  }

  if (slippageBps < 10) {
    recommendations.push('Very low slippage may cause transactions to fail in volatile markets')
  }

  return { safe: slippageBps <= 500, warnings, recommendations }
}

/**
 * Check price impact of a trade
 */
export function checkPriceImpact(impactPct: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (impactPct > 5) {
    warnings.push(`Price impact is ${impactPct.toFixed(2)}% — very high`)
    recommendations.push('High price impact indicates low liquidity — consider smaller trade size')
  } else if (impactPct > 1) {
    warnings.push(`Price impact is ${impactPct.toFixed(2)}%`)
    recommendations.push('Consider splitting into multiple smaller trades')
  }

  return { safe: impactPct <= 5, warnings, recommendations }
}

/**
 * Check for low liquidity risks
 */
export function checkLowLiquidity(poolTvl: number, swapAmount: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (poolTvl === 0) {
    return { safe: false, warnings: ['Pool has no liquidity'], recommendations: ['Do not trade in a pool with no liquidity'] }
  }

  const ratio = swapAmount / poolTvl
  if (ratio > 0.1) {
    warnings.push(`Swap is ${(ratio * 100).toFixed(1)}% of pool TVL — significant market impact`)
    recommendations.push('Large swaps relative to pool size cause high slippage and MEV exposure')
  }

  return { safe: ratio <= 0.1, warnings, recommendations }
}

/**
 * Check sandwich attack risk
 */
export function checkSandwichRisk(swapAmount: number, poolLiquidity: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (poolLiquidity === 0) {
    return { safe: false, warnings: ['No pool liquidity — extreme sandwich risk'], recommendations: ['Avoid trading'] }
  }

  const ratio = swapAmount / poolLiquidity
  if (ratio > 0.01) {
    warnings.push('Swap size makes sandwich attack profitable')
    recommendations.push('Use private transaction submission (Jito bundles) to prevent sandwich attacks')
    recommendations.push('Set tight slippage tolerance')
  }

  return { safe: ratio <= 0.01, warnings, recommendations }
}

/**
 * Recommend Jito bundle for high-value transactions
 */
export function recommendJitoBundle(txValue: number): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  if (txValue > 50) {
    recommendations.push('Consider using Jito bundles for atomic transaction submission')
    recommendations.push('Jito bundles provide MEV protection and tip-based prioritization')
  }

  return { safe: true, warnings, recommendations }
}
