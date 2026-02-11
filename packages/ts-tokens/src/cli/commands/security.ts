/** CLI security command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function securityAudit(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { auditToken } = await import('../../security/audit')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { formatAuditReport } = await import('../security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const report = await withSpinner('Auditing token...', () =>
      auditToken(connection, new PublicKey(mint))
    )
    info(formatAuditReport(report))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function securityCollection(address: string): Promise<void> {
  try {
    const config = await getConfig()
    const { auditCollection } = await import('../../security/audit')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { formatAuditReport } = await import('../security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const report = await withSpinner('Auditing collection...', () =>
      auditCollection(connection, new PublicKey(address))
    )
    info(formatAuditReport(report))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function securityWallet(address?: string): Promise<void> {
  try {
    const config = await getConfig()
    const { auditWallet } = await import('../../security/audit')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { getPublicKey } = await import('../../drivers/solana/wallet')
    const { formatAuditReport } = await import('../security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    const walletAddr = address || getPublicKey(config)
    const connection = createConnection(config)
    const report = await withSpinner('Auditing wallet...', () =>
      auditWallet(connection, new PublicKey(walletAddr))
    )
    info(formatAuditReport(report))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function securityReport(options: {
  tokens?: string
  collections?: string
  candyMachines?: string
  dao?: string
  stakingPools?: string
  wallet?: string | boolean
  format?: string
  output?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { generateComprehensiveReport, formatReportAsMarkdown, formatReportAsJson } = await import('../../security/report')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { getPublicKey } = await import('../../drivers/solana/wallet')
    const { formatSecurityReport } = await import('../security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const tokens = options.tokens?.split(',').map(m => new PublicKey(m.trim()))
    const collections = options.collections?.split(',').map(a => new PublicKey(a.trim()))
    const candyMachines = options.candyMachines?.split(',').map(a => new PublicKey(a.trim()))
    const daos = options.dao?.split(',').map(a => new PublicKey(a.trim()))
    const stakingPools = options.stakingPools?.split(',').map(a => new PublicKey(a.trim()))
    let wallet: InstanceType<typeof PublicKey> | undefined
    if (options.wallet) {
      const addr = typeof options.wallet === 'string' ? options.wallet : getPublicKey(config)
      wallet = new PublicKey(addr)
    }

    const report = await withSpinner('Generating security report...', () =>
      generateComprehensiveReport({ connection, tokens, collections, candyMachines, daos, stakingPools, wallet })
    )

    let output: string
    switch (options.format) {
      case 'json':
        output = formatReportAsJson(report)
        break
      case 'markdown':
        output = formatReportAsMarkdown(report)
        break
      default:
        output = formatSecurityReport({
          reports: report.reports,
          overallRiskScore: report.overallRiskScore,
          summary: report.executiveSummary,
        })
    }

    if (options.output) {
      const fs = await import('node:fs')
      fs.writeFileSync(options.output, output)
      success(`Report written to ${options.output}`)
    } else {
      info(output)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function securityTx(signature: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { checkSimulationErrors } = await import('../../security/transaction-checks')
    const { checkCpiPrograms } = await import('../../security/program-checks')
    const { formatTransactionCheck } = await import('../security-helpers')

    const connection = createConnection(config)
    const tx = await withSpinner('Fetching transaction...', () =>
      connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 })
    )

    if (!tx) {
      error('Transaction not found')
      process.exit(1)
    }

    const simCheck = checkSimulationErrors({
      success: !tx.meta?.err,
      error: tx.meta?.err ? JSON.stringify(tx.meta.err) : undefined,
      logs: tx.meta?.logMessages ?? [],
    })

    const programIds = tx.transaction.message.instructions.map((ix: any) =>
      typeof ix.programId === 'string' ? ix.programId : ix.programId.toBase58()
    )
    const cpiCheck = checkCpiPrograms(programIds.map((id: string) => ({ programId: id })))

    const combined = {
      safe: simCheck.safe && cpiCheck.safe,
      warnings: [...simCheck.warnings, ...cpiCheck.warnings],
      recommendations: [...simCheck.recommendations, ...cpiCheck.recommendations],
    }

    info(formatTransactionCheck(combined, signature))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function securityAddress(address: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { checkAddressReputation } = await import('../../security/checks')
    const { checkKnownScamDatabase } = await import('../../security/phishing-checks')
    const { formatAddressCheck } = await import('../security-helpers')

    createConnection(config)
    const repCheck = await withSpinner('Checking address reputation...', () =>
      checkAddressReputation(address)
    )
    const scamCheck = checkKnownScamDatabase(address)

    const combined = {
      safe: repCheck.safe && scamCheck.safe,
      warnings: [...repCheck.warnings, ...scamCheck.warnings],
      recommendations: [...repCheck.recommendations, ...scamCheck.recommendations],
    }

    info(formatAddressCheck(combined, address))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function securityWatch(address: string, options: { interval?: string; webhook?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { SecurityMonitor, formatSecurityEvent } = await import('../../security/monitor')

    const connection = createConnection(config)
    const intervalMs = parseInt(options.interval ?? '30000', 10)
    const monitor = new SecurityMonitor(connection, {
      intervalMs,
      webhookUrl: options.webhook,
    })

    monitor.addAddress(address)
    monitor.start()

    header('Security Monitor')
    keyValue('Address', address)
    keyValue('Interval', `${intervalMs}ms`)
    info('Press Ctrl+C to stop')

    setInterval(() => {
      const events = monitor.getRecentEvents(10)
      for (const event of events) {
        info(formatSecurityEvent(event))
      }
    }, intervalMs)

    process.on('SIGINT', () => {
      monitor.stop()
      info('Monitoring stopped')
      process.exit(0)
    })
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
