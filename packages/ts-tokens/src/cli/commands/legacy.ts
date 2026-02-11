/**
 * CLI Legacy Command Handlers
 *
 * 14 command handlers for `tokens legacy` subcommands.
 */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

/**
 * tokens legacy import <collection>
 */
export async function legacyImport(collection: string): Promise<void> {
  try {
    const config = await getConfig()
    const { importCollection } = await import('../../legacy/collection')

    const result = await withSpinner(`Importing collection ${collection}`, () =>
      importCollection(collection, config),
      'Collection imported successfully'
    )

    header('Collection Info')
    keyValue('Mint', result.collection.mint)
    keyValue('Name', result.collection.name)
    keyValue('Symbol', result.collection.symbol)
    keyValue('Version', result.collection.version)
    keyValue('Update Authority', result.collection.updateAuthority)
    keyValue('Royalty', `${result.collection.sellerFeeBasisPoints / 100}%`)
    keyValue('Mutable', String(result.collection.isMutable))
    keyValue('NFTs Found', String(result.nftCount))

    if (result.sampleNFTs.length > 0) {
      header('Sample NFTs')
      for (const nft of result.sampleNFTs) {
        info(`  ${nft.name} (${nft.mint})`)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy info <collection>
 */
export async function legacyInfo(collection: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getCollectionMetadata } = await import('../../legacy/metadata')
    const { detectCollectionVersion } = await import('../../legacy/collection')

    const { onChain, offChain } = await withSpinner(
      `Fetching collection info for ${collection}`,
      () => getCollectionMetadata(collection, config)
    )

    const version = await detectCollectionVersion(collection, config)

    header('Collection Information')
    keyValue('Mint', collection)
    keyValue('Name', onChain.name)
    keyValue('Symbol', onChain.symbol)
    keyValue('URI', onChain.uri)
    keyValue('Version', version)
    keyValue('Royalty', `${onChain.sellerFeeBasisPoints / 100}%`)
    keyValue('Mutable', String(onChain.isMutable))
    keyValue('Update Authority', onChain.updateAuthority)

    if (onChain.creators && onChain.creators.length > 0) {
      info('Creators:')
      for (const creator of onChain.creators) {
        info(`  ${creator.address} (${creator.share}%)${creator.verified ? ' verified' : ''}`)
      }
    }

    if (offChain) {
      header('Off-chain Metadata')
      keyValue('Description', String((offChain as any).description || 'N/A'))
      keyValue('Image', String((offChain as any).image || 'N/A'))
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy nfts <collection>
 */
export async function legacyNfts(collection: string, options: {
  limit?: string
  page?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { getNFTsInCollection } = await import('../../legacy/metadata')

    const limit = parseInt(options.limit || '50')
    const page = parseInt(options.page || '1')

    const result = await withSpinner(
      `Fetching NFTs in collection ${collection}`,
      () => getNFTsInCollection(collection, config, { limit, page })
    )

    if (result.items.length === 0) {
      info('No NFTs found in collection')
      return
    }

    header(`Found ${result.total} NFT(s) (page ${result.page})`)
    for (const nft of result.items) {
      info(nft.name)
      keyValue('  Mint', nft.mint)
      if (nft.owner) keyValue('  Owner', nft.owner)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy update <mint>
 */
export async function legacyUpdate(mint: string, options: {
  name?: string
  symbol?: string
  uri?: string
  royalty?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { updateLegacyNFTMetadata } = await import('../../legacy/metadata')

    const updates: Record<string, unknown> = {}
    if (options.name) updates.name = options.name
    if (options.symbol) updates.symbol = options.symbol
    if (options.uri) updates.uri = options.uri
    if (options.royalty) updates.sellerFeeBasisPoints = parseInt(options.royalty)

    if (Object.keys(updates).length === 0) {
      error('At least one update option is required (--name, --symbol, --uri, --royalty)')
      process.exit(1)
    }

    const result = await withSpinner(`Updating NFT ${mint}`, () =>
      updateLegacyNFTMetadata(mint, updates as any, config),
      'NFT updated successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy batch-update <collection>
 */
export async function legacyBatchUpdate(collection: string, options: {
  uri?: string
  royalty?: string
  limit?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { getNFTsInCollection } = await import('../../legacy/metadata')
    const { batchUpdateNFTMetadata } = await import('../../legacy/metadata')

    const limit = parseInt(options.limit || '100')
    const nfts = await withSpinner(
      `Fetching NFTs in collection ${collection}`,
      () => getNFTsInCollection(collection, config, { limit })
    )

    if (nfts.items.length === 0) {
      info('No NFTs found in collection')
      return
    }

    const updates: Record<string, unknown> = {}
    if (options.uri) updates.uri = options.uri
    if (options.royalty) updates.sellerFeeBasisPoints = parseInt(options.royalty)

    const items = nfts.items.map(nft => ({
      mint: nft.mint,
      updates,
    }))

    const result = await withSpinner(
      `Updating ${items.length} NFTs`,
      () => batchUpdateNFTMetadata(items as any, config, {
        onProgress: (done, total) => {
          // Progress is tracked by spinner
        },
      }),
      'Batch update complete'
    )

    keyValue('Successful', String(result.successful))
    keyValue('Failed', String(result.failed))
    keyValue('Total', String(result.total))

    if (result.errors.length > 0) {
      header('Errors')
      for (const err of result.errors.slice(0, 10)) {
        info(`  ${err.mint}: ${err.error}`)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy authority <collection>
 */
export async function legacyAuthority(collection: string, options: {
  transfer?: string
  set?: string
  revoke?: string
}): Promise<void> {
  try {
    const config = await getConfig()

    if (options.transfer) {
      const { transferUpdateAuthority } = await import('../../legacy/authority')
      const result = await withSpinner(
        `Transferring authority to ${options.transfer}`,
        () => transferUpdateAuthority(collection, options.transfer!, config),
        'Authority transferred'
      )
      keyValue('Signature', result.signature)
      return
    }

    if (options.set) {
      const { setCollectionAuthority } = await import('../../legacy/authority')
      const result = await withSpinner(
        `Setting collection authority ${options.set}`,
        () => setCollectionAuthority(collection, options.set!, config),
        'Collection authority set'
      )
      keyValue('Signature', result.signature)
      return
    }

    if (options.revoke) {
      const { revokeCollectionAuthority } = await import('../../legacy/authority')
      const result = await withSpinner(
        `Revoking collection authority ${options.revoke}`,
        () => revokeCollectionAuthority(collection, options.revoke!, config),
        'Collection authority revoked'
      )
      keyValue('Signature', result.signature)
      return
    }

    // Default: show authorities
    const { getCollectionAuthorities } = await import('../../legacy/authority')
    const authorities = await withSpinner(
      `Fetching authorities for ${collection}`,
      () => getCollectionAuthorities(collection, config)
    )

    header('Collection Authorities')
    keyValue('Update Authority', authorities.updateAuthority)
    if (authorities.delegatedAuthorities.length > 0) {
      info('Delegated Authorities:')
      for (const auth of authorities.delegatedAuthorities) {
        info(`  ${auth}`)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy verify <nft> <collection>
 */
export async function legacyVerify(nft: string, collection: string): Promise<void> {
  try {
    const config = await getConfig()
    const { verifyNFTInCollection } = await import('../../legacy/verification')

    const result = await withSpinner(
      `Verifying NFT ${nft} in collection ${collection}`,
      () => verifyNFTInCollection(nft, collection, config),
      'NFT verified in collection'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy royalty <mint> [new-bps]
 */
export async function legacyRoyalty(mint: string, newBps?: string): Promise<void> {
  try {
    const config = await getConfig()

    if (newBps) {
      const { updateRoyalty } = await import('../../legacy/royalty')
      const bps = parseInt(newBps)
      const result = await withSpinner(
        `Updating royalty to ${bps / 100}%`,
        () => updateRoyalty(mint, bps, config),
        'Royalty updated'
      )
      keyValue('Signature', result.signature)
      return
    }

    // Show current royalty
    const { getRoyaltyInfo } = await import('../../legacy/royalty')
    const royalty = await withSpinner(
      `Fetching royalty info for ${mint}`,
      () => getRoyaltyInfo(mint, config)
    )

    header('Royalty Information')
    keyValue('Basis Points', String(royalty.basisPoints))
    keyValue('Percentage', `${royalty.percentage}%`)
    keyValue('Primary Sale', String(royalty.primarySaleHappened))

    if (royalty.creators.length > 0) {
      info('Creators:')
      for (const creator of royalty.creators) {
        info(`  ${creator.address} (${creator.share}%)${creator.verified ? ' verified' : ''}`)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy creators <mint>
 */
export async function legacyCreators(mint: string, options: {
  verify?: boolean
  update?: string
}): Promise<void> {
  try {
    const config = await getConfig()

    if (options.verify) {
      const { verifyCreator } = await import('../../legacy/authority')
      const result = await withSpinner(
        `Verifying creator on ${mint}`,
        () => verifyCreator(mint, config),
        'Creator verified'
      )
      keyValue('Signature', result.signature)
      return
    }

    // Show creators
    const { getRoyaltyInfo } = await import('../../legacy/royalty')
    const royalty = await getRoyaltyInfo(mint, config)

    header('Creators')
    if (royalty.creators.length === 0) {
      info('No creators found')
      return
    }

    for (const creator of royalty.creators) {
      info(`${creator.address}`)
      keyValue('  Share', `${creator.share}%`)
      keyValue('  Verified', String(creator.verified))
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy burn <mint>
 */
export async function legacyBurn(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { burnNFT } = await import('../../legacy/burn')

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

/**
 * tokens legacy snapshot <collection>
 */
export async function legacySnapshot(collection: string, options: {
  format?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { getHolderSnapshot } = await import('../../legacy/analytics')

    const holders = await withSpinner(
      `Taking holder snapshot for ${collection}`,
      () => getHolderSnapshot(collection, config),
      'Snapshot complete'
    )

    if (options.format === 'csv') {
      const { exportHoldersToCSV } = await import('../../legacy/export')
      console.log(exportHoldersToCSV(holders))
      return
    }

    header(`Holder Snapshot (${holders.length} unique holders)`)
    for (const holder of holders.slice(0, 50)) {
      keyValue(holder.owner, `${holder.count} NFT(s)`)
    }

    if (holders.length > 50) {
      info(`... and ${holders.length - 50} more holders`)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy export <collection>
 */
export async function legacyExport(collection: string, options: {
  format?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { exportCollectionData } = await import('../../legacy/analytics')
    const { ExportFormat } = await import('../../types/legacy')

    let format = ExportFormat.JSON
    if (options.format === 'csv') format = ExportFormat.CSV
    if (options.format === 'metaplex') format = ExportFormat.Metaplex

    const data = await withSpinner(
      `Exporting collection ${collection}`,
      () => exportCollectionData(collection, format, config),
      'Export complete'
    )

    console.log(data)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy cm-info <candy-machine>
 */
export async function legacyCmInfo(candyMachine: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getCandyMachineInfo } = await import('../../legacy/candy-machine')

    const cmInfo = await withSpinner(
      `Fetching Candy Machine info for ${candyMachine}`,
      () => getCandyMachineInfo(candyMachine, config)
    )

    header('Candy Machine Information')
    keyValue('Address', cmInfo.address)
    keyValue('Version', cmInfo.version)
    keyValue('Authority', cmInfo.authority)
    keyValue('Collection Mint', cmInfo.collectionMint || 'N/A')
    keyValue('Items Available', String(cmInfo.itemsAvailable))
    keyValue('Items Redeemed', String(cmInfo.itemsRedeemed))
    keyValue('Symbol', cmInfo.symbol || 'N/A')
    keyValue('Royalty', `${cmInfo.sellerFeeBasisPoints / 100}%`)
    keyValue('Mutable', String(cmInfo.isMutable))

    if (cmInfo.creators.length > 0) {
      info('Creators:')
      for (const creator of cmInfo.creators) {
        info(`  ${creator.address} (${creator.share}%)${creator.verified ? ' verified' : ''}`)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * tokens legacy cm-withdraw <candy-machine>
 */
export async function legacyCmWithdraw(candyMachine: string): Promise<void> {
  try {
    const config = await getConfig()
    const { withdrawCandyMachineFunds } = await import('../../legacy/candy-machine')

    const result = await withSpinner(
      `Withdrawing funds from Candy Machine ${candyMachine}`,
      () => withdrawCandyMachineFunds(candyMachine, config),
      'Funds withdrawn successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
