import { configInit, configShow, configNetwork, configSet, configGet } from '../../src/cli/commands/config'

export function register(cli: any): void {
  cli
    .command('config:init', 'Initialize configuration file')
    .option('--network <network>', 'Network to use (mainnet-beta, devnet, testnet, localnet)', { default: 'devnet' })
    .action(async (options: { network?: string }) => {
      await configInit(options)
    })

  cli
    .command('config:show', 'Display current configuration')
    .action(async () => {
      await configShow()
    })

  cli
    .command('config:network <network>', 'Switch network (writes project config by default)')
    .option('--global', 'Write the user-level config instead (applies to all projects)')
    .action(async (network: string, options: { global?: boolean }) => {
      await configNetwork(network, options)
    })

  cli
    .command('config:set <key> <value>', 'Set a config value (writes project config by default)')
    .option('--global', 'Write the user-level config instead (applies to all projects)')
    .action(async (key: string, value: string, options: { global?: boolean }) => {
      await configSet(key, value, options)
    })

  cli
    .command('config:get <key>', 'Get a config value')
    .action(async (key: string) => {
      await configGet(key)
    })
}
