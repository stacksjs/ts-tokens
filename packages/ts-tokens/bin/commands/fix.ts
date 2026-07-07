import { fixError, fixList } from '../../src/cli/commands/fix'

export function register(cli: any): void {
  cli
    .command('fix <errorCode>', 'Explain a Solana/token error code and how to fix it')
    .action(async (errorCode: string) => {
      await fixError(errorCode)
    })

  cli
    .command('fix:list', 'List all known error codes with fixes')
    .action(async () => {
      await fixList()
    })
}
