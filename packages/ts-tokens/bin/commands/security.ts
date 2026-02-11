import { getConfig } from '../../src/config'

export function register(cli: any): void {
  cli
    .command('security:audit <mint>', 'Audit a token for security issues')
    .action(async (mint: string) => {
      const config = await getConfig()
      const { auditToken } = await import('../../src/security/audit')
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { formatAuditReport } = await import('../../src/cli/security-helpers')
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const connection = createConnection(config)
        const report = await auditToken(connection, new PublicKey(mint))
        console.log(formatAuditReport(report))
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('security:collection <address>', 'Audit an NFT collection')
    .action(async (address: string) => {
      const config = await getConfig()
      const { auditCollection } = await import('../../src/security/audit')
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { formatAuditReport } = await import('../../src/cli/security-helpers')
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const connection = createConnection(config)
        const report = await auditCollection(connection, new PublicKey(address))
        console.log(formatAuditReport(report))
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('security:wallet [address]', 'Audit wallet security')
    .action(async (address?: string) => {
      const config = await getConfig()
      const { auditWallet } = await import('../../src/security/audit')
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')
      const { formatAuditReport } = await import('../../src/cli/security-helpers')
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const walletAddr = address || getPublicKey(config)
        const connection = createConnection(config)
        const report = await auditWallet(connection, new PublicKey(walletAddr))
        console.log(formatAuditReport(report))
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('security:report', 'Generate full security report')
    .option('--tokens <mints>', 'Comma-separated token mint addresses')
    .option('--collections <addresses>', 'Comma-separated collection addresses')
    .option('--candy-machines <addresses>', 'Comma-separated Candy Machine addresses')
    .option('--dao <addresses>', 'Comma-separated DAO addresses')
    .option('--staking-pools <addresses>', 'Comma-separated staking pool addresses')
    .option('--wallet [address]', 'Include wallet audit')
    .option('--format <format>', 'Output format: text, json, markdown', { default: 'text' })
    .option('--output <file>', 'Write report to file')
    .action(async (options: {
      tokens?: string
      collections?: string
      candyMachines?: string
      dao?: string
      stakingPools?: string
      wallet?: string | boolean
      format?: string
      output?: string
    }) => {
      const config = await getConfig()
      const { generateComprehensiveReport, formatReportAsMarkdown, formatReportAsJson } = await import('../../src/security/report')
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')
      const { formatSecurityReport } = await import('../../src/cli/security-helpers')
      const { PublicKey } = await import('@solana/web3.js')

      try {
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

        const report = await generateComprehensiveReport({
          connection, tokens, collections, candyMachines, daos, stakingPools, wallet,
        })

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
          console.log(`Report written to ${options.output}`)
        } else {
          console.log(output)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('security:tx <signature>', 'Analyze a transaction for security issues')
    .action(async (signature: string) => {
      const config = await getConfig()
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { checkSimulationErrors } = await import('../../src/security/transaction-checks')
      const { checkCpiPrograms } = await import('../../src/security/program-checks')
      const { formatTransactionCheck } = await import('../../src/cli/security-helpers')

      try {
        const connection = createConnection(config)
        const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 })

        if (!tx) {
          console.error('Transaction not found')
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

        console.log(formatTransactionCheck(combined, signature))
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('security:address <address>', 'Check address reputation and security')
    .action(async (address: string) => {
      const config = await getConfig()
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { checkAddressReputation } = await import('../../src/security/checks')
      const { checkKnownScamDatabase } = await import('../../src/security/phishing-checks')
      const { formatAddressCheck } = await import('../../src/cli/security-helpers')
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const connection = createConnection(config)
        const repCheck = await checkAddressReputation(address)
        const scamCheck = checkKnownScamDatabase(address)

        const combined = {
          safe: repCheck.safe && scamCheck.safe,
          warnings: [...repCheck.warnings, ...scamCheck.warnings],
          recommendations: [...repCheck.recommendations, ...scamCheck.recommendations],
        }

        console.log(formatAddressCheck(combined, address))
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('security:watch <address>', 'Monitor address for security events')
    .option('--interval <ms>', 'Polling interval in milliseconds', { default: '30000' })
    .option('--webhook <url>', 'Webhook URL for notifications')
    .action(async (address: string, options: { interval?: string; webhook?: string }) => {
      const config = await getConfig()
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { SecurityMonitor, formatSecurityEvent } = await import('../../src/security/monitor')

      try {
        const connection = createConnection(config)
        const monitor = new SecurityMonitor(connection, {
          intervalMs: parseInt(options.interval ?? '30000', 10),
          webhookUrl: options.webhook,
        })

        monitor.addAddress(address)
        monitor.start()

        console.log(`Monitoring ${address} (interval: ${options.interval ?? '30000'}ms)`)
        console.log('Press Ctrl+C to stop\n')

        // Print events periodically
        setInterval(() => {
          const events = monitor.getRecentEvents(10)
          for (const event of events) {
            console.log(formatSecurityEvent(event))
          }
        }, parseInt(options.interval ?? '30000', 10))

        // Keep process alive
        process.on('SIGINT', () => {
          monitor.stop()
          console.log('\nMonitoring stopped')
          process.exit(0)
        })
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
