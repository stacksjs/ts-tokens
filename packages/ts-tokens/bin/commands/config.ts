import { configInit, configShow, configNetwork, configSet, configGet } from '../../src/cli/commands/config'

export function register(cli: any): void {
  cli
    .command('config:init', 'Initialize configuration file')
    .option('--network <network>', 'Network to use (mainnet-beta, devnet, testnet, localnet)', 'devnet')
    .action(async (options: { network?: string }) => {
      await configInit(options)
    })

  cli
    .command('config:show', 'Display current configuration')
    .action(async () => {
      await configShow()
    })

  cli
    .command('config:network <network>', 'Switch network')
    .action(async (network: string) => {
      await configNetwork(network)
    })

  cli
    .command('config:set <key> <value>', 'Set a config value')
    .action(async (key: string, value: string) => {
      await configSet(key, value)
    })

  cli
    .command('config:get <key>', 'Get a config value')
    .action(async (key: string) => {
      await configGet(key)
    })
}
