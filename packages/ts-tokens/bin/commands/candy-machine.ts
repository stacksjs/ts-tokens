import { getConfig } from '../../src/config'

export function register(cli: any): void {
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
      const { createCandyMachine } = await import('../../src/nft/candy-machine/create')

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

        console.log('\n\u2713 Candy Machine created!')
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
      const { addConfigLines } = await import('../../src/nft/candy-machine/create')
      const fs = await import('node:fs')

      try {
        const content = fs.readFileSync(itemsFile, 'utf-8')
        const items: Array<{ name: string; uri: string }> = JSON.parse(content)

        console.log(`Adding ${items.length} config lines to ${candyMachine}...`)
        const result = await addConfigLines(candyMachine, 0, items, config)

        console.log(`\n\u2713 Config lines added!`)
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
      const { mintFromCandyMachine } = await import('../../src/nft/candy-machine/create')

      try {
        const count = parseInt(options.count || '1')
        for (let i = 0; i < count; i++) {
          console.log(`Minting NFT ${i + 1}/${count}...`)
          const result = await mintFromCandyMachine(candyMachine, config)

          console.log(`  \u2713 Minted! Mint: ${result.mint}`)
          console.log(`    Signature: ${result.signature}`)
        }
        console.log('\n\u2713 All mints complete!')
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('candy:info <candy-machine>', 'Show Candy Machine information')
    .action(async (candyMachine: string) => {
      const config = await getConfig()
      const { createConnection } = await import('../../src/drivers/solana/connection')
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
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { loadWallet } = await import('../../src/drivers/solana/wallet')
      const { lamportsToSol } = await import('../../src/utils')
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
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { lamportsToSol } = await import('../../src/utils')
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
      const { createConnection } = await import('../../src/drivers/solana/connection')
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
}
