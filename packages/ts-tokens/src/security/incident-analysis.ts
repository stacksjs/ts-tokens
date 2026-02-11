/**
 * Incident Analysis
 *
 * Transaction tracing, timeline reconstruction, loss calculation, and report generation.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

/**
 * Traced transaction
 */
export interface TracedTransaction {
  signature: string
  blockTime: Date
  type: string
  from: string
  to: string
  amount: number
  token: string
  success: boolean
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  timestamp: Date
  signature: string
  description: string
  affectedAddresses: string[]
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
}

/**
 * Loss calculation result
 */
export interface LossCalculation {
  address: string
  solBefore: number
  solAfter: number
  solLoss: number
  tokenLosses: Array<{
    mint: string
    amountBefore: number
    amountAfter: number
    loss: number
  }>
  totalEstimatedLossSOL: number
}

/**
 * Incident report
 */
export interface IncidentReport {
  generatedAt: Date
  summary: string
  timeline: TimelineEvent[]
  losses: LossCalculation
  affectedAddresses: string[]
  recommendations: string[]
  markdown: string
}

/**
 * Trace transactions for an address within a time range
 */
export async function traceTransactions(
  connection: Connection,
  address: string,
  startTime: Date,
  endTime: Date
): Promise<TracedTransaction[]> {
  const pubkey = new PublicKey(address)
  const traced: TracedTransaction[] = []

  const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 1000 })

  const startEpoch = Math.floor(startTime.getTime() / 1000)
  const endEpoch = Math.floor(endTime.getTime() / 1000)

  const filtered = signatures.filter(sig => {
    if (!sig.blockTime) return false
    return sig.blockTime >= startEpoch && sig.blockTime <= endEpoch
  })

  for (const sig of filtered) {
    try {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      })

      if (!tx) continue

      const blockTime = new Date((tx.blockTime ?? 0) * 1000)
      const accounts = tx.transaction.message.accountKeys.map(k =>
        typeof k === 'string' ? k : k.pubkey.toBase58()
      )

      // Detect SOL transfers
      if (tx.meta?.preBalances && tx.meta.postBalances) {
        for (let i = 0; i < tx.meta.preBalances.length; i++) {
          const change = tx.meta.postBalances[i] - tx.meta.preBalances[i]
          if (Math.abs(change) > LAMPORTS_PER_SOL * 0.01) {
            traced.push({
              signature: sig.signature,
              blockTime,
              type: change > 0 ? 'receive' : 'send',
              from: change < 0 ? accounts[i] : address,
              to: change > 0 ? accounts[i] : address,
              amount: Math.abs(change) / LAMPORTS_PER_SOL,
              token: 'SOL',
              success: !sig.err,
            })
          }
        }
      }

      // Detect token transfers from inner instructions
      const innerInstructions = tx.meta?.innerInstructions ?? []
      for (const inner of innerInstructions) {
        for (const ix of inner.instructions) {
          const parsed = (ix as any).parsed
          if (parsed?.type === 'transfer' && parsed.info) {
            traced.push({
              signature: sig.signature,
              blockTime,
              type: 'token_transfer',
              from: parsed.info.source ?? '',
              to: parsed.info.destination ?? '',
              amount: Number(parsed.info.amount ?? 0),
              token: parsed.info.mint ?? 'unknown',
              success: !sig.err,
            })
          }
        }
      }
    } catch {
      // Skip unparseable transactions
    }
  }

  return traced.sort((a, b) => a.blockTime.getTime() - b.blockTime.getTime())
}

/**
 * Reconstruct a timeline of events from traced transactions
 */
export function reconstructTimeline(events: TracedTransaction[]): TimelineEvent[] {
  const sorted = [...events].sort((a, b) => a.blockTime.getTime() - b.blockTime.getTime())

  return sorted.map(tx => {
    let severity: TimelineEvent['severity'] = 'info'
    let description = ''

    if (tx.type === 'send' && tx.amount > 10) {
      severity = tx.amount > 100 ? 'critical' : 'high'
      description = `Large outgoing transfer: ${tx.amount.toFixed(4)} ${tx.token} to ${tx.to}`
    } else if (tx.type === 'send') {
      severity = 'medium'
      description = `Outgoing transfer: ${tx.amount.toFixed(4)} ${tx.token} to ${tx.to}`
    } else if (tx.type === 'receive') {
      severity = 'info'
      description = `Incoming transfer: ${tx.amount.toFixed(4)} ${tx.token} from ${tx.from}`
    } else if (tx.type === 'token_transfer') {
      severity = 'medium'
      description = `Token transfer: ${tx.amount} from ${tx.from} to ${tx.to}`
    } else {
      description = `${tx.type}: ${tx.amount.toFixed(4)} ${tx.token}`
    }

    return {
      timestamp: tx.blockTime,
      signature: tx.signature,
      description,
      affectedAddresses: [tx.from, tx.to].filter(Boolean),
      severity,
    }
  })
}

/**
 * Calculate losses for an address by comparing balances before and after an incident
 */
export async function calculateLosses(
  connection: Connection,
  address: string,
  beforeTime: Date,
  afterTime: Date
): Promise<LossCalculation> {
  const pubkey = new PublicKey(address)

  // Get current balance as "after"
  const solAfter = (await connection.getBalance(pubkey)) / LAMPORTS_PER_SOL

  // Estimate "before" balance from transaction history
  const traces = await traceTransactions(connection, address, beforeTime, afterTime)

  let solLost = 0
  for (const tx of traces) {
    if (tx.token === 'SOL' && tx.type === 'send') {
      solLost += tx.amount
    }
  }

  const solBefore = solAfter + solLost

  // Check token account changes
  const tokenLosses: LossCalculation['tokenLosses'] = []
  const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token')

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  })

  for (const { account } of tokenAccounts.value) {
    const parsed = (account.data as any).parsed?.info
    if (!parsed) continue

    const currentAmount = Number(parsed.tokenAmount?.uiAmount ?? 0)
    const mint = parsed.mint

    // Find transfers for this token
    const tokenTxs = traces.filter(t => t.token === mint && t.type === 'token_transfer')
    const lostAmount = tokenTxs.reduce((sum, t) => sum + t.amount, 0)

    if (lostAmount > 0) {
      tokenLosses.push({
        mint,
        amountBefore: currentAmount + lostAmount,
        amountAfter: currentAmount,
        loss: lostAmount,
      })
    }
  }

  return {
    address,
    solBefore,
    solAfter,
    solLoss: solLost,
    tokenLosses,
    totalEstimatedLossSOL: solLost,
  }
}

/**
 * Generate a markdown incident report
 */
export function generateIncidentReport(
  timeline: TimelineEvent[],
  losses: LossCalculation
): IncidentReport {
  const affectedAddresses = [...new Set(timeline.flatMap(e => e.affectedAddresses))]

  const criticalEvents = timeline.filter(e => e.severity === 'critical' || e.severity === 'high')
  const summary = criticalEvents.length > 0
    ? `${criticalEvents.length} critical/high severity events detected. Estimated loss: ${losses.solLoss.toFixed(4)} SOL.`
    : `${timeline.length} events traced. No critical events detected.`

  const recommendations: string[] = []
  if (losses.solLoss > 0) {
    recommendations.push('Immediately transfer remaining assets to a new secure wallet')
    recommendations.push('Revoke all token authorities on affected mints')
  }
  if (affectedAddresses.length > 2) {
    recommendations.push('Multiple addresses affected — investigate for common attack vector')
  }
  recommendations.push('Review all recent approvals and delegations')
  recommendations.push('Enable monitoring on all remaining wallets')

  const markdown = [
    `# Incident Report`,
    ``,
    `**Generated:** ${new Date().toISOString()}`,
    ``,
    `## Summary`,
    ``,
    summary,
    ``,
    `## Losses`,
    ``,
    `| Asset | Before | After | Loss |`,
    `|-------|--------|-------|------|`,
    `| SOL | ${losses.solBefore.toFixed(4)} | ${losses.solAfter.toFixed(4)} | ${losses.solLoss.toFixed(4)} |`,
    ...losses.tokenLosses.map(t =>
      `| ${t.mint.slice(0, 8)}... | ${t.amountBefore} | ${t.amountAfter} | ${t.loss} |`
    ),
    ``,
    `## Timeline`,
    ``,
    ...timeline.map(e =>
      `- **[${e.severity.toUpperCase()}]** ${e.timestamp.toISOString()} — ${e.description} (\`${e.signature.slice(0, 16)}...\`)`
    ),
    ``,
    `## Affected Addresses`,
    ``,
    ...affectedAddresses.map(a => `- \`${a}\``),
    ``,
    `## Recommendations`,
    ``,
    ...recommendations.map((r, i) => `${i + 1}. ${r}`),
  ].join('\n')

  return {
    generatedAt: new Date(),
    summary,
    timeline,
    losses,
    affectedAddresses,
    recommendations,
    markdown,
  }
}
