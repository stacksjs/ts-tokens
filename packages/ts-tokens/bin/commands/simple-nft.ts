import {
  simpleNftCreate, simpleNftInfo, simpleNftTransfer, simpleNftBurn,
  simpleCollectionCreate, simpleCollectionAdd, simpleEditionsCreate,
} from '../../src/cli/commands/simple-nft'

export function register(cli: any): void {
  cli
    .command('simple-nft:create', 'Create a simple NFT')
    .option('--name <name>', 'NFT name')
    .option('--image <path>', 'Image file path')
    .option('--symbol <symbol>', 'NFT symbol')
    .option('--description <text>', 'NFT description')
    .option('--royalty <bps>', 'Royalty in basis points')
    .option('--collection <address>', 'Collection address')
    .option('--mutable', 'Make the NFT mutable')
    .action(async (options: any) => {
      await simpleNftCreate(options)
    })

  cli
    .command('simple-nft:info <mint>', 'Show simple NFT information')
    .action(async (mint: string) => {
      await simpleNftInfo(mint)
    })

  cli
    .command('simple-nft:transfer <mint> <to>', 'Transfer a simple NFT')
    .action(async (mint: string, to: string) => {
      await simpleNftTransfer(mint, to)
    })

  cli
    .command('simple-nft:burn <mint>', 'Burn a simple NFT')
    .action(async (mint: string) => {
      await simpleNftBurn(mint)
    })

  cli
    .command('simple-collection:create', 'Create a simple NFT collection')
    .option('--name <name>', 'Collection name')
    .option('--image <path>', 'Image file path')
    .option('--symbol <symbol>', 'Collection symbol')
    .option('--description <text>', 'Collection description')
    .option('--royalty <bps>', 'Royalty in basis points')
    .action(async (options: any) => {
      await simpleCollectionCreate(options)
    })

  cli
    .command('simple-collection:add <nft> <collection>', 'Add an NFT to a collection')
    .action(async (nft: string, collection: string) => {
      await simpleCollectionAdd(nft, collection)
    })

  cli
    .command('simple-editions:create <master>', 'Create a master edition for a simple NFT')
    .option('--max <n>', 'Maximum edition supply')
    .action(async (master: string, options: any) => {
      await simpleEditionsCreate(master, options)
    })
}
