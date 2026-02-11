/**
 * Compliance
 *
 * OFAC sanctions checking, transaction limits, record keeping, and tax reporting.
 */

/**
 * Sanctions check config
 */
export interface SanctionsConfig {
  endpoint?: string
  localList?: string[]
}

/**
 * Transaction limits config
 */
export interface TransactionLimitsConfig {
  dailyLimit: number
  weeklyLimit: number
  cooldownMs?: number
}

/**
 * Transaction limits state
 */
export interface TransactionLimitsState {
  dailyTotal: number
  weeklyTotal: number
  lastTransactionAt: Date | null
  transactions: Array<{ amount: number; timestamp: Date }>
}

/**
 * Transaction record
 */
export interface TransactionRecord {
  signature: string
  timestamp: Date
  type: 'send' | 'receive' | 'swap' | 'mint' | 'burn'
  amount: number
  token: string
  counterparty?: string
  priceUsd?: number
}

/**
 * Cost basis entry
 */
export interface CostBasisEntry {
  token: string
  amount: number
  costBasisUsd: number
  acquiredAt: Date
}

/**
 * Gains/losses report
 */
export interface GainsLossesReport {
  totalGains: number
  totalLosses: number
  netGainLoss: number
  entries: Array<{
    token: string
    amount: number
    costBasis: number
    proceeds: number
    gainLoss: number
    holdingPeriod: 'short' | 'long'
  }>
}

/**
 * Sanctions check result
 */
export interface SanctionsCheckResult {
  flagged: boolean
  reason?: string
}

/**
 * Check an address against sanctions lists
 */
export async function checkSanctionsAddress(
  address: string,
  config?: SanctionsConfig
): Promise<SanctionsCheckResult> {
  // Check local list first
  if (config?.localList?.includes(address)) {
    return { flagged: true, reason: 'Address found in local sanctions list' }
  }

  // Check remote endpoint if configured
  if (config?.endpoint) {
    try {
      const response = await fetch(`${config.endpoint}?address=${encodeURIComponent(address)}`, {
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json() as { flagged?: boolean; reason?: string }
        if (data.flagged) {
          return { flagged: true, reason: data.reason ?? 'Address flagged by sanctions endpoint' }
        }
      }
    } catch {
      // If the endpoint is unreachable, we cannot confirm clearance
      return { flagged: false, reason: 'Sanctions endpoint unreachable — manual review recommended' }
    }
  }

  return { flagged: false }
}

/**
 * Check transaction against configured limits
 */
export function checkTransactionLimits(
  amount: number,
  state: TransactionLimitsState,
  config: TransactionLimitsConfig
): { allowed: boolean; reason?: string } {
  const now = new Date()

  // Check cooldown
  if (config.cooldownMs && state.lastTransactionAt) {
    const elapsed = now.getTime() - state.lastTransactionAt.getTime()
    if (elapsed < config.cooldownMs) {
      const remaining = Math.ceil((config.cooldownMs - elapsed) / 1000)
      return { allowed: false, reason: `Cooldown active: ${remaining}s remaining` }
    }
  }

  // Calculate daily total (last 24 hours)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const dailyTotal = state.transactions
    .filter(tx => tx.timestamp >= oneDayAgo)
    .reduce((sum, tx) => sum + tx.amount, 0)

  if (dailyTotal + amount > config.dailyLimit) {
    return {
      allowed: false,
      reason: `Daily limit exceeded: ${dailyTotal + amount} > ${config.dailyLimit}`,
    }
  }

  // Calculate weekly total (last 7 days)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weeklyTotal = state.transactions
    .filter(tx => tx.timestamp >= oneWeekAgo)
    .reduce((sum, tx) => sum + tx.amount, 0)

  if (weeklyTotal + amount > config.weeklyLimit) {
    return {
      allowed: false,
      reason: `Weekly limit exceeded: ${weeklyTotal + amount} > ${config.weeklyLimit}`,
    }
  }

  return { allowed: true }
}

/**
 * Record a transaction
 */
export function recordTransaction(
  state: TransactionLimitsState,
  record: TransactionRecord
): void {
  state.transactions.push({ amount: record.amount, timestamp: record.timestamp })
  state.dailyTotal = state.transactions
    .filter(tx => tx.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000))
    .reduce((sum, tx) => sum + tx.amount, 0)
  state.weeklyTotal = state.transactions
    .filter(tx => tx.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .reduce((sum, tx) => sum + tx.amount, 0)
  state.lastTransactionAt = record.timestamp
}

/**
 * Export transaction history in CSV or JSON format
 */
export function exportTransactionHistory(
  records: TransactionRecord[],
  format: 'csv' | 'json'
): string {
  if (format === 'json') {
    return JSON.stringify(
      records.map(r => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      })),
      null,
      2
    )
  }

  // CSV format
  const headers = ['signature', 'timestamp', 'type', 'amount', 'token', 'counterparty', 'priceUsd']
  const rows = records.map(r => [
    r.signature,
    r.timestamp.toISOString(),
    r.type,
    r.amount.toString(),
    r.token,
    r.counterparty ?? '',
    r.priceUsd?.toString() ?? '',
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')
}

/**
 * Calculate cost basis using FIFO, LIFO, or average method
 */
export function calculateCostBasis(
  history: TransactionRecord[],
  method: 'fifo' | 'lifo' | 'average'
): CostBasisEntry[] {
  const holdings = new Map<string, Array<{ amount: number; priceUsd: number; timestamp: Date }>>()

  // Build holdings from buy/receive transactions
  for (const record of history) {
    if (record.type === 'receive' || record.type === 'mint') {
      const lots = holdings.get(record.token) ?? []
      lots.push({
        amount: record.amount,
        priceUsd: record.priceUsd ?? 0,
        timestamp: record.timestamp,
      })
      holdings.set(record.token, lots)
    }
  }

  const entries: CostBasisEntry[] = []

  for (const [token, lots] of holdings) {
    if (method === 'average') {
      const totalAmount = lots.reduce((sum, l) => sum + l.amount, 0)
      const totalCost = lots.reduce((sum, l) => sum + l.amount * l.priceUsd, 0)
      if (totalAmount > 0) {
        entries.push({
          token,
          amount: totalAmount,
          costBasisUsd: totalCost,
          acquiredAt: lots[0].timestamp,
        })
      }
    } else {
      const sortedLots = method === 'fifo'
        ? [...lots].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        : [...lots].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      for (const lot of sortedLots) {
        entries.push({
          token,
          amount: lot.amount,
          costBasisUsd: lot.amount * lot.priceUsd,
          acquiredAt: lot.timestamp,
        })
      }
    }
  }

  return entries
}

/**
 * Calculate gains and losses from transaction history
 */
export function calculateGainsLosses(history: TransactionRecord[]): GainsLossesReport {
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  const buyLots = new Map<string, Array<{ amount: number; priceUsd: number; timestamp: Date }>>()
  const entries: GainsLossesReport['entries'] = []

  // Build buy lots
  for (const record of history) {
    if ((record.type === 'receive' || record.type === 'mint') && record.priceUsd) {
      const lots = buyLots.get(record.token) ?? []
      lots.push({ amount: record.amount, priceUsd: record.priceUsd, timestamp: record.timestamp })
      buyLots.set(record.token, lots)
    }
  }

  // Match sells to buys (FIFO)
  for (const record of history) {
    if ((record.type === 'send' || record.type === 'burn') && record.priceUsd) {
      const lots = buyLots.get(record.token)
      if (!lots || lots.length === 0) continue

      let remaining = record.amount
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0]
        const used = Math.min(remaining, lot.amount)
        const costBasis = used * lot.priceUsd
        const proceeds = used * record.priceUsd!
        const holdingMs = record.timestamp.getTime() - lot.timestamp.getTime()

        entries.push({
          token: record.token,
          amount: used,
          costBasis,
          proceeds,
          gainLoss: proceeds - costBasis,
          holdingPeriod: holdingMs >= ONE_YEAR_MS ? 'long' : 'short',
        })

        lot.amount -= used
        remaining -= used
        if (lot.amount <= 0) lots.shift()
      }
    }
  }

  const totalGains = entries.filter(e => e.gainLoss > 0).reduce((sum, e) => sum + e.gainLoss, 0)
  const totalLosses = entries.filter(e => e.gainLoss < 0).reduce((sum, e) => sum + Math.abs(e.gainLoss), 0)

  return {
    totalGains,
    totalLosses,
    netGainLoss: totalGains - totalLosses,
    entries,
  }
}
