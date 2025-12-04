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
// Token Commands
// ============================================

cli
  .command('create', 'Create a new fungible token')
  .option('--name <name>', 'Token name')
  .option('--symbol <symbol>', 'Token symbol')
  .option('--decimals <decimals>', 'Decimal places', '9')
  .option('--supply <supply>', 'Initial supply')
  .action(async (options: { name?: string; symbol?: string; decimals?: string; supply?: string }) => {
    if (!options.name || !options.symbol) {
      console.error('Error: --name and --symbol are required')
      process.exit(1)
    }

    const config = await getConfig()
    const { createToken } = await import('../src/token/create')

    try {
      console.log('Creating token...')
      const result = await createToken({
        name: options.name,
        symbol: options.symbol,
        decimals: parseInt(options.decimals || '9'),
        initialSupply: options.supply ? BigInt(options.supply) : undefined,
      }, config)

      console.log('\n✓ Token created successfully!')
      console.log(`  Mint: ${result.mint}`)
      console.log(`  Signature: ${result.signature}`)
      if (result.metadataAddress) {
        console.log(`  Metadata: ${result.metadataAddress}`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('mint <mint> <amount>', 'Mint tokens')
  .option('--to <address>', 'Recipient address')
  .action(async (mint: string, amount: string, options: { to?: string }) => {
    const config = await getConfig()
    const { mintTokens } = await import('../src/token/mint')

    try {
      console.log(`Minting ${amount} tokens...`)
      const result = await mintTokens({
        mint,
        amount: BigInt(amount),
        destination: options.to,
      }, config)

      console.log('\n✓ Tokens minted successfully!')
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('transfer <mint> <amount> <to>', 'Transfer tokens')
  .action(async (mint: string, amount: string, to: string) => {
    const config = await getConfig()
    const { transfer } = await import('../src/token/transfer')

    try {
      console.log(`Transferring ${amount} tokens to ${to}...`)
      const result = await transfer(mint, to, BigInt(amount), config)

      console.log('\n✓ Transfer successful!')
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('burn <mint> <amount>', 'Burn tokens')
  .action(async (mint: string, amount: string) => {
    const config = await getConfig()
    const { burn } = await import('../src/token/burn')

    try {
      console.log(`Burning ${amount} tokens...`)
      const result = await burn(mint, BigInt(amount), config)

      console.log('\n✓ Tokens burned successfully!')
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('info <mint>', 'Show token information')
  .action(async (mint: string) => {
    const config = await getConfig()
    const { getMintInfo } = await import('../src/drivers/solana/account')

    try {
      const info = await getMintInfo(mint, config)
      console.log('Token Information:')
      console.log(`  Mint: ${mint}`)
      console.log(`  Supply: ${info.supply}`)
      console.log(`  Decimals: ${info.decimals}`)
      console.log(`  Mint Authority: ${info.mintAuthority || 'None (fixed supply)'}`)
      console.log(`  Freeze Authority: ${info.freezeAuthority || 'None'}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('balance <mint>', 'Show token balance')
  .action(async (mint: string) => {
    const config = await getConfig()
    const { getTokenBalance } = await import('../src/drivers/solana/account')
    const { getPublicKey } = await import('../src/drivers/solana/wallet')

    try {
      const owner = getPublicKey(config)
      const balance = await getTokenBalance(owner, mint, config)
      console.log(`Token: ${mint}`)
      console.log(`Balance: ${balance}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// NFT Commands
// ============================================

cli
  .command('nft:create', 'Create a single NFT')
  .option('--name <name>', 'NFT name')
  .option('--uri <uri>', 'Metadata URI')
  .option('--collection <address>', 'Collection address')
  .option('--royalty <bps>', 'Royalty in basis points (e.g., 500 = 5%)')
  .action(async (options: { name?: string; uri?: string; collection?: string; royalty?: string }) => {
    if (!options.name || !options.uri) {
      console.error('Error: --name and --uri are required')
      process.exit(1)
    }

    const config = await getConfig()
    const { createNFT } = await import('../src/nft/create')

    try {
      console.log('Creating NFT...')
      const result = await createNFT({
        name: options.name,
        uri: options.uri,
        collection: options.collection,
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : 0,
      }, config)

      console.log('\n✓ NFT created successfully!')
      console.log(`  Mint: ${result.mint}`)
      console.log(`  Metadata: ${result.metadata}`)
      console.log(`  Master Edition: ${result.masterEdition}`)
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:transfer <mint> <to>', 'Transfer an NFT')
  .action(async (mint: string, to: string) => {
    const config = await getConfig()
    const { transferNFT } = await import('../src/nft/transfer')

    try {
      console.log(`Transferring NFT ${mint} to ${to}...`)
      const result = await transferNFT(mint, to, config)

      console.log('\n✓ NFT transferred successfully!')
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:burn <mint>', 'Burn an NFT')
  .action(async (mint: string) => {
    const config = await getConfig()
    const { burnNFT } = await import('../src/nft/burn')

    try {
      console.log(`Burning NFT ${mint}...`)
      const result = await burnNFT(mint, config)

      console.log('\n✓ NFT burned successfully!')
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:info <mint>', 'Show NFT information')
  .action(async (mint: string) => {
    const config = await getConfig()
    const { getNFTMetadata, fetchOffChainMetadata } = await import('../src/nft/metadata')

    try {
      const metadata = await getNFTMetadata(mint, config)
      if (!metadata) {
        console.error('NFT not found')
        process.exit(1)
      }

      console.log('NFT Information:')
      console.log(`  Mint: ${mint}`)
      console.log(`  Name: ${metadata.name}`)
      console.log(`  Symbol: ${metadata.symbol}`)
      console.log(`  URI: ${metadata.uri}`)
      console.log(`  Royalty: ${metadata.sellerFeeBasisPoints / 100}%`)
      console.log(`  Mutable: ${metadata.isMutable}`)
      console.log(`  Update Authority: ${metadata.updateAuthority}`)

      if (metadata.creators && metadata.creators.length > 0) {
        console.log('  Creators:')
        for (const creator of metadata.creators) {
          console.log(`    - ${creator.address} (${creator.share}%)${creator.verified ? ' ✓' : ''}`)
        }
      }

      // Fetch off-chain metadata
      const offChain = await fetchOffChainMetadata(metadata.uri)
      if (offChain) {
        console.log('\nOff-chain Metadata:')
        console.log(`  Description: ${(offChain as any).description || 'N/A'}`)
        console.log(`  Image: ${(offChain as any).image || 'N/A'}`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('collection:create', 'Create an NFT collection')
  .option('--name <name>', 'Collection name')
  .option('--symbol <symbol>', 'Collection symbol')
  .option('--uri <uri>', 'Metadata URI')
  .action(async (options: { name?: string; symbol?: string; uri?: string }) => {
    if (!options.name || !options.uri) {
      console.error('Error: --name and --uri are required')
      process.exit(1)
    }

    const config = await getConfig()
    const { createCollection } = await import('../src/nft/create')

    try {
      console.log('Creating collection...')
      const result = await createCollection({
        name: options.name,
        symbol: options.symbol,
        uri: options.uri,
      }, config)

      console.log('\n✓ Collection created successfully!')
      console.log(`  Mint: ${result.mint}`)
      console.log(`  Metadata: ${result.metadata}`)
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:list [owner]', 'List NFTs owned by address')
  .action(async (owner?: string) => {
    const config = await getConfig()
    const { getNFTsByOwner } = await import('../src/nft/query')
    const { getPublicKey } = await import('../src/drivers/solana/wallet')

    try {
      const address = owner || getPublicKey(config)
      console.log(`Fetching NFTs for ${address}...`)

      const nfts = await getNFTsByOwner(address, config)

      if (nfts.length === 0) {
        console.log('No NFTs found')
        return
      }

      console.log(`\nFound ${nfts.length} NFT(s):\n`)
      for (const nft of nfts) {
        console.log(`  ${nft.name}`)
        console.log(`    Mint: ${nft.mint}`)
        console.log(`    Symbol: ${nft.symbol}`)
        console.log('')
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
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
