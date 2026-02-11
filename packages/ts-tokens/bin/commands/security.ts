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
    .option('--wallet [address]', 'Include wallet audit')
    .action(async (options: { tokens?: string; collections?: string; wallet?: string | boolean }) => {
      const config = await getConfig()
      const { generateSecurityReport } = await import('../../src/security/audit')
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')
      const { formatSecurityReport } = await import('../../src/cli/security-helpers')
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const connection = createConnection(config)
        const tokens = options.tokens?.split(',').map(m => new PublicKey(m.trim()))
        const collections = options.collections?.split(',').map(a => new PublicKey(a.trim()))
        let wallet: InstanceType<typeof PublicKey> | undefined
        if (options.wallet) {
          const addr = typeof options.wallet === 'string' ? options.wallet : getPublicKey(config)
          wallet = new PublicKey(addr)
        }

        const report = await generateSecurityReport({ connection, tokens, collections, wallet })
        console.log(formatSecurityReport(report))
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
