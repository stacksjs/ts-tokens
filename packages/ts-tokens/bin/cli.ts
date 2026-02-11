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
  .option('--token-2022', 'Use Token-2022 program')
  .option('--transfer-fee <bps>', 'Enable transfer fees (basis points)')
  .option('--max-fee <amount>', 'Maximum transfer fee', '1000000000')
  .option('--interest-rate <rate>', 'Interest-bearing rate (basis points)')
  .option('--soulbound', 'Non-transferable (soulbound)')
  .option('--confidential', 'Enable confidential transfers')
  .option('--default-frozen', 'New accounts start frozen')
  .action(async (options: {
    name?: string
    symbol?: string
    decimals?: string
    supply?: string
    metadataUri?: string
    token2022?: boolean
    transferFee?: string
    maxFee?: string
    interestRate?: string
    soulbound?: boolean
    confidential?: boolean
    defaultFrozen?: boolean
  }) => {
    if (!options.name || !options.symbol) {
      console.error('Error: --name and --symbol are required')
      process.exit(1)
    }

    const config = await getConfig()
    const { createToken } = await import('../src/token/create')

    try {
      // Build extensions array from flags
      const extensions: Array<any> = []
      let useToken2022 = options.token2022 || false

      if (options.transferFee) {
        useToken2022 = true
        extensions.push({
          type: 'transferFee',
          feeBasisPoints: parseInt(options.transferFee),
          maxFee: BigInt(options.maxFee || '1000000000'),
          feeAuthority: '',
          withdrawAuthority: '',
        })
      }

      if (options.interestRate) {
        useToken2022 = true
        extensions.push({
          type: 'interestBearing',
          rate: parseInt(options.interestRate),
          rateAuthority: '',
        })
      }

      if (options.soulbound) {
        useToken2022 = true
        extensions.push({ type: 'nonTransferable' })
      }

      if (options.confidential) {
        useToken2022 = true
        extensions.push({ type: 'confidentialTransfer' })
      }

      if (options.defaultFrozen) {
        useToken2022 = true
        extensions.push({ type: 'defaultAccountState', state: 'frozen' })
      }

      console.log('Creating token...')
      if (useToken2022) {
        console.log('  Program: Token-2022')
        if (extensions.length > 0) {
          console.log(`  Extensions: ${extensions.map((e: any) => e.type).join(', ')}`)
        }
      }

      const result = await createToken({
        name: options.name,
        symbol: options.symbol,
        decimals: parseInt(options.decimals || '9'),
        initialSupply: options.supply ? BigInt(options.supply) : undefined,
        uri: options.metadataUri,
        useToken2022,
        extensions: extensions.length > 0 ? extensions : undefined,
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
// Token-2022 Fee Commands
// ============================================

cli
  .command('fees:collect <mint>', 'Harvest withheld transfer fees to mint')
  .option('--accounts <addrs>', 'Comma-separated source token accounts')
  .action(async (mint: string, options: { accounts?: string }) => {
    const config = await getConfig()
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { loadWallet } = await import('../src/drivers/solana/wallet')
    const { harvestWithheldTokensToMint } = await import('../src/programs/token-2022/instructions')
    const { PublicKey, Transaction } = await import('@solana/web3.js')
    const { TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')

    try {
      const connection = createConnection(config)
      const payer = loadWallet(config)
      const mintPubkey = new PublicKey(mint)

      let sources: InstanceType<typeof PublicKey>[] = []

      if (options.accounts) {
        sources = options.accounts.split(',').map(a => new PublicKey(a.trim()))
      } else {
        // Auto-discover token accounts with withheld fees
        console.log('Discovering token accounts with withheld fees...')
        const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mint } },
          ],
        })
        sources = accounts.map(a => a.pubkey)
      }

      if (sources.length === 0) {
        console.log('No token accounts found to harvest from')
        return
      }

      console.log(`Harvesting fees from ${sources.length} account(s)...`)
      const instruction = harvestWithheldTokensToMint({
        mint: mintPubkey,
        sources,
      })

      const transaction = new Transaction().add(instruction)
      transaction.feePayer = payer.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.sign(payer)

      const signature = await connection.sendRawTransaction(transaction.serialize())
      await connection.confirmTransaction(signature)

      console.log('\n✓ Fees harvested successfully!')
      console.log(`  Signature: ${signature}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('fees:withdraw <mint>', 'Withdraw collected fees from mint')
  .option('--destination <addr>', 'Destination token account')
  .action(async (mint: string, options: { destination?: string }) => {
    const config = await getConfig()
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { loadWallet } = await import('../src/drivers/solana/wallet')
    const { withdrawWithheldTokensFromAccounts } = await import('../src/programs/token-2022/instructions')
    const { PublicKey, Transaction } = await import('@solana/web3.js')
    const { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')

    try {
      const connection = createConnection(config)
      const payer = loadWallet(config)
      const mintPubkey = new PublicKey(mint)

      const destination = options.destination
        ? new PublicKey(options.destination)
        : await getAssociatedTokenAddress(mintPubkey, payer.publicKey, false, TOKEN_2022_PROGRAM_ID)

      console.log(`Withdrawing fees from mint ${mint}...`)
      console.log(`  Destination: ${destination.toBase58()}`)

      const instruction = withdrawWithheldTokensFromAccounts({
        mint: mintPubkey,
        destination,
        authority: payer.publicKey,
        sources: [],
      })

      const transaction = new Transaction().add(instruction)
      transaction.feePayer = payer.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.sign(payer)

      const signature = await connection.sendRawTransaction(transaction.serialize())
      await connection.confirmTransaction(signature)

      console.log('\n✓ Fees withdrawn successfully!')
      console.log(`  Signature: ${signature}`)
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
// Security Audit Commands
// ============================================

cli
  .command('security:audit <mint>', 'Audit a token for security issues')
  .action(async (mint: string) => {
    const config = await getConfig()
    const { auditToken } = await import('../src/security/audit')
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { formatAuditReport } = await import('../src/cli/security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const connection = createConnection(config)
      const report = await auditToken(connection, new PublicKey(mint))
      console.log(formatAuditReport(report))
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('security:collection <address>', 'Audit an NFT collection')
  .action(async (address: string) => {
    const config = await getConfig()
    const { auditCollection } = await import('../src/security/audit')
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { formatAuditReport } = await import('../src/cli/security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const connection = createConnection(config)
      const report = await auditCollection(connection, new PublicKey(address))
      console.log(formatAuditReport(report))
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('security:wallet [address]', 'Audit wallet security')
  .action(async (address?: string) => {
    const config = await getConfig()
    const { auditWallet } = await import('../src/security/audit')
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { getPublicKey } = await import('../src/drivers/solana/wallet')
    const { formatAuditReport } = await import('../src/cli/security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const walletAddr = address || getPublicKey(config)
      const connection = createConnection(config)
      const report = await auditWallet(connection, new PublicKey(walletAddr))
      console.log(formatAuditReport(report))
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('security:report', 'Generate full security report')
  .option('--tokens <mints>', 'Comma-separated token mint addresses')
  .option('--collections <addresses>', 'Comma-separated collection addresses')
  .option('--wallet [address]', 'Include wallet audit')
  .action(async (options: { tokens?: string; collections?: string; wallet?: string | boolean }) => {
    const config = await getConfig()
    const { generateSecurityReport } = await import('../src/security/audit')
    const { createConnection } = await import('../src/drivers/solana/connection')
    const { getPublicKey } = await import('../src/drivers/solana/wallet')
    const { formatSecurityReport } = await import('../src/cli/security-helpers')
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const connection = createConnection(config)
      const tokens = options.tokens?.split(',').map(m => new PublicKey(m.trim()))
      const collections = options.collections?.split(',').map(a => new PublicKey(a.trim()))
      let wallet: InstanceType<typeof PublicKey> | undefined
      if (options.wallet) {
        const addr = typeof options.wallet === 'string' ? options.wallet : getPublicKey(config)
        wallet = new PublicKey(addr)
      }

      const report = await generateSecurityReport({ connection, tokens, collections, wallet })
      console.log(formatSecurityReport(report))
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Wallet Keyring & Session Commands
// ============================================

cli
  .command('wallet:encrypt', 'Encrypt current keypair to keyring')
  .option('--password <password>', 'Encryption password')
  .action(async (options: { password?: string }) => {
    if (!options.password) {
      console.error('Error: --password is required')
      process.exit(1)
    }

    const config = await getConfig()
    const { loadWallet } = await import('../src/drivers/solana/wallet')
    const { encryptAndSaveKeypair } = await import('../src/security/keyring')

    try {
      const keypair = loadWallet(config)
      encryptAndSaveKeypair(
        keypair.secretKey,
        keypair.publicKey.toBase58(),
        options.password
      )
      console.log(`\u2713 Keypair encrypted and saved to keyring`)
      console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('wallet:decrypt', 'Load wallet from encrypted keyring')
  .option('--password <password>', 'Decryption password')
  .action(async (options: { password?: string }) => {
    if (!options.password) {
      console.error('Error: --password is required')
      process.exit(1)
    }

    const { loadKeypairFromKeyring, setWallet } = await import('../src/drivers/solana/wallet')

    try {
      const keypair = loadKeypairFromKeyring(options.password)
      setWallet(keypair)
      console.log(`\u2713 Wallet loaded from keyring`)
      console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('wallet:unlock', 'Start a signing session')
  .option('--password <password>', 'Keyring password')
  .option('--timeout <minutes>', 'Session timeout in minutes', '30')
  .action(async (options: { password?: string; timeout?: string }) => {
    if (!options.password) {
      console.error('Error: --password is required')
      process.exit(1)
    }

    const { startSession } = await import('../src/security/session')

    try {
      const timeoutMs = parseInt(options.timeout || '30') * 60 * 1000
      startSession(options.password, { timeoutMs })
      console.log(`\u2713 Signing session started (timeout: ${options.timeout || '30'} minutes)`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('wallet:lock', 'End the signing session')
  .action(async () => {
    const { endSession, isSessionActive } = await import('../src/security/session')

    if (!isSessionActive()) {
      console.log('No active session to lock')
      return
    }

    endSession()
    console.log('\u2713 Signing session ended')
  })

cli
  .command('wallet:keyring-info', 'Show keyring public key without decrypting')
  .action(async () => {
    const { getKeyringInfo, keyringExists } = await import('../src/security/keyring')

    try {
      if (!keyringExists()) {
        console.log('No keyring found. Use `tokens wallet:encrypt` to create one.')
        return
      }

      const info = getKeyringInfo()
      console.log('Keyring Information:')
      console.log(`  Public Key: ${info.publicKey}`)
      console.log(`  Version: ${info.version}`)
      console.log(`  Algorithm: ${info.algorithm}`)
      console.log(`  KDF: ${info.kdf}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Batch Recovery Commands
// ============================================

cli
  .command('batch:retry <recovery-file>', 'Retry failed items from recovery state')
  .action(async (recoveryFile: string) => {
    const { loadRecoveryState, getRetryItems, formatRecoverySummary } = await import('../src/batch/recovery')

    try {
      const state = loadRecoveryState(recoveryFile)
      const retryItems = getRetryItems(state)

      if (retryItems.length === 0) {
        console.log('No failed items to retry')
        console.log(formatRecoverySummary(state))
        return
      }

      console.log(`Found ${retryItems.length} failed item(s) to retry:`)
      for (const item of retryItems) {
        console.log(`  #${item.index} ${item.recipient}: ${item.error}`)
      }
      console.log('\nTo retry, re-run the batch operation with these recipients.')
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('batch:status <recovery-file>', 'Show batch operation status')
  .action(async (recoveryFile: string) => {
    const { loadRecoveryState, formatRecoverySummary } = await import('../src/batch/recovery')

    try {
      const state = loadRecoveryState(recoveryFile)
      console.log(formatRecoverySummary(state))
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

// ============================================
// Marketplace & Trading Commands
// ============================================

cli
  .command('nft:sell <mint>', 'List an NFT for sale')
  .option('--price <sol>', 'Price in SOL', '1')
  .option('--expiry <hours>', 'Expiry in hours')
  .option('--escrow', 'Use escrow-based sale')
  .action(async (mint: string, options: { price?: string; expiry?: string; escrow?: boolean }) => {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const mintPubkey = new PublicKey(mint)
      const priceLamports = BigInt(Math.round(Number.parseFloat(options.price || '1') * 1e9))
      const expiry = options.expiry ? Date.now() + Number.parseFloat(options.expiry) * 3600000 : undefined

      if (options.escrow) {
        const { createEscrow } = await import('../src/marketplace/escrow')
        const escrow = await createEscrow({ mint: mintPubkey, price: priceLamports, expiry }, config)
        console.log('\u2713 NFT deposited into escrow')
        console.log(`  Escrow ID: ${escrow.id}`)
        console.log(`  Price: ${options.price} SOL`)
        console.log(`  Mint: ${mint}`)
      } else {
        const { listNFT } = await import('../src/marketplace/listing')
        const listing = await listNFT({ mint: mintPubkey, price: priceLamports, expiry }, config)
        console.log('\u2713 NFT listed for sale')
        console.log(`  Listing ID: ${listing.id}`)
        console.log(`  Price: ${options.price} SOL`)
        console.log(`  Mint: ${mint}`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:delist <mint>', 'Cancel an NFT listing')
  .action(async (mint: string) => {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const { delistNFT } = await import('../src/marketplace/listing')
      await delistNFT(new PublicKey(mint), config)
      console.log('\u2713 NFT delisted')
      console.log(`  Mint: ${mint}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:buy <mint>', 'Purchase a listed NFT')
  .action(async (mint: string) => {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const { buyListedNFT } = await import('../src/marketplace/listing')
      const result = await buyListedNFT(new PublicKey(mint), config)
      console.log('\u2713 NFT purchased')
      console.log(`  Signature: ${result.signature}`)
      console.log(`  Mint: ${mint}`)
      console.log(`  Price: ${Number(result.listing.price) / 1e9} SOL`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:offer <mint>', 'Make an offer on an NFT')
  .option('--price <sol>', 'Offer price in SOL', '1')
  .option('--expiry <hours>', 'Expiry in hours')
  .action(async (mint: string, options: { price?: string; expiry?: string }) => {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const { makeOffer } = await import('../src/marketplace/offers')
      const mintPubkey = new PublicKey(mint)
      const priceLamports = BigInt(Math.round(Number.parseFloat(options.price || '1') * 1e9))
      const expiry = options.expiry ? Date.now() + Number.parseFloat(options.expiry) * 3600000 : undefined

      const offer = await makeOffer({ mint: mintPubkey, price: priceLamports, expiry }, config)
      console.log('\u2713 Offer created')
      console.log(`  Offer ID: ${offer.id}`)
      console.log(`  Mint: ${mint}`)
      console.log(`  Price: ${options.price} SOL`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:auction <mint>', 'Create an auction for an NFT')
  .option('--type <type>', 'Auction type (english or dutch)', 'english')
  .option('--start <sol>', 'Starting price in SOL', '1')
  .option('--reserve <sol>', 'Reserve price in SOL')
  .option('--duration <hours>', 'Duration in hours', '24')
  .option('--decrement <sol>', 'Price decrement for Dutch auctions')
  .option('--interval <minutes>', 'Decrement interval in minutes for Dutch auctions')
  .action(async (mint: string, options: {
    type?: string
    start?: string
    reserve?: string
    duration?: string
    decrement?: string
    interval?: string
  }) => {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')

    try {
      const { createAuction } = await import('../src/marketplace/auction')
      const mintPubkey = new PublicKey(mint)
      const startPrice = BigInt(Math.round(Number.parseFloat(options.start || '1') * 1e9))
      const reservePrice = options.reserve ? BigInt(Math.round(Number.parseFloat(options.reserve) * 1e9)) : undefined
      const duration = Number.parseFloat(options.duration || '24') * 3600000
      const priceDecrement = options.decrement ? BigInt(Math.round(Number.parseFloat(options.decrement) * 1e9)) : undefined
      const decrementInterval = options.interval ? Number.parseFloat(options.interval) * 60000 : undefined
      const auctionType = (options.type === 'dutch' ? 'dutch' : 'english') as 'english' | 'dutch'

      const auction = await createAuction({
        mint: mintPubkey,
        type: auctionType,
        startPrice,
        reservePrice,
        duration,
        priceDecrement,
        decrementInterval,
      }, config)

      console.log(`\u2713 ${auctionType.charAt(0).toUpperCase() + auctionType.slice(1)} auction created`)
      console.log(`  Auction ID: ${auction.id}`)
      console.log(`  Mint: ${mint}`)
      console.log(`  Start Price: ${options.start} SOL`)
      if (reservePrice) console.log(`  Reserve: ${options.reserve} SOL`)
      console.log(`  Ends: ${new Date(auction.endTime).toISOString()}`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:bid <auction-id>', 'Place a bid on an auction')
  .option('--price <sol>', 'Bid price in SOL')
  .action(async (auctionId: string, options: { price?: string }) => {
    const config = await getConfig()

    try {
      if (!options.price) {
        console.error('Error: --price is required')
        process.exit(1)
      }

      const { placeBid } = await import('../src/marketplace/auction')
      const amount = BigInt(Math.round(Number.parseFloat(options.price) * 1e9))

      const auction = placeBid({ auctionId, amount }, config)
      console.log('\u2713 Bid placed')
      console.log(`  Auction: ${auctionId}`)
      console.log(`  Bid: ${options.price} SOL`)
      console.log(`  Highest Bid: ${auction.highestBid ? Number(auction.highestBid) / 1e9 : 0} SOL`)
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('nft:settle <auction-id>', 'Settle an ended auction')
  .action(async (auctionId: string) => {
    const config = await getConfig()

    try {
      const { getAuctionInfo, settleAuction, buyDutchAuction } = await import('../src/marketplace/auction')
      const auction = getAuctionInfo(auctionId)

      if (!auction) {
        console.error(`Auction not found: ${auctionId}`)
        process.exit(1)
      }

      if (auction.type === 'dutch') {
        const result = await buyDutchAuction(auctionId, config)
        console.log('\u2713 Dutch auction purchased')
        console.log(`  Signature: ${result.signature}`)
        console.log(`  Price: ${Number(result.price) / 1e9} SOL`)
      } else {
        const result = await settleAuction(auctionId, config)
        console.log('\u2713 Auction settled')
        console.log(`  Signature: ${result.signature}`)
        console.log(`  Winner: ${result.auction.highestBidder?.toBase58()}`)
        console.log(`  Price: ${result.auction.highestBid ? Number(result.auction.highestBid) / 1e9 : 0} SOL`)
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('marketplace:listings', 'Show active listings')
  .option('--mine', 'Show only my listings')
  .action(async (options: { mine?: boolean }) => {
    const config = await getConfig()

    try {
      const { getActiveListings } = await import('../src/marketplace/listing')
      let listings = getActiveListings()

      if (options.mine) {
        const { getPublicKey } = await import('../src/drivers/solana/wallet')
        const pubkey = getPublicKey(config)
        listings = listings.filter(l => l.seller.toBase58() === pubkey)
      }

      if (listings.length === 0) {
        console.log('No active listings')
        return
      }

      console.log(`Active Listings (${listings.length}):`)
      for (const listing of listings) {
        console.log(`  ${listing.id}`)
        console.log(`    Mint: ${listing.mint.toBase58()}`)
        console.log(`    Price: ${Number(listing.price) / 1e9} SOL`)
        console.log(`    Seller: ${listing.seller.toBase58()}`)
        if (listing.expiry) console.log(`    Expires: ${new Date(listing.expiry).toISOString()}`)
        console.log('')
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('marketplace:auctions', 'Show active auctions')
  .option('--mine', 'Show only my auctions')
  .action(async (options: { mine?: boolean }) => {
    const config = await getConfig()

    try {
      const { getActiveAuctions } = await import('../src/marketplace/auction')
      let auctions = getActiveAuctions()

      if (options.mine) {
        const { getPublicKey } = await import('../src/drivers/solana/wallet')
        const pubkey = getPublicKey(config)
        auctions = auctions.filter(a => a.seller.toBase58() === pubkey)
      }

      if (auctions.length === 0) {
        console.log('No active auctions')
        return
      }

      console.log(`Active Auctions (${auctions.length}):`)
      for (const auction of auctions) {
        console.log(`  ${auction.id} (${auction.type})`)
        console.log(`    Mint: ${auction.mint.toBase58()}`)
        console.log(`    Start Price: ${Number(auction.startPrice) / 1e9} SOL`)
        if (auction.highestBid) console.log(`    Highest Bid: ${Number(auction.highestBid) / 1e9} SOL`)
        console.log(`    Ends: ${new Date(auction.endTime).toISOString()}`)
        console.log(`    Bids: ${auction.bids.length}`)
        console.log('')
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('marketplace:offers [mint]', 'Show offers for an NFT')
  .option('--mine', 'Show only my offers')
  .action(async (mint: string | undefined, options: { mine?: boolean }) => {
    const config = await getConfig()

    try {
      if (mint) {
        const { getOffersForNFT } = await import('../src/marketplace/offers')
        const offers = getOffersForNFT(mint)

        if (offers.length === 0) {
          console.log(`No active offers for ${mint}`)
          return
        }

        console.log(`Offers for ${mint} (${offers.length}):`)
        for (const offer of offers) {
          console.log(`  ${offer.id}`)
          console.log(`    Bidder: ${offer.bidder.toBase58()}`)
          console.log(`    Price: ${Number(offer.price) / 1e9} SOL`)
          if (offer.expiry) console.log(`    Expires: ${new Date(offer.expiry).toISOString()}`)
          console.log('')
        }
      } else if (options.mine) {
        const { loadState } = await import('../src/marketplace/store')
        const { getPublicKey } = await import('../src/drivers/solana/wallet')
        const pubkey = getPublicKey(config)
        const state = loadState()
        const myOffers = Object.values(state.offers)
          .filter(o => o.bidder === pubkey && o.status === 'active')

        if (myOffers.length === 0) {
          console.log('No active offers')
          return
        }

        console.log(`My Offers (${myOffers.length}):`)
        for (const offer of myOffers) {
          console.log(`  ${offer.id}`)
          console.log(`    Mint: ${offer.mint}`)
          console.log(`    Price: ${Number(BigInt(offer.price)) / 1e9} SOL`)
          console.log('')
        }
      } else {
        console.log('Provide a mint address or use --mine to see your offers')
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

cli
  .command('marketplace:cleanup', 'Clean up expired marketplace records')
  .action(async () => {
    try {
      const { cleanupExpired } = await import('../src/marketplace/store')
      const result = cleanupExpired()
      const total = result.listings + result.offers + result.escrows + result.auctions

      if (total === 0) {
        console.log('No expired records found')
        return
      }

      console.log('\u2713 Cleaned up expired records:')
      if (result.listings > 0) console.log(`  Listings: ${result.listings}`)
      if (result.offers > 0) console.log(`  Offers: ${result.offers}`)
      if (result.escrows > 0) console.log(`  Escrows: ${result.escrows}`)
      if (result.auctions > 0) console.log(`  Auctions: ${result.auctions}`)
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
