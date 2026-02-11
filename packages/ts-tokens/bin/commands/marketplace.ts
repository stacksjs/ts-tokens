import { getConfig } from '../../src/config'

export function register(cli: any): void {
  // Batch Recovery Commands

  cli
    .command('batch:retry <recovery-file>', 'Retry failed items from recovery state')
    .action(async (recoveryFile: string) => {
      const { loadRecoveryState, getRetryItems, formatRecoverySummary } = await import('../../src/batch/recovery')

      try {
        const state = loadRecoveryState(recoveryFile)
        const retryItems = getRetryItems(state)

        if (retryItems.length === 0) {
          console.log('No failed items to retry')
          console.log(formatRecoverySummary(state))
          return
        }

        console.log(`Found ${retryItems.length} failed item(s) to retry:`)
        for (const item of retryItems) {
          console.log(`  #${item.index} ${item.recipient}: ${item.error}`)
        }
        console.log('\nTo retry, re-run the batch operation with these recipients.')
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('batch:status <recovery-file>', 'Show batch operation status')
    .action(async (recoveryFile: string) => {
      const { loadRecoveryState, formatRecoverySummary } = await import('../../src/batch/recovery')

      try {
        const state = loadRecoveryState(recoveryFile)
        console.log(formatRecoverySummary(state))
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  // Marketplace & Trading Commands

  cli
    .command('nft:sell <mint>', 'List an NFT for sale')
    .option('--price <sol>', 'Price in SOL', '1')
    .option('--expiry <hours>', 'Expiry in hours')
    .option('--escrow', 'Use escrow-based sale')
    .action(async (mint: string, options: { price?: string; expiry?: string; escrow?: boolean }) => {
      const config = await getConfig()
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const mintPubkey = new PublicKey(mint)
        const priceLamports = BigInt(Math.round(Number.parseFloat(options.price || '1') * 1e9))
        const expiry = options.expiry ? Date.now() + Number.parseFloat(options.expiry) * 3600000 : undefined

        if (options.escrow) {
          const { createEscrow } = await import('../../src/marketplace/escrow')
          const escrow = await createEscrow({ mint: mintPubkey, price: priceLamports, expiry }, config)
          console.log('\u2713 NFT deposited into escrow')
          console.log(`  Escrow ID: ${escrow.id}`)
          console.log(`  Price: ${options.price} SOL`)
          console.log(`  Mint: ${mint}`)
        } else {
          const { listNFT } = await import('../../src/marketplace/listing')
          const listing = await listNFT({ mint: mintPubkey, price: priceLamports, expiry }, config)
          console.log('\u2713 NFT listed for sale')
          console.log(`  Listing ID: ${listing.id}`)
          console.log(`  Price: ${options.price} SOL`)
          console.log(`  Mint: ${mint}`)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('nft:delist <mint>', 'Cancel an NFT listing')
    .action(async (mint: string) => {
      const config = await getConfig()
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const { delistNFT } = await import('../../src/marketplace/listing')
        await delistNFT(new PublicKey(mint), config)
        console.log('\u2713 NFT delisted')
        console.log(`  Mint: ${mint}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('nft:buy <mint>', 'Purchase a listed NFT')
    .action(async (mint: string) => {
      const config = await getConfig()
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const { buyListedNFT } = await import('../../src/marketplace/listing')
        const result = await buyListedNFT(new PublicKey(mint), config)
        console.log('\u2713 NFT purchased')
        console.log(`  Signature: ${result.signature}`)
        console.log(`  Mint: ${mint}`)
        console.log(`  Price: ${Number(result.listing.price) / 1e9} SOL`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('nft:offer <mint>', 'Make an offer on an NFT')
    .option('--price <sol>', 'Offer price in SOL', '1')
    .option('--expiry <hours>', 'Expiry in hours')
    .action(async (mint: string, options: { price?: string; expiry?: string }) => {
      const config = await getConfig()
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const { makeOffer } = await import('../../src/marketplace/offers')
        const mintPubkey = new PublicKey(mint)
        const priceLamports = BigInt(Math.round(Number.parseFloat(options.price || '1') * 1e9))
        const expiry = options.expiry ? Date.now() + Number.parseFloat(options.expiry) * 3600000 : undefined

        const offer = await makeOffer({ mint: mintPubkey, price: priceLamports, expiry }, config)
        console.log('\u2713 Offer created')
        console.log(`  Offer ID: ${offer.id}`)
        console.log(`  Mint: ${mint}`)
        console.log(`  Price: ${options.price} SOL`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('nft:auction <mint>', 'Create an auction for an NFT')
    .option('--type <type>', 'Auction type (english or dutch)', 'english')
    .option('--start <sol>', 'Starting price in SOL', '1')
    .option('--reserve <sol>', 'Reserve price in SOL')
    .option('--duration <hours>', 'Duration in hours', '24')
    .option('--decrement <sol>', 'Price decrement for Dutch auctions')
    .option('--interval <minutes>', 'Decrement interval in minutes for Dutch auctions')
    .action(async (mint: string, options: {
      type?: string
      start?: string
      reserve?: string
      duration?: string
      decrement?: string
      interval?: string
    }) => {
      const config = await getConfig()
      const { PublicKey } = await import('@solana/web3.js')

      try {
        const { createAuction } = await import('../../src/marketplace/auction')
        const mintPubkey = new PublicKey(mint)
        const startPrice = BigInt(Math.round(Number.parseFloat(options.start || '1') * 1e9))
        const reservePrice = options.reserve ? BigInt(Math.round(Number.parseFloat(options.reserve) * 1e9)) : undefined
        const duration = Number.parseFloat(options.duration || '24') * 3600000
        const priceDecrement = options.decrement ? BigInt(Math.round(Number.parseFloat(options.decrement) * 1e9)) : undefined
        const decrementInterval = options.interval ? Number.parseFloat(options.interval) * 60000 : undefined
        const auctionType = (options.type === 'dutch' ? 'dutch' : 'english') as 'english' | 'dutch'

        const auction = await createAuction({
          mint: mintPubkey,
          type: auctionType,
          startPrice,
          reservePrice,
          duration,
          priceDecrement,
          decrementInterval,
        }, config)

        console.log(`\u2713 ${auctionType.charAt(0).toUpperCase() + auctionType.slice(1)} auction created`)
        console.log(`  Auction ID: ${auction.id}`)
        console.log(`  Mint: ${mint}`)
        console.log(`  Start Price: ${options.start} SOL`)
        if (reservePrice) console.log(`  Reserve: ${options.reserve} SOL`)
        console.log(`  Ends: ${new Date(auction.endTime).toISOString()}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('nft:bid <auction-id>', 'Place a bid on an auction')
    .option('--price <sol>', 'Bid price in SOL')
    .action(async (auctionId: string, options: { price?: string }) => {
      const config = await getConfig()

      try {
        if (!options.price) {
          console.error('Error: --price is required')
          process.exit(1)
        }

        const { placeBid } = await import('../../src/marketplace/auction')
        const amount = BigInt(Math.round(Number.parseFloat(options.price) * 1e9))

        const auction = placeBid({ auctionId, amount }, config)
        console.log('\u2713 Bid placed')
        console.log(`  Auction: ${auctionId}`)
        console.log(`  Bid: ${options.price} SOL`)
        console.log(`  Highest Bid: ${auction.highestBid ? Number(auction.highestBid) / 1e9 : 0} SOL`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('nft:settle <auction-id>', 'Settle an ended auction')
    .action(async (auctionId: string) => {
      const config = await getConfig()

      try {
        const { getAuctionInfo, settleAuction, buyDutchAuction } = await import('../../src/marketplace/auction')
        const auction = getAuctionInfo(auctionId)

        if (!auction) {
          console.error(`Auction not found: ${auctionId}`)
          process.exit(1)
        }

        if (auction.type === 'dutch') {
          const result = await buyDutchAuction(auctionId, config)
          console.log('\u2713 Dutch auction purchased')
          console.log(`  Signature: ${result.signature}`)
          console.log(`  Price: ${Number(result.price) / 1e9} SOL`)
        } else {
          const result = await settleAuction(auctionId, config)
          console.log('\u2713 Auction settled')
          console.log(`  Signature: ${result.signature}`)
          console.log(`  Winner: ${result.auction.highestBidder?.toBase58()}`)
          console.log(`  Price: ${result.auction.highestBid ? Number(result.auction.highestBid) / 1e9 : 0} SOL`)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('marketplace:listings', 'Show active listings')
    .option('--mine', 'Show only my listings')
    .action(async (options: { mine?: boolean }) => {
      const config = await getConfig()

      try {
        const { getActiveListings } = await import('../../src/marketplace/listing')
        let listings = getActiveListings()

        if (options.mine) {
          const { getPublicKey } = await import('../../src/drivers/solana/wallet')
          const pubkey = getPublicKey(config)
          listings = listings.filter(l => l.seller.toBase58() === pubkey)
        }

        if (listings.length === 0) {
          console.log('No active listings')
          return
        }

        console.log(`Active Listings (${listings.length}):`)
        for (const listing of listings) {
          console.log(`  ${listing.id}`)
          console.log(`    Mint: ${listing.mint.toBase58()}`)
          console.log(`    Price: ${Number(listing.price) / 1e9} SOL`)
          console.log(`    Seller: ${listing.seller.toBase58()}`)
          if (listing.expiry) console.log(`    Expires: ${new Date(listing.expiry).toISOString()}`)
          console.log('')
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('marketplace:auctions', 'Show active auctions')
    .option('--mine', 'Show only my auctions')
    .action(async (options: { mine?: boolean }) => {
      const config = await getConfig()

      try {
        const { getActiveAuctions } = await import('../../src/marketplace/auction')
        let auctions = getActiveAuctions()

        if (options.mine) {
          const { getPublicKey } = await import('../../src/drivers/solana/wallet')
          const pubkey = getPublicKey(config)
          auctions = auctions.filter(a => a.seller.toBase58() === pubkey)
        }

        if (auctions.length === 0) {
          console.log('No active auctions')
          return
        }

        console.log(`Active Auctions (${auctions.length}):`)
        for (const auction of auctions) {
          console.log(`  ${auction.id} (${auction.type})`)
          console.log(`    Mint: ${auction.mint.toBase58()}`)
          console.log(`    Start Price: ${Number(auction.startPrice) / 1e9} SOL`)
          if (auction.highestBid) console.log(`    Highest Bid: ${Number(auction.highestBid) / 1e9} SOL`)
          console.log(`    Ends: ${new Date(auction.endTime).toISOString()}`)
          console.log(`    Bids: ${auction.bids.length}`)
          console.log('')
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('marketplace:offers [mint]', 'Show offers for an NFT')
    .option('--mine', 'Show only my offers')
    .action(async (mint: string | undefined, options: { mine?: boolean }) => {
      const config = await getConfig()

      try {
        if (mint) {
          const { getOffersForNFT } = await import('../../src/marketplace/offers')
          const offers = getOffersForNFT(mint)

          if (offers.length === 0) {
            console.log(`No active offers for ${mint}`)
            return
          }

          console.log(`Offers for ${mint} (${offers.length}):`)
          for (const offer of offers) {
            console.log(`  ${offer.id}`)
            console.log(`    Bidder: ${offer.bidder.toBase58()}`)
            console.log(`    Price: ${Number(offer.price) / 1e9} SOL`)
            if (offer.expiry) console.log(`    Expires: ${new Date(offer.expiry).toISOString()}`)
            console.log('')
          }
        } else if (options.mine) {
          const { loadState } = await import('../../src/marketplace/store')
          const { getPublicKey } = await import('../../src/drivers/solana/wallet')
          const pubkey = getPublicKey(config)
          const state = loadState()
          const myOffers = Object.values(state.offers)
            .filter(o => o.bidder === pubkey && o.status === 'active')

          if (myOffers.length === 0) {
            console.log('No active offers')
            return
          }

          console.log(`My Offers (${myOffers.length}):`)
          for (const offer of myOffers) {
            console.log(`  ${offer.id}`)
            console.log(`    Mint: ${offer.mint}`)
            console.log(`    Price: ${Number(BigInt(offer.price)) / 1e9} SOL`)
            console.log('')
          }
        } else {
          console.log('Provide a mint address or use --mine to see your offers')
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('marketplace:cleanup', 'Clean up expired marketplace records')
    .action(async () => {
      try {
        const { cleanupExpired } = await import('../../src/marketplace/store')
        const result = cleanupExpired()
        const total = result.listings + result.offers + result.escrows + result.auctions

        if (total === 0) {
          console.log('No expired records found')
          return
        }

        console.log('\u2713 Cleaned up expired records:')
        if (result.listings > 0) console.log(`  Listings: ${result.listings}`)
        if (result.offers > 0) console.log(`  Offers: ${result.offers}`)
        if (result.escrows > 0) console.log(`  Escrows: ${result.escrows}`)
        if (result.auctions > 0) console.log(`  Auctions: ${result.auctions}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
