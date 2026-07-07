import {
  pnftCreate, pnftRules, pnftAddRule, pnftRemoveRule,
  pnftTransfer, pnftCanTransfer, sbtCreate, sbtRecover,
} from '../../src/cli/commands/pnft'

export function register(cli: any): void {
  cli
    .command('pnft:create', 'Create a programmable NFT')
    .option('--name <name>', 'NFT name')
    .option('--symbol <symbol>', 'NFT symbol')
    .option('--uri <uri>', 'Metadata URI')
    .option('--soulbound', 'Make the pNFT soulbound (non-transferable)')
    .option('--recovery-authority <address>', 'Recovery authority for soulbound tokens')
    .option('--collection <address>', 'Collection address')
    .action(async (options: any) => {
      await pnftCreate(options)
    })

  cli
    .command('pnft:rules <mint>', 'Show the rule set for a pNFT')
    .action(async (mint: string) => {
      await pnftRules(mint)
    })

  cli
    .command('pnft:add-rule <mint>', 'Add a transfer rule to a pNFT')
    .option('--type <type>', 'Rule type (royalty_enforcement, allow_list, deny_list, cooldown_period, max_transfers, soulbound)')
    .option('--royalty-bps <bps>', 'Royalty basis points (for royalty_enforcement)')
    .option('--addresses <list>', 'Comma-separated addresses (for allow_list/deny_list)')
    .option('--period-seconds <seconds>', 'Cooldown period in seconds')
    .option('--max-transfers <n>', 'Maximum number of transfers')
    .action(async (mint: string, options: any) => {
      await pnftAddRule(mint, options)
    })

  cli
    .command('pnft:remove-rule <mint>', 'Remove a transfer rule from a pNFT')
    .option('--type <type>', 'Rule type to remove')
    .action(async (mint: string, options: any) => {
      await pnftRemoveRule(mint, options)
    })

  cli
    .command('pnft:transfer <mint> <to>', 'Transfer a programmable NFT')
    .action(async (mint: string, to: string) => {
      await pnftTransfer(mint, to)
    })

  cli
    .command('pnft:can-transfer <mint> <to>', 'Check whether a pNFT can be transferred to an address')
    .action(async (mint: string, to: string) => {
      await pnftCanTransfer(mint, to)
    })

  cli
    .command('sbt:create', 'Create a soulbound token')
    .option('--name <name>', 'Token name')
    .option('--symbol <symbol>', 'Token symbol')
    .option('--uri <uri>', 'Metadata URI')
    .option('--recovery-authority <address>', 'Recovery authority')
    .action(async (options: any) => {
      await sbtCreate(options)
    })

  cli
    .command('sbt:recover <mint> <newOwner>', 'Recover a soulbound token to a new owner')
    .action(async (mint: string, newOwner: string) => {
      await sbtRecover(mint, newOwner)
    })
}
