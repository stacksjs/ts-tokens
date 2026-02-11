import {
  tokenCreate, tokenMint, tokenTransfer, tokenBurn,
  tokenInfo, tokenBalance, tokenHolders, tokenAuthority,
  tokenCreate2022, tokenMetadata, tokenGroup, tokenHarvestFees,
  feesCollect, feesWithdraw,
} from '../../src/cli/commands/token'

export function register(cli: any): void {
  cli
    .command('create', 'Create a new fungible token')
    .option('--name <name>', 'Token name')
    .option('--symbol <symbol>', 'Token symbol')
    .option('--decimals <decimals>', 'Decimal places', '9')
    .option('--supply <supply>', 'Initial supply')
    .option('--metadata-uri <uri>', 'Metadata URI')
    .option('--token-2022', 'Use Token-2022 program')
    .option('--transfer-fee <bps>', 'Enable transfer fees (basis points)')
    .option('--max-fee <amount>', 'Maximum transfer fee', '1000000000')
    .option('--interest-rate <rate>', 'Interest-bearing rate (basis points)')
    .option('--soulbound', 'Non-transferable (soulbound)')
    .option('--confidential', 'Enable confidential transfers')
    .option('--default-frozen', 'New accounts start frozen')
    .action(async (options: any) => {
      await tokenCreate(options)
    })

  cli
    .command('mint <mint> <amount>', 'Mint tokens')
    .option('--to <address>', 'Recipient address')
    .action(async (mint: string, amount: string, options: { to?: string }) => {
      await tokenMint(mint, amount, options)
    })

  cli
    .command('transfer <mint> <amount> <to>', 'Transfer tokens')
    .action(async (mint: string, amount: string, to: string) => {
      await tokenTransfer(mint, amount, to)
    })

  cli
    .command('burn <mint> <amount>', 'Burn tokens')
    .action(async (mint: string, amount: string) => {
      await tokenBurn(mint, amount)
    })

  cli
    .command('info <mint>', 'Show token information')
    .action(async (mint: string) => {
      await tokenInfo(mint)
    })

  cli
    .command('balance <mint>', 'Show token balance')
    .action(async (mint: string) => {
      await tokenBalance(mint)
    })

  cli
    .command('fees:collect <mint>', 'Harvest withheld transfer fees to mint')
    .option('--accounts <addrs>', 'Comma-separated source token accounts')
    .action(async (mint: string, options: { accounts?: string }) => {
      await feesCollect(mint, options)
    })

  cli
    .command('fees:withdraw <mint>', 'Withdraw collected fees from mint')
    .option('--destination <addr>', 'Destination token account')
    .action(async (mint: string, options: { destination?: string }) => {
      await feesWithdraw(mint, options)
    })

  cli
    .command('token:create-2022', 'Create a Token-2022 token with extensions')
    .option('--name <name>', 'Token name')
    .option('--symbol <symbol>', 'Token symbol')
    .option('--decimals <decimals>', 'Decimal places', '9')
    .option('--extensions <list>', 'Comma-separated extensions (transferFee,metadata,nonTransferable,permanentDelegate)')
    .option('--transfer-fee-bps <bps>', 'Transfer fee basis points')
    .option('--max-fee <amount>', 'Max transfer fee')
    .action(async (options: any) => {
      await tokenCreate2022(options)
    })

  cli
    .command('token:metadata <mint>', 'Set embedded metadata on Token-2022 mint')
    .option('--name <name>', 'Token name')
    .option('--symbol <symbol>', 'Token symbol')
    .option('--uri <uri>', 'Metadata URI')
    .action(async (mint: string, options: { name?: string; symbol?: string; uri?: string }) => {
      await tokenMetadata(mint, options)
    })

  cli
    .command('token:group <mint>', 'Initialize a token group')
    .option('--max-size <size>', 'Maximum group size', '100')
    .action(async (mint: string, options: { maxSize?: string }) => {
      await tokenGroup(mint, options)
    })

  cli
    .command('token:harvest-fees <mint>', 'Harvest transfer fees from all accounts')
    .option('--withdraw', 'Also withdraw fees from mint')
    .option('--destination <address>', 'Withdrawal destination')
    .action(async (mint: string, options: { withdraw?: boolean; destination?: string }) => {
      await tokenHarvestFees(mint, options)
    })

  cli
    .command('holders <mint>', 'List token holders')
    .option('--limit <limit>', 'Maximum number of holders to show', '20')
    .action(async (mint: string, options: { limit?: string }) => {
      await tokenHolders(mint, options)
    })

  cli
    .command('authority <mint>', 'Manage token authorities')
    .option('--revoke-mint', 'Revoke mint authority')
    .option('--revoke-freeze', 'Revoke freeze authority')
    .option('--transfer-mint <address>', 'Transfer mint authority to address')
    .option('--transfer-freeze <address>', 'Transfer freeze authority to address')
    .action(async (mint: string, options: any) => {
      await tokenAuthority(mint, options)
    })
}
