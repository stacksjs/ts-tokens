import {
  legacyImport, legacyInfo, legacyNfts, legacyUpdate, legacyBatchUpdate,
  legacyAuthority, legacyVerify, legacyRoyalty, legacyCreators, legacyBurn,
  legacySnapshot, legacyExport, legacyCmInfo, legacyCmWithdraw,
} from '../../src/cli/commands/legacy'

export function register(cli: any): void {
  cli
    .command('legacy:import <collection>', 'Import a legacy (Metaplex) collection')
    .action(async (collection: string) => {
      await legacyImport(collection)
    })

  cli
    .command('legacy:info <collection>', 'Show legacy collection information')
    .action(async (collection: string) => {
      await legacyInfo(collection)
    })

  cli
    .command('legacy:nfts <collection>', 'List NFTs in a legacy collection')
    .option('--limit <n>', 'Maximum items to list', { default: '50' })
    .option('--page <n>', 'Page number', { default: '1' })
    .action(async (collection: string, options: any) => {
      await legacyNfts(collection, options)
    })

  cli
    .command('legacy:update <mint>', 'Update legacy NFT metadata')
    .option('--name <name>', 'New name')
    .option('--symbol <symbol>', 'New symbol')
    .option('--uri <uri>', 'New metadata URI')
    .option('--royalty <bps>', 'New royalty in basis points')
    .action(async (mint: string, options: any) => {
      await legacyUpdate(mint, options)
    })

  cli
    .command('legacy:batch-update <collection>', 'Batch-update NFTs in a legacy collection')
    .option('--uri <uri>', 'New metadata URI')
    .option('--royalty <bps>', 'New royalty in basis points')
    .option('--limit <n>', 'Maximum items to update', { default: '100' })
    .action(async (collection: string, options: any) => {
      await legacyBatchUpdate(collection, options)
    })

  cli
    .command('legacy:authority <collection>', 'Manage legacy collection update authority')
    .option('--transfer <address>', 'Transfer update authority to address')
    .option('--set <address>', 'Set update authority')
    .option('--revoke <address>', 'Revoke update authority')
    .action(async (collection: string, options: any) => {
      await legacyAuthority(collection, options)
    })

  cli
    .command('legacy:verify <nft> <collection>', 'Verify an NFT as part of a collection')
    .action(async (nft: string, collection: string) => {
      await legacyVerify(nft, collection)
    })

  cli
    .command('legacy:royalty <mint> [newBps]', 'Show or update royalty on a legacy NFT')
    .action(async (mint: string, newBps?: string) => {
      await legacyRoyalty(mint, newBps)
    })

  cli
    .command('legacy:creators <mint>', 'Manage creators on a legacy NFT')
    .option('--verify', 'Verify the current wallet as a creator')
    .option('--update <creators>', 'Update creators (JSON)')
    .action(async (mint: string, options: any) => {
      await legacyCreators(mint, options)
    })

  cli
    .command('legacy:burn <mint>', 'Burn a legacy NFT')
    .action(async (mint: string) => {
      await legacyBurn(mint)
    })

  cli
    .command('legacy:snapshot <collection>', 'Take a holder snapshot of a legacy collection')
    .option('--format <format>', 'Output format')
    .action(async (collection: string, options: any) => {
      await legacySnapshot(collection, options)
    })

  cli
    .command('legacy:export <collection>', 'Export legacy collection data')
    .option('--format <format>', 'Export format (json/csv/metaplex)', { default: 'json' })
    .action(async (collection: string, options: any) => {
      await legacyExport(collection, options)
    })

  cli
    .command('legacy:cm-info <candyMachine>', 'Show legacy Candy Machine information')
    .action(async (candyMachine: string) => {
      await legacyCmInfo(candyMachine)
    })

  cli
    .command('legacy:cm-withdraw <candyMachine>', 'Withdraw from a legacy Candy Machine')
    .action(async (candyMachine: string) => {
      await legacyCmWithdraw(candyMachine)
    })
}
