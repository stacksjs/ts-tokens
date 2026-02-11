import {
  defiLimitBuy, defiLimitSell, defiLimitCancel, defiLimitList,
  defiDcaCreate, defiDcaClose, defiDcaList,
} from '../../src/cli/commands/defi'

export function register(cli: any): void {
  cli
    .command('defi:limit-buy <output-mint> <amount> <price>', 'Create a limit buy order')
    .option('--input-mint <mint>', 'Input token mint', 'So11111111111111111111111111111111111111112')
    .option('--expire <seconds>', 'Expiry in seconds')
    .action(async (outputMint: string, amount: string, price: string, options: { inputMint?: string; expire?: string }) => {
      await defiLimitBuy(outputMint, amount, price, options)
    })

  cli
    .command('defi:limit-sell <input-mint> <amount> <price>', 'Create a limit sell order')
    .option('--output-mint <mint>', 'Output token mint', 'So11111111111111111111111111111111111111112')
    .option('--expire <seconds>', 'Expiry in seconds')
    .action(async (inputMint: string, amount: string, price: string, options: { outputMint?: string; expire?: string }) => {
      await defiLimitSell(inputMint, amount, price, options)
    })

  cli
    .command('defi:limit-cancel <orders...>', 'Cancel limit orders')
    .action(async (orders: string[]) => {
      await defiLimitCancel(orders)
    })

  cli
    .command('defi:limit-list [wallet]', 'List open limit orders')
    .action(async (wallet?: string) => {
      await defiLimitList(wallet)
    })

  cli
    .command('defi:dca-create', 'Create a DCA position')
    .option('--input-mint <mint>', 'Input token mint')
    .option('--output-mint <mint>', 'Output token mint')
    .option('--total <amount>', 'Total input amount')
    .option('--per-cycle <amount>', 'Amount per cycle')
    .option('--frequency <seconds>', 'Cycle frequency in seconds')
    .action(async (options: any) => {
      await defiDcaCreate(options)
    })

  cli
    .command('defi:dca-close <dca>', 'Close a DCA position')
    .action(async (dca: string) => {
      await defiDcaClose(dca)
    })

  cli
    .command('defi:dca-list [wallet]', 'List DCA positions')
    .action(async (wallet?: string) => {
      await defiDcaList(wallet)
    })
}
