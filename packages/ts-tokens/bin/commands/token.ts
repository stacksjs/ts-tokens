import { getConfig } from '../../src/config'

export function register(cli: any): void {
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
      const { createToken } = await import('../../src/token/create')

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

        console.log('\n\u2713 Token created successfully!')
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
      const { mintTokens } = await import('../../src/token/mint')

      try {
        console.log(`Minting ${amount} tokens...`)
        const result = await mintTokens({
          mint,
          amount: BigInt(amount),
          destination: options.to,
        }, config)

        console.log('\n\u2713 Tokens minted successfully!')
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
      const { transfer } = await import('../../src/token/transfer')

      try {
        console.log(`Transferring ${amount} tokens to ${to}...`)
        const result = await transfer(mint, to, BigInt(amount), config)

        console.log('\n\u2713 Transfer successful!')
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
      const { burn } = await import('../../src/token/burn')

      try {
        console.log(`Burning ${amount} tokens...`)
        const result = await burn(mint, BigInt(amount), config)

        console.log('\n\u2713 Tokens burned successfully!')
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
      const { getMintInfo } = await import('../../src/drivers/solana/account')
      const { createConnection } = await import('../../src/drivers/solana/connection')

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
      const { getTokenBalance } = await import('../../src/drivers/solana/account')
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')
      const { createConnection } = await import('../../src/drivers/solana/connection')

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

  // Token-2022 Fee Commands

  cli
    .command('fees:collect <mint>', 'Harvest withheld transfer fees to mint')
    .option('--accounts <addrs>', 'Comma-separated source token accounts')
    .action(async (mint: string, options: { accounts?: string }) => {
      const config = await getConfig()
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { loadWallet } = await import('../../src/drivers/solana/wallet')
      const { harvestWithheldTokensToMint } = await import('../../src/programs/token-2022/instructions')
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

        console.log('\n\u2713 Fees harvested successfully!')
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
      const { createConnection } = await import('../../src/drivers/solana/connection')
      const { loadWallet } = await import('../../src/drivers/solana/wallet')
      const { withdrawWithheldTokensFromAccounts } = await import('../../src/programs/token-2022/instructions')
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

        console.log('\n\u2713 Fees withdrawn successfully!')
        console.log(`  Signature: ${signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  // Token-2022 Enhanced Commands

  cli
    .command('token:create-2022', 'Create a Token-2022 token with extensions')
    .option('--name <name>', 'Token name')
    .option('--symbol <symbol>', 'Token symbol')
    .option('--decimals <decimals>', 'Decimal places', '9')
    .option('--extensions <list>', 'Comma-separated extensions (transferFee,metadata,nonTransferable,permanentDelegate)')
    .option('--transfer-fee-bps <bps>', 'Transfer fee basis points')
    .option('--max-fee <amount>', 'Max transfer fee')
    .action(async (options: {
      name?: string
      symbol?: string
      decimals?: string
      extensions?: string
      transferFeeBps?: string
      maxFee?: string
    }) => {
      if (!options.name || !options.symbol) {
        console.error('Error: --name and --symbol are required')
        process.exit(1)
      }

      const config = await getConfig()
      const { createToken2022 } = await import('../../src/token/token2022')

      try {
        const extNames = (options.extensions || '').split(',').filter(Boolean)
        const extensions: any[] = []

        for (const ext of extNames) {
          switch (ext.trim()) {
            case 'transferFee':
              extensions.push({
                type: 'transferFee',
                feeBasisPoints: parseInt(options.transferFeeBps || '100'),
                maxFee: BigInt(options.maxFee || '1000000000'),
                feeAuthority: '',
                withdrawAuthority: '',
              })
              break
            case 'nonTransferable':
              extensions.push({ type: 'nonTransferable' })
              break
            case 'defaultFrozen':
              extensions.push({ type: 'defaultAccountState', state: 'frozen' })
              break
          }
        }

        console.log('Creating Token-2022...')
        console.log(`  Extensions: ${extensions.map(e => e.type).join(', ') || 'none'}`)

        const result = await createToken2022({
          name: options.name,
          symbol: options.symbol,
          decimals: parseInt(options.decimals || '9'),
          extensions,
        }, config)

        console.log('\n\u2713 Token-2022 created!')
        console.log(`  Mint: ${result.mint}`)
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('token:metadata <mint>', 'Set embedded metadata on Token-2022 mint')
    .option('--name <name>', 'Token name')
    .option('--symbol <symbol>', 'Token symbol')
    .option('--uri <uri>', 'Metadata URI')
    .action(async (mint: string, options: { name?: string; symbol?: string; uri?: string }) => {
      if (!options.name || !options.symbol || !options.uri) {
        console.error('Error: --name, --symbol, and --uri are required')
        process.exit(1)
      }

      const config = await getConfig()
      const { setEmbeddedMetadata } = await import('../../src/token/embedded-metadata')

      try {
        console.log(`Setting embedded metadata on ${mint}...`)
        const result = await setEmbeddedMetadata(mint, {
          name: options.name,
          symbol: options.symbol,
          uri: options.uri,
        }, config)

        console.log('\n\u2713 Metadata set!')
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('token:group <mint>', 'Initialize a token group')
    .option('--max-size <size>', 'Maximum group size', '100')
    .action(async (mint: string, options: { maxSize?: string }) => {
      const config = await getConfig()
      const { createTokenGroup } = await import('../../src/token/token-group')

      try {
        console.log(`Creating token group on ${mint}...`)
        const result = await createTokenGroup(mint, parseInt(options.maxSize || '100'), config)
        console.log('\n\u2713 Token group created!')
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('token:harvest-fees <mint>', 'Harvest transfer fees from all accounts')
    .option('--withdraw', 'Also withdraw fees from mint')
    .option('--destination <address>', 'Withdrawal destination')
    .action(async (mint: string, options: { withdraw?: boolean; destination?: string }) => {
      const config = await getConfig()
      const { harvestTransferFees } = await import('../../src/token/fee-harvester')

      try {
        console.log(`Harvesting transfer fees for ${mint}...`)
        const result = await harvestTransferFees(mint, config, {
          withdraw: options.withdraw,
          destination: options.destination,
        })

        console.log(`\n\u2713 Fees harvested from ${result.accountsProcessed} account(s)`)
        if (result.harvestSignature) {
          console.log(`  Harvest Signature: ${result.harvestSignature}`)
        }
        if (result.withdrawSignature) {
          console.log(`  Withdraw Signature: ${result.withdrawSignature}`)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  // Token Commands (additional)

  cli
    .command('holders <mint>', 'List token holders')
    .option('--limit <limit>', 'Maximum number of holders to show', '20')
    .action(async (mint: string, options: { limit?: string }) => {
      const config = await getConfig()
      const { getTokenHolders } = await import('../../src/token/query')

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
          const { getMintInfo } = await import('../../src/drivers/solana/account')
          const { createConnection } = await import('../../src/drivers/solana/connection')

          const connection = createConnection(config)
          const info = await getMintInfo(connection, mint)
          console.log('Token Authorities:')
          console.log(`  Mint: ${mint}`)
          console.log(`  Mint Authority: ${info.mintAuthority || 'None (revoked)'}`)
          console.log(`  Freeze Authority: ${info.freezeAuthority || 'None (revoked)'}`)
          return
        }

        if (options.revokeMint) {
          const { revokeMintAuthority } = await import('../../src/token/authority')
          console.log('Revoking mint authority...')
          const result = await revokeMintAuthority(mint, config)
          console.log(`\u2713 Mint authority revoked! Signature: ${result.signature}`)
        }

        if (options.revokeFreeze) {
          const { revokeFreezeAuthority } = await import('../../src/token/authority')
          console.log('Revoking freeze authority...')
          const result = await revokeFreezeAuthority(mint, config)
          console.log(`\u2713 Freeze authority revoked! Signature: ${result.signature}`)
        }

        if (options.transferMint) {
          const { setMintAuthority } = await import('../../src/token/authority')
          console.log(`Transferring mint authority to ${options.transferMint}...`)
          const result = await setMintAuthority(mint, options.transferMint, config)
          console.log(`\u2713 Mint authority transferred! Signature: ${result.signature}`)
        }

        if (options.transferFreeze) {
          const { setFreezeAuthority } = await import('../../src/token/authority')
          console.log(`Transferring freeze authority to ${options.transferFreeze}...`)
          const result = await setFreezeAuthority(mint, options.transferFreeze, config)
          console.log(`\u2713 Freeze authority transferred! Signature: ${result.signature}`)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
