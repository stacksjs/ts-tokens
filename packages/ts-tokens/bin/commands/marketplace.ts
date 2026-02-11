import {
  nftSell, nftDelist, nftBuy, nftOffer, nftAuction, nftBid, nftSettle,
  marketplaceListings, marketplaceAuctions, marketplaceOffers, marketplaceCleanup,
} from '../../src/cli/commands/marketplace'

export function register(cli: any): void {
  cli
    .command('nft:sell <mint>', 'List an NFT for sale')
    .option('--price <sol>', 'Price in SOL', '1')
    .option('--expiry <hours>', 'Expiry in hours')
    .option('--escrow', 'Use escrow-based sale')
    .action(async (mint: string, options: { price?: string; expiry?: string; escrow?: boolean }) => {
      await nftSell(mint, options)
    })

  cli
    .command('nft:delist <mint>', 'Cancel an NFT listing')
    .action(async (mint: string) => {
      await nftDelist(mint)
    })

  cli
    .command('nft:buy <mint>', 'Purchase a listed NFT')
    .action(async (mint: string) => {
      await nftBuy(mint)
    })

  cli
    .command('nft:offer <mint>', 'Make an offer on an NFT')
    .option('--price <sol>', 'Offer price in SOL', '1')
    .option('--expiry <hours>', 'Expiry in hours')
    .action(async (mint: string, options: { price?: string; expiry?: string }) => {
      await nftOffer(mint, options)
    })

  cli
    .command('nft:auction <mint>', 'Create an auction for an NFT')
    .option('--type <type>', 'Auction type (english or dutch)', 'english')
    .option('--start <sol>', 'Starting price in SOL', '1')
    .option('--reserve <sol>', 'Reserve price in SOL')
    .option('--duration <hours>', 'Duration in hours', '24')
    .option('--decrement <sol>', 'Price decrement for Dutch auctions')
    .option('--interval <minutes>', 'Decrement interval in minutes for Dutch auctions')
    .action(async (mint: string, options: any) => {
      await nftAuction(mint, options)
    })

  cli
    .command('nft:bid <auction-id>', 'Place a bid on an auction')
    .option('--price <sol>', 'Bid price in SOL')
    .action(async (auctionId: string, options: { price?: string }) => {
      await nftBid(auctionId, options)
    })

  cli
    .command('nft:settle <auction-id>', 'Settle an ended auction')
    .action(async (auctionId: string) => {
      await nftSettle(auctionId)
    })

  cli
    .command('marketplace:listings', 'Show active listings')
    .option('--mine', 'Show only my listings')
    .action(async (options: { mine?: boolean }) => {
      await marketplaceListings(options)
    })

  cli
    .command('marketplace:auctions', 'Show active auctions')
    .option('--mine', 'Show only my auctions')
    .action(async (options: { mine?: boolean }) => {
      await marketplaceAuctions(options)
    })

  cli
    .command('marketplace:offers [mint]', 'Show offers for an NFT')
    .option('--mine', 'Show only my offers')
    .action(async (mint: string | undefined, options: { mine?: boolean }) => {
      await marketplaceOffers(mint, options)
    })

  cli
    .command('marketplace:cleanup', 'Clean up expired marketplace records')
    .action(async () => {
      await marketplaceCleanup()
    })
}
