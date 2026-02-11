import { getConfig, setConfig } from '../../src/config'
import type { SolanaNetwork } from '../../src/types'

export function register(cli: any): void {
  cli
    .command('config:init', 'Initialize configuration file')
    .option('--network <network>', 'Network to use (mainnet-beta, devnet, testnet, localnet)', 'devnet')
    .action(async (options: { network?: string }) => {
      console.log('Initializing tokens configuration...')
      console.log(`Network: ${options.network || 'devnet'}`)
      console.log('\nCreate a tokens.config.ts file in your project root.')
      console.log('See https://ts-tokens.dev/config for all options.')
    })

  cli
    .command('config:show', 'Display current configuration')
    .action(async () => {
      const config = await getConfig()
      console.log('Current configuration:')
      console.log(JSON.stringify(config, null, 2))
    })

  cli
    .command('config:network <network>', 'Switch network')
    .action(async (network: string) => {
      const validNetworks = ['mainnet-beta', 'devnet', 'testnet', 'localnet']
      if (!validNetworks.includes(network)) {
        console.error(`Invalid network: ${network}`)
        console.error(`Valid networks: ${validNetworks.join(', ')}`)
        process.exit(1)
      }
      setConfig({ network: network as SolanaNetwork })
      console.log(`Switched to ${network}`)
    })

  cli
    .command('config:set <key> <value>', 'Set a config value')
    .action(async (key: string, value: string) => {
      try {
        const updates: Record<string, any> = {}
        // Handle nested keys like "wallet.keypairPath"
        const keys = key.split('.')
        if (keys.length === 1) {
          // Handle booleans and numbers
          if (value === 'true') updates[key] = true
          else if (value === 'false') updates[key] = false
          else if (!isNaN(Number(value))) updates[key] = Number(value)
          else updates[key] = value
        } else {
          let obj: Record<string, any> = updates
          for (let i = 0; i < keys.length - 1; i++) {
            obj[keys[i]] = {}
            obj = obj[keys[i]]
          }
          obj[keys[keys.length - 1]] = value
        }
        setConfig(updates)
        console.log(`\u2713 Set ${key} = ${value}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('config:get <key>', 'Get a config value')
    .action(async (key: string) => {
      try {
        const config = await getConfig()
        const keys = key.split('.')
        let value: any = config
        for (const k of keys) {
          value = value?.[k as keyof typeof value]
        }
        if (value === undefined) {
          console.log(`${key}: (not set)`)
        } else {
          console.log(`${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
