import { airdrop, snapshot, verify, decode } from '../../src/cli/commands/utility'

export function register(cli: any): void {
  cli
    .command('airdrop <mint> <recipients-file>', 'Airdrop tokens to recipients')
    .option('--amount <amount>', 'Amount per recipient (for fungible tokens)')
    .option('--delay <ms>', 'Delay between transactions in ms', '500')
    .action(async (mint: string, recipientsFile: string, options: { amount?: string; delay?: string }) => {
      await airdrop(mint, recipientsFile, options)
    })

  cli
    .command('snapshot <mint>', 'Snapshot token holders')
    .option('--output <path>', 'Output file path')
    .option('--min-balance <amount>', 'Minimum balance filter')
    .action(async (mint: string, options: { output?: string; minBalance?: string }) => {
      await snapshot(mint, options)
    })

  cli
    .command('verify <signature>', 'Verify a transaction')
    .action(async (signature: string) => {
      await verify(signature)
    })

  cli
    .command('decode <data>', 'Decode transaction or account data')
    .option('--type <type>', 'Data type (transaction/account/base58/base64)', 'base64')
    .action(async (data: string, options: { type?: string }) => {
      await decode(data, options)
    })
}
