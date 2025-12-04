import { CLI } from '@stacksjs/clapp'
import { version } from '../package.json'
import { getConfig, setConfig } from '../src/config'
import type { SolanaNetwork } from '../src/types'

const cli = new CLI('tokens', {
  description: 'A CLI for managing fungible and non-fungible tokens on Solana',
})

// ============================================
// Configuration Commands
// ============================================

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

// ============================================
// Wallet Commands
// ============================================

cli
  .command('wallet:generate', 'Generate a new keypair')
  .option('--output <path>', 'Output path for keypair file')
  .action(async (options: { output?: string }) => {
    const { generateKeypair, saveKeypair } = await import('../src/drivers/solana/wallet')
    const keypair = generateKeypair()
    console.log(`Generated new keypair:`)
    console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)

    if (options.output) {
      saveKeypair(keypair, options.output)
      console.log(`  Saved to: ${options.output}`)
    } else {
      console.log(`\nTo save this keypair, use --output <path>`)
    }
  })

cli
  .command('wallet:show', 'Show current wallet address')
  .action(async () => {
    const config = await getConfig()
    const { getPublicKey } = await import('../src/drivers/solana/wallet')
    try {
      const pubkey = getPublicKey(config)
      console.log(`Wallet: ${pubkey}`)
    } catch (error) {
      console.error('No wallet configured. Run `tokens wallet:generate` or set wallet.keypairPath in config.')
    }
  })

cli
  .command('wallet:balance', 'Show wallet balance')
  .action(async () => {
    const config = await getConfig()
    const { createSolanaConnection } = await import('../src/drivers/solana/connection')
    const { getPublicKey } = await import('../src/drivers/solana/wallet')
    const { lamportsToSol } = await import('../src/utils')

    try {
      const pubkey = getPublicKey(config)
      const connection = createSolanaConnection(config)
      const balance = await connection.getBalance(pubkey)
      console.log(`Wallet: ${pubkey}`)
      console.log(`Balance: ${lamportsToSol(balance)} SOL`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
    }
  })

cli
  .command('wallet:airdrop [amount]', 'Request devnet/testnet airdrop')
  .action(async (amount?: string) => {
    const config = await getConfig()

    if (config.network === 'mainnet-beta') {
      console.error('Airdrop is not available on mainnet')
      process.exit(1)
    }

    const { createSolanaConnection } = await import('../src/drivers/solana/connection')
    const { getPublicKey } = await import('../src/drivers/solana/wallet')
    const { solToLamports, lamportsToSol } = await import('../src/utils')

    try {
      const pubkey = getPublicKey(config)
      const connection = createSolanaConnection(config)
      const lamports = solToLamports(Number(amount) || 1)

      console.log(`Requesting airdrop of ${amount || 1} SOL to ${pubkey}...`)
      const signature = await connection.requestAirdrop(pubkey, Number(lamports))
      console.log(`Airdrop successful!`)
      console.log(`Signature: ${signature}`)

      const balance = await connection.getBalance(pubkey)
      console.log(`New balance: ${lamportsToSol(balance)} SOL`)
    } catch (error) {
      console.error('Airdrop failed:', error instanceof Error ? error.message : error)
    }
  })

// ============================================
// Token Commands (Placeholders)
// ============================================

cli
  .command('create', 'Create a new fungible token')
  .option('--name <name>', 'Token name')
  .option('--symbol <symbol>', 'Token symbol')
  .option('--decimals <decimals>', 'Decimal places', '9')
  .option('--supply <supply>', 'Initial supply')
  .action(async (options: { name?: string; symbol?: string; decimals?: string; supply?: string }) => {
    console.log('Creating token...')
    console.log('Options:', options)
    console.log('\n[Token creation not yet implemented]')
  })

cli
  .command('mint <mint> <amount>', 'Mint tokens')
  .option('--to <address>', 'Recipient address')
  .action(async (mint: string, amount: string, options: { to?: string }) => {
    console.log(`Minting ${amount} tokens from ${mint}...`)
    console.log('Options:', options)
    console.log('\n[Token minting not yet implemented]')
  })

cli
  .command('transfer <mint> <amount> <to>', 'Transfer tokens')
  .action(async (mint: string, amount: string, to: string) => {
    console.log(`Transferring ${amount} tokens of ${mint} to ${to}...`)
    console.log('\n[Token transfer not yet implemented]')
  })

cli
  .command('burn <mint> <amount>', 'Burn tokens')
  .action(async (mint: string, amount: string) => {
    console.log(`Burning ${amount} tokens of ${mint}...`)
    console.log('\n[Token burning not yet implemented]')
  })

cli
  .command('info <mint>', 'Show token information')
  .action(async (mint: string) => {
    console.log(`Fetching info for ${mint}...`)
    console.log('\n[Token info not yet implemented]')
  })

cli
  .command('balance <mint>', 'Show token balance')
  .action(async (mint: string) => {
    console.log(`Fetching balance for ${mint}...`)
    console.log('\n[Token balance not yet implemented]')
  })

// ============================================
// NFT Commands (Placeholders)
// ============================================

cli
  .command('nft:create', 'Create a single NFT')
  .option('--name <name>', 'NFT name')
  .option('--uri <uri>', 'Metadata URI')
  .option('--collection <address>', 'Collection address')
  .action(async (options: { name?: string; uri?: string; collection?: string }) => {
    console.log('Creating NFT...')
    console.log('Options:', options)
    console.log('\n[NFT creation not yet implemented]')
  })

cli
  .command('collection:create', 'Create an NFT collection')
  .option('--name <name>', 'Collection name')
  .option('--symbol <symbol>', 'Collection symbol')
  .option('--uri <uri>', 'Metadata URI')
  .action(async (options: { name?: string; symbol?: string; uri?: string }) => {
    console.log('Creating collection...')
    console.log('Options:', options)
    console.log('\n[Collection creation not yet implemented]')
  })

// ============================================
// Version & Help
// ============================================

cli.command('version', 'Show the version of the CLI').action(() => {
  console.log(`ts-tokens v${version}`)
})

cli.version(version)
cli.help()
cli.parse()
