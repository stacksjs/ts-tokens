/**
 * CLI Simple NFT command handlers
 *
 * Simplified NFT operations with cleaner DX.
 * Follows the same pattern as cli/commands/nft.ts.
 */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

/**
 * Create a simple NFT
 */
export async function simpleNftCreate(options: {
  name?: string
  image?: string
  symbol?: string
  description?: string
  royalty?: string
  collection?: string
  mutable?: boolean
}): Promise<void> {
  if (!options.name || !options.image) {
    error('--name and --image are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { createSimpleNFT } = await import('../../simple-nft/create')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')

    const connection = createConnection(config)
    const wallet = loadWallet(config)

    let collection: import('@solana/web3.js').PublicKey | undefined
    if (options.collection) {
      const { PublicKey } = await import('@solana/web3.js')
      collection = new PublicKey(options.collection)
    }

    const result = await withSpinner('Creating simple NFT', () =>
      createSimpleNFT(connection, wallet.publicKey, {
        name: options.name!,
        symbol: options.symbol,
        description: options.description,
        image: options.image!,
        royalty: options.royalty ? parseFloat(options.royalty) : 0,
        collection,
        isMutable: options.mutable ?? false,
      }, config),
      'Simple NFT created successfully'
    )

    keyValue('Mint', result.mint)
    keyValue('Metadata', result.metadata)
    if (result.masterEdition) keyValue('Master Edition', result.masterEdition)
    keyValue('Signature', result.signature)
    keyValue('URI', result.uri)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Get simple NFT info
 */
export async function simpleNftInfo(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getSimpleNFT } = await import('../../simple-nft/create')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const mintPubkey = new PublicKey(mint)

    const nft = await withSpinner(`Fetching NFT ${mint}`, () =>
      getSimpleNFT(connection, mintPubkey, config)
    )

    if (!nft) {
      error('NFT not found')
      process.exit(1)
    }

    header('Simple NFT Information')
    keyValue('Mint', nft.mint.toBase58())
    keyValue('Owner', nft.owner.toBase58())
    keyValue('Name', nft.name)
    keyValue('Symbol', nft.symbol)
    keyValue('URI', nft.uri)
    keyValue('Royalty', `${nft.royalty}%`)
    keyValue('Mutable', String(nft.isMutable))
    keyValue('Primary Sale', String(nft.primarySaleHappened))

    if (nft.creators.length > 0) {
      info('Creators:')
      for (const creator of nft.creators) {
        info(`  ${creator.address.toBase58()} (${creator.share}%)${creator.verified ? ' verified' : ''}`)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Transfer a simple NFT
 */
export async function simpleNftTransfer(mint: string, to: string): Promise<void> {
  try {
    const config = await getConfig()
    const { transferSimpleNFT } = await import('../../simple-nft/transfer')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const wallet = loadWallet(config)

    const result = await withSpinner(`Transferring NFT ${mint}`, () =>
      transferSimpleNFT(
        connection,
        new PublicKey(mint),
        wallet.publicKey,
        new PublicKey(to),
        config
      ),
      'NFT transferred successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Burn a simple NFT
 */
export async function simpleNftBurn(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { burnSimpleNFT } = await import('../../simple-nft/burn')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const wallet = loadWallet(config)

    const result = await withSpinner(`Burning NFT ${mint}`, () =>
      burnSimpleNFT(
        connection,
        new PublicKey(mint),
        wallet.publicKey,
        config
      ),
      'NFT burned successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Create a simple collection
 */
export async function simpleCollectionCreate(options: {
  name?: string
  image?: string
  symbol?: string
  description?: string
  royalty?: string
}): Promise<void> {
  if (!options.name || !options.image) {
    error('--name and --image are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { createSimpleCollection } = await import('../../simple-nft/collection')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')

    const connection = createConnection(config)
    const wallet = loadWallet(config)

    const result = await withSpinner('Creating simple collection', () =>
      createSimpleCollection(connection, wallet.publicKey, {
        name: options.name!,
        symbol: options.symbol,
        description: options.description,
        image: options.image!,
        royalty: options.royalty ? parseFloat(options.royalty) : 0,
      }, config),
      'Simple collection created successfully'
    )

    keyValue('Mint', result.mint)
    keyValue('Metadata', result.metadata)
    keyValue('Signature', result.signature)
    keyValue('URI', result.uri)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Add NFT to collection
 */
export async function simpleCollectionAdd(nft: string, collection: string): Promise<void> {
  try {
    const config = await getConfig()
    const { addToCollection } = await import('../../simple-nft/collection')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const wallet = loadWallet(config)

    const signature = await withSpinner(`Adding NFT ${nft} to collection`, () =>
      addToCollection(
        connection,
        new PublicKey(nft),
        new PublicKey(collection),
        wallet.publicKey,
        config
      ),
      'NFT added to collection'
    )

    keyValue('Signature', signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Create master edition
 */
export async function simpleEditionsCreate(master: string, options: {
  max?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { createMasterEditionSimple } = await import('../../simple-nft/editions')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const wallet = loadWallet(config)

    const maxSupply = options.max ? parseInt(options.max) : undefined

    const result = await withSpinner('Creating master edition', () =>
      createMasterEditionSimple(
        connection,
        new PublicKey(master),
        wallet.publicKey,
        config,
        maxSupply
      ),
      'Master edition created successfully'
    )

    keyValue('Master Edition', result.masterEdition)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
