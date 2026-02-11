import {
  nftCreate, nftMint, nftTransfer, nftBurn, nftInfo, nftList,
  collectionCreate, collectionInfo, collectionItems, collectionVerify, collectionUpdate,
  coreCreate, coreCollection, coreTransfer, coreInfo,
} from '../../src/cli/commands/nft'

export function register(cli: any): void {
  cli
    .command('nft:create', 'Create a single NFT')
    .option('--name <name>', 'NFT name')
    .option('--symbol <symbol>', 'NFT symbol')
    .option('--uri <uri>', 'Metadata URI')
    .option('--collection <address>', 'Collection address')
    .option('--royalty <bps>', 'Royalty in basis points (e.g., 500 = 5%)')
    .action(async (options: any) => {
      await nftCreate(options)
    })

  cli
    .command('nft:transfer <mint> <to>', 'Transfer an NFT')
    .action(async (mint: string, to: string) => {
      await nftTransfer(mint, to)
    })

  cli
    .command('nft:burn <mint>', 'Burn an NFT')
    .action(async (mint: string) => {
      await nftBurn(mint)
    })

  cli
    .command('nft:info <mint>', 'Show NFT information')
    .action(async (mint: string) => {
      await nftInfo(mint)
    })

  cli
    .command('collection:create', 'Create an NFT collection')
    .option('--name <name>', 'Collection name')
    .option('--symbol <symbol>', 'Collection symbol')
    .option('--uri <uri>', 'Metadata URI')
    .option('--royalty <bps>', 'Royalty in basis points (e.g., 500 = 5%)')
    .action(async (options: any) => {
      await collectionCreate(options)
    })

  cli
    .command('nft:list [owner]', 'List NFTs owned by address')
    .action(async (owner?: string) => {
      await nftList(owner)
    })

  cli
    .command('nft:mint <uri>', 'Mint an NFT from metadata URI')
    .option('--name <name>', 'NFT name')
    .option('--symbol <symbol>', 'NFT symbol')
    .option('--royalty <bps>', 'Royalty in basis points')
    .option('--collection <address>', 'Collection address')
    .action(async (uri: string, options: any) => {
      await nftMint(uri, options)
    })

  cli
    .command('collection:info <address>', 'Show collection information')
    .action(async (address: string) => {
      await collectionInfo(address)
    })

  cli
    .command('collection:items <address>', 'List NFTs in a collection')
    .option('--limit <limit>', 'Maximum items to list', '50')
    .action(async (address: string, options: { limit?: string }) => {
      await collectionItems(address, options)
    })

  cli
    .command('collection:verify <collection> <nft>', 'Verify an NFT belongs to a collection')
    .action(async (collection: string, nft: string) => {
      await collectionVerify(collection, nft)
    })

  cli
    .command('core:create', 'Create an MPL Core asset')
    .option('--name <name>', 'Asset name')
    .option('--uri <uri>', 'Metadata URI')
    .option('--collection <address>', 'Collection address')
    .option('--owner <address>', 'Owner address')
    .action(async (options: any) => {
      await coreCreate(options)
    })

  cli
    .command('core:collection', 'Create an MPL Core collection')
    .option('--name <name>', 'Collection name')
    .option('--uri <uri>', 'Metadata URI')
    .action(async (options: any) => {
      await coreCollection(options)
    })

  cli
    .command('core:transfer <asset> <to>', 'Transfer an MPL Core asset')
    .option('--collection <address>', 'Collection address')
    .action(async (asset: string, to: string, options: { collection?: string }) => {
      await coreTransfer(asset, to, options)
    })

  cli
    .command('core:info <address>', 'Show MPL Core asset information')
    .action(async (address: string) => {
      await coreInfo(address)
    })

  cli
    .command('collection:update <address>', 'Update collection metadata')
    .option('--name <name>', 'New collection name')
    .option('--symbol <symbol>', 'New symbol')
    .option('--uri <uri>', 'New metadata URI')
    .action(async (address: string, options: { name?: string; symbol?: string; uri?: string }) => {
      await collectionUpdate(address, options)
    })
}
