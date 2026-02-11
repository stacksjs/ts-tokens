import {
  candyCreate, candyAdd, candyMint, candyInfo,
  candyWithdraw, candyDelete, candyUpload, candyGuards,
} from '../../src/cli/commands/candy-machine'

export function register(cli: any): void {
  cli
    .command('candy:create', 'Create a Candy Machine')
    .option('--items <n>', 'Number of items available')
    .option('--symbol <symbol>', 'Collection symbol')
    .option('--royalty <bps>', 'Royalty in basis points')
    .option('--collection <address>', 'Collection NFT address')
    .option('--config <path>', 'Load candy machine config from JSON file')
    .action(async (options: any) => {
      await candyCreate(options)
    })

  cli
    .command('candy:add <candy-machine> <items-file>', 'Add config lines from JSON file')
    .action(async (candyMachine: string, itemsFile: string) => {
      await candyAdd(candyMachine, itemsFile)
    })

  cli
    .command('candy:mint <candy-machine>', 'Mint from Candy Machine')
    .option('--count <n>', 'Number to mint', '1')
    .action(async (candyMachine: string, options: { count?: string }) => {
      await candyMint(candyMachine, options)
    })

  cli
    .command('candy:info <candy-machine>', 'Show Candy Machine information')
    .action(async (candyMachine: string) => {
      await candyInfo(candyMachine)
    })

  cli
    .command('candy:withdraw <candy-machine>', 'Withdraw funds from Candy Machine')
    .action(async (candyMachine: string) => {
      await candyWithdraw(candyMachine)
    })

  cli
    .command('candy:delete <candy-machine>', 'Delete Candy Machine and reclaim rent')
    .action(async (candyMachine: string) => {
      await candyDelete(candyMachine)
    })

  cli
    .command('candy:upload <path>', 'Upload assets and create config lines')
    .option('--storage <provider>', 'Storage provider (arweave/ipfs/shadow)', 'arweave')
    .action(async (assetsPath: string, options: { storage?: string }) => {
      await candyUpload(assetsPath, options)
    })

  cli
    .command('candy:guards <candy-machine>', 'Show Candy Machine guards')
    .action(async (candyMachine: string) => {
      await candyGuards(candyMachine)
    })
}
