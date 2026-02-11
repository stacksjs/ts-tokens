import { getConfig } from '../../src/config'

export function register(cli: any): void {
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
      const { createNFT } = await import('../../src/nft/create')

      try {
        console.log('Creating NFT...')
        const result = await createNFT({
          name: options.name,
          symbol: options.symbol || '',
          uri: options.uri,
          collection: options.collection,
          sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : 0,
        }, config)

        console.log('\n\u2713 NFT created successfully!')
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
      const { transferNFT } = await import('../../src/nft/transfer')

      try {
        console.log(`Transferring NFT ${mint} to ${to}...`)
        const result = await transferNFT(mint, to, config)

        console.log('\n\u2713 NFT transferred successfully!')
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
      const { burnNFT } = await import('../../src/nft/burn')

      try {
        console.log(`Burning NFT ${mint}...`)
        const result = await burnNFT(mint, config)

        console.log('\n\u2713 NFT burned successfully!')
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
      const { getNFTMetadata, fetchOffChainMetadata } = await import('../../src/nft/metadata')

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
            console.log(`    - ${creator.address} (${creator.share}%)${creator.verified ? ' \u2713' : ''}`)
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
      const { createCollection } = await import('../../src/nft/create')

      try {
        console.log('Creating collection...')
        const result = await createCollection({
          name: options.name,
          symbol: options.symbol || '',
          uri: options.uri,
          sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : undefined,
        }, config)

        console.log('\n\u2713 Collection created successfully!')
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
      const { getNFTsByOwner } = await import('../../src/nft/query')
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')

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

  // NFT Commands (additional)

  cli
    .command('nft:mint <uri>', 'Mint an NFT from metadata URI')
    .option('--name <name>', 'NFT name')
    .option('--symbol <symbol>', 'NFT symbol')
    .option('--royalty <bps>', 'Royalty in basis points')
    .option('--collection <address>', 'Collection address')
    .action(async (uri: string, options: { name?: string; symbol?: string; royalty?: string; collection?: string }) => {
      const config = await getConfig()
      const { createNFT } = await import('../../src/nft/create')

      try {
        console.log('Minting NFT...')
        const result = await createNFT({
          name: options.name || 'NFT',
          symbol: options.symbol || '',
          uri,
          collection: options.collection,
          sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : 0,
        }, config)

        console.log('\n\u2713 NFT minted successfully!')
        console.log(`  Mint: ${result.mint}`)
        console.log(`  Metadata: ${result.metadata}`)
        console.log(`  Master Edition: ${result.masterEdition}`)
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  // Collection Commands (additional)

  cli
    .command('collection:info <address>', 'Show collection information')
    .action(async (address: string) => {
      const config = await getConfig()
      const { getCollectionInfo } = await import('../../src/nft/query')

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
      const { getNFTsByCollection } = await import('../../src/nft/query')

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
      const { setAndVerifyCollection } = await import('../../src/nft/metadata')

      try {
        console.log(`Verifying NFT ${nft} in collection ${collection}...`)
        const result = await setAndVerifyCollection(nft, collection, config)
        console.log(`\n\u2713 NFT verified in collection!`)
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
      const { updateNFTMetadata } = await import('../../src/nft/metadata')

      try {
        console.log(`Updating collection ${address}...`)
        const result = await updateNFTMetadata(address, {
          name: options.name,
          symbol: options.symbol,
          uri: options.uri,
        }, config)

        console.log(`\n\u2713 Collection updated!`)
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
