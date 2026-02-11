/** CLI NFT, collection, and MPL Core command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function nftCreate(options: {
  name?: string
  symbol?: string
  uri?: string
  collection?: string
  royalty?: string
}): Promise<void> {
  if (!options.name || !options.uri) {
    error('--name and --uri are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { createNFT } = await import('../../nft/create')

    const result = await withSpinner('Creating NFT', () =>
      createNFT({
        name: options.name!,
        symbol: options.symbol || '',
        uri: options.uri!,
        collection: options.collection,
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : 0,
      }, config),
      'NFT created successfully'
    )

    keyValue('Mint', result.mint)
    keyValue('Metadata', result.metadata)
    if (result.masterEdition) keyValue('Master Edition', result.masterEdition)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftMint(uri: string, options: {
  name?: string
  symbol?: string
  royalty?: string
  collection?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { createNFT } = await import('../../nft/create')

    const result = await withSpinner('Minting NFT', () =>
      createNFT({
        name: options.name || 'NFT',
        symbol: options.symbol || '',
        uri,
        collection: options.collection,
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : 0,
      }, config),
      'NFT minted successfully'
    )

    keyValue('Mint', result.mint)
    keyValue('Metadata', result.metadata)
    if (result.masterEdition) keyValue('Master Edition', result.masterEdition)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftTransfer(mint: string, to: string): Promise<void> {
  try {
    const config = await getConfig()
    const { transferNFT } = await import('../../nft/transfer')

    const result = await withSpinner(`Transferring NFT ${mint}`, () =>
      transferNFT(mint, to, config),
      'NFT transferred successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftBurn(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { burnNFT } = await import('../../nft/burn')

    const result = await withSpinner(`Burning NFT ${mint}`, () =>
      burnNFT(mint, config),
      'NFT burned successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftInfo(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getNFTMetadata, fetchOffChainMetadata } = await import('../../nft/metadata')

    const metadata = await getNFTMetadata(mint, config)
    if (!metadata) {
      error('NFT not found')
      process.exit(1)
    }

    header('NFT Information')
    keyValue('Mint', mint)
    keyValue('Name', metadata.name)
    keyValue('Symbol', metadata.symbol)
    keyValue('URI', metadata.uri)
    keyValue('Royalty', `${metadata.sellerFeeBasisPoints / 100}%`)
    keyValue('Mutable', String(metadata.isMutable))
    keyValue('Update Authority', metadata.updateAuthority)

    if (metadata.creators && metadata.creators.length > 0) {
      info('Creators:')
      for (const creator of metadata.creators) {
        info(`  ${creator.address} (${creator.share}%)${creator.verified ? ' verified' : ''}`)
      }
    }

    const offChain = await fetchOffChainMetadata(metadata.uri)
    if (offChain) {
      header('Off-chain Metadata')
      keyValue('Description', (offChain as any).description || 'N/A')
      keyValue('Image', (offChain as any).image || 'N/A')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftList(owner?: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getNFTsByOwner } = await import('../../nft/query')
    const { getPublicKey } = await import('../../drivers/solana/wallet')

    const address = owner || getPublicKey(config)
    const nfts = await withSpinner(`Fetching NFTs for ${address}`, () =>
      getNFTsByOwner(address, config)
    )

    if (nfts.length === 0) {
      info('No NFTs found')
      return
    }

    header(`Found ${nfts.length} NFT(s)`)
    for (const nft of nfts) {
      info(nft.name)
      keyValue('  Mint', nft.mint)
      keyValue('  Symbol', nft.symbol)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function collectionCreate(options: {
  name?: string
  symbol?: string
  uri?: string
  royalty?: string
}): Promise<void> {
  if (!options.name || !options.uri) {
    error('--name and --uri are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { createCollection } = await import('../../nft/create')

    const result = await withSpinner('Creating collection', () =>
      createCollection({
        name: options.name!,
        symbol: options.symbol || '',
        uri: options.uri!,
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : undefined,
      }, config),
      'Collection created successfully'
    )

    keyValue('Mint', result.mint)
    keyValue('Metadata', result.metadata)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function collectionInfo(address: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getCollectionInfo } = await import('../../nft/query')

    const collectionData = await withSpinner(`Fetching collection info for ${address}`, () =>
      getCollectionInfo(address, config)
    )

    header('Collection Information')
    keyValue('Address', address)
    keyValue('Size', `${collectionData.size} items`)
    if (collectionData.metadata) {
      keyValue('Name', collectionData.metadata.name)
      keyValue('Symbol', collectionData.metadata.symbol)
      keyValue('URI', collectionData.metadata.uri)
      keyValue('Royalty', `${collectionData.metadata.sellerFeeBasisPoints / 100}%`)
      keyValue('Update Authority', collectionData.metadata.updateAuthority)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function collectionItems(address: string, options: {
  limit?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { getNFTsByCollection } = await import('../../nft/query')

    const limit = parseInt(options.limit || '50')
    const nfts = await withSpinner(`Fetching NFTs in collection ${address}`, () =>
      getNFTsByCollection(address, config, limit)
    )

    if (nfts.length === 0) {
      info('No NFTs found in collection')
      return
    }

    header(`Found ${nfts.length} NFT(s)`)
    for (const nft of nfts) {
      info(nft.name)
      keyValue('  Mint', nft.mint)
      keyValue('  Symbol', nft.symbol)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function collectionVerify(collection: string, nft: string): Promise<void> {
  try {
    const config = await getConfig()
    const { setAndVerifyCollection } = await import('../../nft/metadata')

    const result = await withSpinner(`Verifying NFT ${nft} in collection ${collection}`, () =>
      setAndVerifyCollection(nft, collection, config),
      'NFT verified in collection'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function collectionUpdate(address: string, options: {
  name?: string
  symbol?: string
  uri?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { updateNFTMetadata } = await import('../../nft/metadata')

    const result = await withSpinner(`Updating collection ${address}`, () =>
      updateNFTMetadata(address, {
        name: options.name,
        symbol: options.symbol,
        uri: options.uri,
      }, config),
      'Collection updated'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function coreCreate(options: {
  name?: string
  uri?: string
  collection?: string
  owner?: string
}): Promise<void> {
  if (!options.name || !options.uri) {
    error('--name and --uri are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { createCoreAsset } = await import('../../core/asset')

    const result = await withSpinner('Creating MPL Core asset', () =>
      createCoreAsset({
        name: options.name!,
        uri: options.uri!,
        collection: options.collection,
        owner: options.owner,
      }, config),
      'Core asset created successfully'
    )

    keyValue('Address', result.address)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function coreCollection(options: {
  name?: string
  uri?: string
}): Promise<void> {
  if (!options.name || !options.uri) {
    error('--name and --uri are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { createCoreCollection } = await import('../../core/collection')

    const result = await withSpinner('Creating MPL Core collection', () =>
      createCoreCollection({
        name: options.name!,
        uri: options.uri!,
      }, config),
      'Core collection created successfully'
    )

    keyValue('Address', result.address)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function coreTransfer(asset: string, to: string, options: {
  collection?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { transferCoreAsset } = await import('../../core/asset')

    const result = await withSpinner(`Transferring Core asset ${asset}`, () =>
      transferCoreAsset(asset, to, config, options.collection),
      'Core asset transferred'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function coreInfo(address: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getCoreAsset } = await import('../../core/query')

    const asset = await getCoreAsset(address, config)
    if (!asset) {
      error('Core asset not found')
      process.exit(1)
    }

    header('MPL Core Asset')
    keyValue('Address', asset.address)
    keyValue('Name', asset.name)
    keyValue('URI', asset.uri)
    keyValue('Owner', asset.owner)
    keyValue('Update Authority', typeof asset.updateAuthority === 'string'
      ? asset.updateAuthority
      : `Collection: ${asset.updateAuthority.address}`)
    if (asset.plugins.length > 0) {
      keyValue('Plugins', asset.plugins.map((p: any) => p.type).join(', '))
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
