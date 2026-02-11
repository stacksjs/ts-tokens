import {
  securityAudit, securityCollection, securityWallet,
  securityReport, securityTx, securityAddress, securityWatch,
} from '../../src/cli/commands/security'

export function register(cli: any): void {
  cli
    .command('security:audit <mint>', 'Audit a token for security issues')
    .action(async (mint: string) => {
      await securityAudit(mint)
    })

  cli
    .command('security:collection <address>', 'Audit an NFT collection')
    .action(async (address: string) => {
      await securityCollection(address)
    })

  cli
    .command('security:wallet [address]', 'Audit wallet security')
    .action(async (address?: string) => {
      await securityWallet(address)
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
    .action(async (options: any) => {
      await securityReport(options)
    })

  cli
    .command('security:tx <signature>', 'Analyze a transaction for security issues')
    .action(async (signature: string) => {
      await securityTx(signature)
    })

  cli
    .command('security:address <address>', 'Check address reputation and security')
    .action(async (address: string) => {
      await securityAddress(address)
    })

  cli
    .command('security:watch <address>', 'Monitor address for security events')
    .option('--interval <ms>', 'Polling interval in milliseconds', { default: '30000' })
    .option('--webhook <url>', 'Webhook URL for notifications')
    .action(async (address: string, options: { interval?: string; webhook?: string }) => {
      await securityWatch(address, options)
    })
}
