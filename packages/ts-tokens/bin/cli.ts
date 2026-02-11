import { CLI } from '@stacksjs/clapp'
import { version } from '../package.json'
import { getConfig, setConfig } from '../src/config'
import type { SolanaNetwork } from '../src/types'

const cli = new (CLI as any)('tokens', {
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
    } catch {
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
  .option('--metadata-uri <uri>', 'Metadata URI')
  .action(async (options: { name?: string; symbol?: string; decimals?: string; supply?: string; metadataUri?: string }) => {
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
        uri: options.metadataUri,
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
    const { createConnection } = await import('../src/drivers/solana/connection')

    try {
      const connection = createConnection(config)
      const info = await getMintInfo(connection, mint)
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
    const { createConnection } = await import('../src/drivers/solana/connection')

    try {
      const connection = createConnection(config)
      const owner = getPublicKey(config)
      const balance = await getTokenBalance(connection, owner, mint)
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
  .option('--symbol <symbol>', 'NFT symbol')
  .option('--uri <uri>', 'Metadata URI')
  .option('--collection <address>', 'Collection address')
  .option('--royalty <bps>', 'Royalty in basis points (e.g., 500 = 5%)')
  .action(async (options: { name?: string; symbol?: string; uri?: string; collection?: string; royalty?: string }) => {
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
        symbol: options.symbol || '',
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
  .option('--royalty <bps>', 'Royalty in basis points (e.g., 500 = 5%)')
  .action(async (options: { name?: string; symbol?: string; uri?: string; royalty?: string }) => {
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
        symbol: options.symbol || '',
        uri: options.uri,
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : undefined,
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
// Configuration Commands (additional)
// ============================================

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
      console.log(`✓ Set ${key} = ${value}`)
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

// ============================================
// Wallet Commands (additional)
// ============================================

cli
  .command('wallet:import <path>', 'Import keypair from file')
  .action(async (keypairPath: string) => {
    try {
      const { loadKeypairFromFile } = await import('../src/drivers/solana/wallet')
      const keypair = loadKeypairFromFile(keypairPath)
      setConfig({ wallet: { keypairPath } })
      console.log(`✓ Imported keypair from ${keypairPath}`)
      console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Token Commands (additional)
// ============================================

cli
  .command('holders <mint>', 'List token holders')
  .option('--limit <limit>', 'Maximum number of holders to show', '20')
  .action(async (mint: string, options: { limit?: string }) => {
    const config = await getConfig()
    const { getTokenHolders } = await import('../src/token/query')

    try {
      const limit = parseInt(options.limit || '20')
      console.log(`Fetching holders for ${mint}...`)
      const holders = await getTokenHolders(mint, config, { limit })

      if (holders.length === 0) {
        console.log('No holders found')
        return
      }

      console.log(`\nFound ${holders.length} holder(s):\n`)
      console.log('  Owner                                             Balance          %')
      console.log('  ' + '-'.repeat(75))
      for (const holder of holders) {
        const ownerDisplay = holder.owner.length > 44
          ? holder.owner.slice(0, 20) + '...' + holder.owner.slice(-20)
          : holder.owner.padEnd(44)
        console.log(`  ${ownerDisplay}  ${holder.balance.toString().padStart(15)}  ${holder.percentage.toFixed(2).padStart(6)}%`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('authority <mint>', 'Manage token authorities')
  .option('--revoke-mint', 'Revoke mint authority')
  .option('--revoke-freeze', 'Revoke freeze authority')
  .option('--transfer-mint <address>', 'Transfer mint authority to address')
  .option('--transfer-freeze <address>', 'Transfer freeze authority to address')
  .action(async (mint: string, options: {
    revokeMint?: boolean
    revokeFreeze?: boolean
    transferMint?: string
    transferFreeze?: string
  }) => {
    const config = await getConfig()

    try {
      // If no flags, show current authorities
      if (!options.revokeMint && !options.revokeFreeze && !options.transferMint && !options.transferFreeze) {
        const { getMintInfo } = await import('../src/drivers/solana/account')
        const { createConnection } = await import('../src/drivers/solana/connection')

        const connection = createConnection(config)
        const info = await getMintInfo(connection, mint)
        console.log('Token Authorities:')
        console.log(`  Mint: ${mint}`)
        console.log(`  Mint Authority: ${info.mintAuthority || 'None (revoked)'}`)
        console.log(`  Freeze Authority: ${info.freezeAuthority || 'None (revoked)'}`)
        return
      }

      if (options.revokeMint) {
        const { revokeMintAuthority } = await import('../src/token/authority')
        console.log('Revoking mint authority...')
        const result = await revokeMintAuthority(mint, config)
        console.log(`✓ Mint authority revoked! Signature: ${result.signature}`)
      }

      if (options.revokeFreeze) {
        const { revokeFreezeAuthority } = await import('../src/token/authority')
        console.log('Revoking freeze authority...')
        const result = await revokeFreezeAuthority(mint, config)
        console.log(`✓ Freeze authority revoked! Signature: ${result.signature}`)
      }

      if (options.transferMint) {
        const { setMintAuthority } = await import('../src/token/authority')
        console.log(`Transferring mint authority to ${options.transferMint}...`)
        const result = await setMintAuthority(mint, options.transferMint, config)
        console.log(`✓ Mint authority transferred! Signature: ${result.signature}`)
      }

      if (options.transferFreeze) {
        const { setFreezeAuthority } = await import('../src/token/authority')
        console.log(`Transferring freeze authority to ${options.transferFreeze}...`)
        const result = await setFreezeAuthority(mint, options.transferFreeze, config)
        console.log(`✓ Freeze authority transferred! Signature: ${result.signature}`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// NFT Commands (additional)
// ============================================

cli
  .command('nft:mint <uri>', 'Mint an NFT from metadata URI')
  .option('--name <name>', 'NFT name')
  .option('--symbol <symbol>', 'NFT symbol')
  .option('--royalty <bps>', 'Royalty in basis points')
  .option('--collection <address>', 'Collection address')
  .action(async (uri: string, options: { name?: string; symbol?: string; royalty?: string; collection?: string }) => {
    const config = await getConfig()
    const { createNFT } = await import('../src/nft/create')

    try {
      console.log('Minting NFT...')
      const result = await createNFT({
        name: options.name || 'NFT',
        symbol: options.symbol || '',
        uri,
        collection: options.collection,
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : 0,
      }, config)

      console.log('\n✓ NFT minted successfully!')
      console.log(`  Mint: ${result.mint}`)
      console.log(`  Metadata: ${result.metadata}`)
      console.log(`  Master Edition: ${result.masterEdition}`)
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Collection Commands (additional)
// ============================================

cli
  .command('collection:info <address>', 'Show collection information')
  .action(async (address: string) => {
    const config = await getConfig()
    const { getCollectionInfo } = await import('../src/nft/query')

    try {
      console.log(`Fetching collection info for ${address}...`)
      const info = await getCollectionInfo(address, config)

      console.log('\nCollection Information:')
      console.log(`  Address: ${address}`)
      console.log(`  Size: ${info.size} items`)
      if (info.metadata) {
        console.log(`  Name: ${info.metadata.name}`)
        console.log(`  Symbol: ${info.metadata.symbol}`)
        console.log(`  URI: ${info.metadata.uri}`)
        console.log(`  Royalty: ${info.metadata.sellerFeeBasisPoints / 100}%`)
        console.log(`  Update Authority: ${info.metadata.updateAuthority}`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('collection:items <address>', 'List NFTs in a collection')
  .option('--limit <limit>', 'Maximum items to list', '50')
  .action(async (address: string, options: { limit?: string }) => {
    const config = await getConfig()
    const { getNFTsByCollection } = await import('../src/nft/query')

    try {
      const limit = parseInt(options.limit || '50')
      console.log(`Fetching NFTs in collection ${address}...`)
      const nfts = await getNFTsByCollection(address, config, limit)

      if (nfts.length === 0) {
        console.log('No NFTs found in collection')
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

cli
  .command('collection:verify <collection> <nft>', 'Verify an NFT belongs to a collection')
  .action(async (collection: string, nft: string) => {
    const config = await getConfig()
    const { setAndVerifyCollection } = await import('../src/nft/metadata')

    try {
      console.log(`Verifying NFT ${nft} in collection ${collection}...`)
      const result = await setAndVerifyCollection(nft, collection, config)
      console.log(`\n✓ NFT verified in collection!`)
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('collection:update <address>', 'Update collection metadata')
  .option('--name <name>', 'New collection name')
  .option('--symbol <symbol>', 'New symbol')
  .option('--uri <uri>', 'New metadata URI')
  .action(async (address: string, options: { name?: string; symbol?: string; uri?: string }) => {
    const config = await getConfig()
    const { updateNFTMetadata } = await import('../src/nft/metadata')

    try {
      console.log(`Updating collection ${address}...`)
      const result = await updateNFTMetadata(address, {
        name: options.name,
        symbol: options.symbol,
        uri: options.uri,
      }, config)

      console.log(`\n✓ Collection updated!`)
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Candy Machine Commands
// ============================================

cli
  .command('candy:create', 'Create a Candy Machine')
  .option('--items <n>', 'Number of items available')
  .option('--symbol <symbol>', 'Collection symbol')
  .option('--royalty <bps>', 'Royalty in basis points')
  .option('--collection <address>', 'Collection NFT address')
  .action(async (options: { items?: string; symbol?: string; royalty?: string; collection?: string }) => {
    if (!options.collection || !options.items) {
      console.error('Error: --collection and --items are required')
      process.exit(1)
    }

    const config = await getConfig()
    const { createCandyMachine } = await import('../src/nft/candy-machine/create')

    try {
      console.log('Creating Candy Machine...')
      const result = await createCandyMachine({
        itemsAvailable: parseInt(options.items),
        symbol: options.symbol || '',
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : 0,
        maxEditionSupply: 0,
        isMutable: true,
        creators: [],
        collection: options.collection,
        configLineSettings: {
          prefixName: '',
          nameLength: 32,
          prefixUri: '',
          uriLength: 200,
          isSequential: false,
        },
      }, config)

      console.log('\n✓ Candy Machine created!')
      console.log(`  Address: ${result.candyMachine}`)
      console.log(`  Collection: ${result.collection}`)
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('candy:add <candy-machine> <items-file>', 'Add config lines from JSON file')
  .action(async (candyMachine: string, itemsFile: string) => {
    const config = await getConfig()
    const { addConfigLines } = await import('../src/nft/candy-machine/create')
    const fs = await import('node:fs')

    try {
      const content = fs.readFileSync(itemsFile, 'utf-8')
      const items: Array<{ name: string; uri: string }> = JSON.parse(content)

      console.log(`Adding ${items.length} config lines to ${candyMachine}...`)
      const result = await addConfigLines(candyMachine, 0, items, config)

      console.log(`\n✓ Config lines added!`)
      console.log(`  Signature: ${result.signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('candy:mint <candy-machine>', 'Mint from Candy Machine')
  .option('--count <n>', 'Number to mint', '1')
  .action(async (candyMachine: string, options: { count?: string }) => {
    const config = await getConfig()
    const { mintFromCandyMachine } = await import('../src/nft/candy-machine/create')

    try {
      const count = parseInt(options.count || '1')
      for (let i = 0; i < count; i++) {
        console.log(`Minting NFT ${i + 1}/${count}...`)
        const result = await mintFromCandyMachine(candyMachine, config)

        console.log(`  ✓ Minted! Mint: ${result.mint}`)
        console.log(`    Signature: ${result.signature}`)
      }
      console.log('\n✓ All mints complete!')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('candy:info <candy-machine>', 'Show Candy Machine information')
  .action(async (candyMachine: string) => {
    const config = await getConfig()
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const connection = createConnection(config)
      const pubkey = new PublicKey(candyMachine)
      const accountInfo = await connection.getAccountInfo(pubkey)

      if (!accountInfo) {
        console.error('Candy Machine not found')
        process.exit(1)
      }

      console.log('Candy Machine Information:')
      console.log(`  Address: ${candyMachine}`)
      console.log(`  Owner: ${accountInfo.owner.toBase58()}`)
      console.log(`  Data Size: ${accountInfo.data.length} bytes`)
      console.log(`  Lamports: ${accountInfo.lamports}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('candy:withdraw <candy-machine>', 'Withdraw funds from Candy Machine')
  .action(async (candyMachine: string) => {
    const config = await getConfig()
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { loadWallet } = await import('../src/drivers/solana/wallet')
    const { lamportsToSol } = await import('../src/utils')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const connection = createConnection(config)
      const payer = loadWallet(config)
      const pubkey = new PublicKey(candyMachine)
      const accountInfo = await connection.getAccountInfo(pubkey)

      if (!accountInfo) {
        console.error('Candy Machine not found')
        process.exit(1)
      }

      console.log(`Candy Machine: ${candyMachine}`)
      console.log(`Balance: ${lamportsToSol(accountInfo.lamports)} SOL`)
      console.log(`Owner: ${payer.publicKey.toBase58()}`)
      console.log('\nNote: Full withdrawal requires closing the Candy Machine account on-chain.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('candy:delete <candy-machine>', 'Delete Candy Machine and reclaim rent')
  .action(async (candyMachine: string) => {
    const config = await getConfig()
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { lamportsToSol } = await import('../src/utils')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const connection = createConnection(config)
      const pubkey = new PublicKey(candyMachine)
      const accountInfo = await connection.getAccountInfo(pubkey)

      if (!accountInfo) {
        console.error('Candy Machine not found')
        process.exit(1)
      }

      console.log(`Candy Machine: ${candyMachine}`)
      console.log(`Rent to reclaim: ${lamportsToSol(accountInfo.lamports)} SOL`)
      console.log('\nNote: Deletion requires sending a close instruction to the Candy Machine program.')
      console.log('This will reclaim the rent and close the account permanently.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('candy:upload <path>', 'Upload assets and create config lines')
  .option('--storage <provider>', 'Storage provider (arweave/ipfs/shadow)', 'arweave')
  .action(async (assetsPath: string, options: { storage?: string }) => {
    const config = await getConfig()
    const fs = await import('node:fs')
    const path = await import('node:path')

    try {
      const resolved = path.resolve(assetsPath)
      if (!fs.existsSync(resolved)) {
        console.error(`Path not found: ${resolved}`)
        process.exit(1)
      }

      const stats = fs.statSync(resolved)
      if (stats.isDirectory()) {
        const files = fs.readdirSync(resolved)
        console.log(`Found ${files.length} files in ${resolved}`)
        console.log(`Storage provider: ${options.storage || 'arweave'}`)
        console.log('\nFiles to upload:')
        for (const file of files.slice(0, 10)) {
          console.log(`  ${file}`)
        }
        if (files.length > 10) {
          console.log(`  ... and ${files.length - 10} more`)
        }
      } else {
        console.log(`File: ${resolved}`)
        console.log(`Size: ${stats.size} bytes`)
        console.log(`Storage provider: ${options.storage || 'arweave'}`)
      }

      console.log('\nNote: Upload requires a funded storage provider account.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('candy:guards <candy-machine>', 'Show Candy Machine guards')
  .action(async (candyMachine: string) => {
    const config = await getConfig()
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const connection = createConnection(config)
      const pubkey = new PublicKey(candyMachine)
      const accountInfo = await connection.getAccountInfo(pubkey)

      if (!accountInfo) {
        console.error('Candy Machine not found')
        process.exit(1)
      }

      console.log('Candy Machine Guards:')
      console.log(`  Address: ${candyMachine}`)
      console.log(`  Data Size: ${accountInfo.data.length} bytes`)
      console.log('\nNote: Guard parsing requires decoding the Candy Guard account data.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Storage Commands
// ============================================

cli
  .command('upload <path>', 'Upload file to storage')
  .option('--provider <provider>', 'Storage provider (arweave/ipfs/shadow)', 'arweave')
  .option('--type <type>', 'Content type (image/json/etc)')
  .action(async (filePath: string, options: { provider?: string; type?: string }) => {
    const config = await getConfig()
    const fs = await import('node:fs')
    const pathModule = await import('node:path')

    try {
      const resolved = pathModule.resolve(filePath)
      if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${resolved}`)
        process.exit(1)
      }

      const provider = options.provider || config.storageProvider || 'arweave'
      const stats = fs.statSync(resolved)

      console.log(`Uploading ${pathModule.basename(resolved)}...`)
      console.log(`  Provider: ${provider}`)
      console.log(`  Size: ${stats.size} bytes`)
      if (options.type) {
        console.log(`  Type: ${options.type}`)
      }

      const { getStorageAdapter } = await import('../src/storage')
      const adapter = getStorageAdapter(provider as any, config)
      const result = await adapter.uploadFile(resolved, {
        contentType: options.type,
      })

      console.log(`\n✓ Upload complete!`)
      console.log(`  URL: ${result.url}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('upload-assets <directory>', 'Bulk upload assets')
  .option('--provider <provider>', 'Storage provider', 'arweave')
  .option('--output <path>', 'Output manifest path')
  .action(async (directory: string, options: { provider?: string; output?: string }) => {
    const config = await getConfig()
    const fs = await import('node:fs')
    const pathModule = await import('node:path')

    try {
      const resolved = pathModule.resolve(directory)
      if (!fs.existsSync(resolved)) {
        console.error(`Directory not found: ${resolved}`)
        process.exit(1)
      }

      const files = fs.readdirSync(resolved)
        .filter((f: string) => !f.startsWith('.'))
        .map((f: string) => ({
          path: pathModule.join(resolved, f),
          name: f,
        }))

      console.log(`Uploading ${files.length} files from ${resolved}...`)
      console.log(`  Provider: ${options.provider || 'arweave'}`)

      const { getStorageAdapter } = await import('../src/storage')
      const adapter = getStorageAdapter((options.provider || 'arweave') as any, config)
      const result = await adapter.uploadBatch(files)

      console.log(`\n✓ Upload complete!`)
      console.log(`  Files uploaded: ${result.results.length}`)
      if (result.failed.length > 0) {
        console.log(`  Failed: ${result.failed.length}`)
        for (const f of result.failed) {
          console.log(`    - ${f.file}: ${f.error}`)
        }
      }

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2))
        console.log(`  Manifest saved to: ${options.output}`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('upload-metadata <path>', 'Upload metadata JSON')
  .option('--provider <provider>', 'Storage provider', 'arweave')
  .action(async (filePath: string, options: { provider?: string }) => {
    const config = await getConfig()
    const fs = await import('node:fs')
    const pathModule = await import('node:path')

    try {
      const resolved = pathModule.resolve(filePath)
      if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${resolved}`)
        process.exit(1)
      }

      const content = fs.readFileSync(resolved, 'utf-8')
      // Validate JSON
      JSON.parse(content)

      const provider = options.provider || config.storageProvider || 'arweave'
      console.log(`Uploading metadata from ${pathModule.basename(resolved)}...`)
      console.log(`  Provider: ${provider}`)

      const { getStorageAdapter } = await import('../src/storage')
      const adapter = getStorageAdapter(provider as any, config)
      const result = await adapter.upload(content, {
        contentType: 'application/json',
      })

      console.log(`\n✓ Metadata uploaded!`)
      console.log(`  URL: ${result.url}`)
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Error: Invalid JSON file')
      } else {
        console.error('Error:', error instanceof Error ? error.message : error)
      }
      process.exit(1)
    }
  })

cli
  .command('storage:balance', 'Check storage balance')
  .option('--provider <provider>', 'Storage provider', 'arweave')
  .action(async (options: { provider?: string }) => {
    const config = await getConfig()
    const { getPublicKey } = await import('../src/drivers/solana/wallet')

    try {
      const provider = options.provider || config.storageProvider || 'arweave'
      const wallet = getPublicKey(config)

      console.log(`Storage Balance:`)
      console.log(`  Provider: ${provider}`)
      console.log(`  Wallet: ${wallet}`)
      console.log('\nNote: Balance checking depends on the specific storage provider.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('storage:fund <amount>', 'Fund storage account')
  .option('--provider <provider>', 'Storage provider', 'arweave')
  .action(async (amount: string, options: { provider?: string }) => {
    const config = await getConfig()
    const { getPublicKey } = await import('../src/drivers/solana/wallet')

    try {
      const provider = options.provider || config.storageProvider || 'arweave'
      const wallet = getPublicKey(config)

      console.log(`Fund Storage Account:`)
      console.log(`  Provider: ${provider}`)
      console.log(`  Amount: ${amount}`)
      console.log(`  Wallet: ${wallet}`)
      console.log('\nNote: Funding requires a transaction to the storage provider.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Utility Commands
// ============================================

cli
  .command('airdrop <mint> <recipients-file>', 'Airdrop tokens to recipients')
  .option('--amount <amount>', 'Amount per recipient (for fungible tokens)')
  .option('--delay <ms>', 'Delay between transactions in ms', '500')
  .action(async (mint: string, recipientsFile: string, options: { amount?: string; delay?: string }) => {
    const config = await getConfig()
    const { transfer } = await import('../src/token/transfer')
    const fs = await import('node:fs')

    try {
      const content = fs.readFileSync(recipientsFile, 'utf-8')
      const recipients: string[] = JSON.parse(content)

      if (!Array.isArray(recipients) || recipients.length === 0) {
        console.error('Recipients file must contain a JSON array of addresses')
        process.exit(1)
      }

      const amount = BigInt(options.amount || '1')
      const delay = parseInt(options.delay || '500')

      console.log(`Airdropping to ${recipients.length} recipients...`)
      console.log(`  Token: ${mint}`)
      console.log(`  Amount: ${amount} per recipient\n`)

      let successful = 0
      let failed = 0

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i]
        try {
          console.log(`  [${i + 1}/${recipients.length}] Sending to ${recipient}...`)
          const result = await transfer(mint, recipient, amount, config)
          console.log(`    ✓ ${result.signature}`)
          successful++
        } catch (err) {
          console.log(`    ✗ Failed: ${err instanceof Error ? err.message : err}`)
          failed++
        }

        if (i < recipients.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      console.log(`\nAirdrop complete!`)
      console.log(`  Successful: ${successful}`)
      console.log(`  Failed: ${failed}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('snapshot <mint>', 'Snapshot token holders')
  .option('--output <path>', 'Output file path')
  .option('--min-balance <amount>', 'Minimum balance filter')
  .action(async (mint: string, options: { output?: string; minBalance?: string }) => {
    const config = await getConfig()
    const { getTokenHolders } = await import('../src/token/query')
    const fs = await import('node:fs')

    try {
      console.log(`Taking snapshot of ${mint} holders...`)
      const holders = await getTokenHolders(mint, config, { limit: 10000 })

      let filtered = holders
      if (options.minBalance) {
        const minBalance = BigInt(options.minBalance)
        filtered = holders.filter(h => h.balance >= minBalance)
      }

      console.log(`\nFound ${filtered.length} holders`)

      const snapshot = filtered.map(h => ({
        owner: h.owner,
        tokenAccount: h.tokenAccount,
        balance: h.balance.toString(),
        percentage: h.percentage,
      }))

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(snapshot, null, 2))
        console.log(`Snapshot saved to: ${options.output}`)
      } else {
        console.log(JSON.stringify(snapshot, null, 2))
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('verify <signature>', 'Verify a transaction')
  .action(async (signature: string) => {
    const config = await getConfig()
    const { createConnection } = await import('../src/drivers/solana/connection')

    try {
      const connection = createConnection(config)
      console.log(`Verifying transaction ${signature}...`)

      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      })

      if (!tx) {
        console.log('Transaction not found')
        process.exit(1)
      }

      console.log('\nTransaction Details:')
      console.log(`  Signature: ${signature}`)
      console.log(`  Slot: ${tx.slot}`)
      console.log(`  Block Time: ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'N/A'}`)
      console.log(`  Status: ${tx.meta?.err ? 'Failed' : 'Success'}`)
      console.log(`  Fee: ${tx.meta?.fee || 0} lamports`)
      console.log(`  Compute Units: ${tx.meta?.computeUnitsConsumed || 'N/A'}`)

      if (tx.meta?.err) {
        console.log(`  Error: ${JSON.stringify(tx.meta.err)}`)
      }

      if (tx.meta?.logMessages) {
        console.log('\nLogs:')
        for (const log of tx.meta.logMessages) {
          console.log(`  ${log}`)
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('decode <data>', 'Decode transaction or account data')
  .option('--type <type>', 'Data type (transaction/account/base58/base64)', 'base64')
  .action(async (data: string, options: { type?: string }) => {
    try {
      const type = options.type || 'base64'

      if (type === 'base64') {
        const decoded = Buffer.from(data, 'base64')
        console.log('Decoded (hex):')
        console.log(`  ${decoded.toString('hex')}`)
        console.log(`\nDecoded (utf8):`)
        console.log(`  ${decoded.toString('utf8')}`)
        console.log(`\nLength: ${decoded.length} bytes`)
      } else if (type === 'base58') {
        const { decode } = await import('../src/utils/base58')
        const decoded = decode(data)
        console.log('Decoded (hex):')
        console.log(`  ${Buffer.from(decoded).toString('hex')}`)
        console.log(`\nLength: ${decoded.length} bytes`)
      } else if (type === 'transaction') {
        const config = await getConfig()
        const { createConnection } = await import('../src/drivers/solana/connection')
        const connection = createConnection(config)

        const tx = await connection.getTransaction(data, {
          maxSupportedTransactionVersion: 0,
        })

        if (tx) {
          console.log('Transaction Data:')
          console.log(JSON.stringify({
            slot: tx.slot,
            blockTime: tx.blockTime,
            fee: tx.meta?.fee,
            status: tx.meta?.err ? 'failed' : 'success',
            logMessages: tx.meta?.logMessages,
          }, null, 2))
        } else {
          console.log('Transaction not found')
        }
      } else if (type === 'account') {
        const config = await getConfig()
        const { createConnection } = await import('../src/drivers/solana/connection')
        const { PublicKey } = await import('@solana/web3.js')
        const connection = createConnection(config)

        const accountInfo = await connection.getAccountInfo(new PublicKey(data))
        if (accountInfo) {
          console.log('Account Data:')
          console.log(`  Owner: ${accountInfo.owner.toBase58()}`)
          console.log(`  Lamports: ${accountInfo.lamports}`)
          console.log(`  Executable: ${accountInfo.executable}`)
          console.log(`  Data Length: ${accountInfo.data.length} bytes`)
          console.log(`  Data (hex): ${accountInfo.data.slice(0, 64).toString('hex')}${accountInfo.data.length > 64 ? '...' : ''}`)
        } else {
          console.log('Account not found')
        }
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
