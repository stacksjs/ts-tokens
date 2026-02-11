/** CLI marketplace command handlers. */

import { success, error, keyValue, header, info, formatSol, formatAddress } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function nftSell(mint: string, options: { price?: string; expiry?: string; escrow?: boolean }): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')

    const mintPubkey = new PublicKey(mint)
    const priceLamports = BigInt(Math.round(Number.parseFloat(options.price || '1') * 1e9))
    const expiry = options.expiry ? Date.now() + Number.parseFloat(options.expiry) * 3600000 : undefined

    if (options.escrow) {
      const { createEscrow } = await import('../../marketplace/escrow')
      const escrow = await withSpinner('Depositing NFT into escrow...', () =>
        createEscrow({ mint: mintPubkey, price: priceLamports, expiry }, config)
      )
      success('NFT deposited into escrow')
      keyValue('Escrow ID', escrow.id)
      keyValue('Price', `${options.price} SOL`)
      keyValue('Mint', mint)
    } else {
      const { listNFT } = await import('../../marketplace/listing')
      const listing = await withSpinner('Listing NFT for sale...', () =>
        listNFT({ mint: mintPubkey, price: priceLamports, expiry }, config)
      )
      success('NFT listed for sale')
      keyValue('Listing ID', listing.id)
      keyValue('Price', `${options.price} SOL`)
      keyValue('Mint', mint)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftDelist(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { delistNFT } = await import('../../marketplace/listing')

    await withSpinner('Delisting NFT...', () =>
      delistNFT(new PublicKey(mint), config)
    )
    success('NFT delisted')
    keyValue('Mint', mint)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftBuy(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { buyListedNFT } = await import('../../marketplace/listing')

    const result = await withSpinner('Purchasing NFT...', () =>
      buyListedNFT(new PublicKey(mint), config)
    )
    success('NFT purchased')
    keyValue('Signature', result.signature)
    keyValue('Mint', mint)
    keyValue('Price', formatSol(result.listing.price))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftOffer(mint: string, options: { price?: string; expiry?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { makeOffer } = await import('../../marketplace/offers')

    const mintPubkey = new PublicKey(mint)
    const priceLamports = BigInt(Math.round(Number.parseFloat(options.price || '1') * 1e9))
    const expiry = options.expiry ? Date.now() + Number.parseFloat(options.expiry) * 3600000 : undefined

    const offer = await withSpinner('Creating offer...', () =>
      makeOffer({ mint: mintPubkey, price: priceLamports, expiry }, config)
    )
    success('Offer created')
    keyValue('Offer ID', offer.id)
    keyValue('Mint', mint)
    keyValue('Price', `${options.price} SOL`)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftAuction(mint: string, options: {
  type?: string
  start?: string
  reserve?: string
  duration?: string
  decrement?: string
  interval?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createAuction } = await import('../../marketplace/auction')

    const mintPubkey = new PublicKey(mint)
    const startPrice = BigInt(Math.round(Number.parseFloat(options.start || '1') * 1e9))
    const reservePrice = options.reserve ? BigInt(Math.round(Number.parseFloat(options.reserve) * 1e9)) : undefined
    const duration = Number.parseFloat(options.duration || '24') * 3600000
    const priceDecrement = options.decrement ? BigInt(Math.round(Number.parseFloat(options.decrement) * 1e9)) : undefined
    const decrementInterval = options.interval ? Number.parseFloat(options.interval) * 60000 : undefined
    const auctionType = (options.type === 'dutch' ? 'dutch' : 'english') as 'english' | 'dutch'

    const auction = await withSpinner(`Creating ${auctionType} auction...`, () =>
      createAuction({
        mint: mintPubkey,
        type: auctionType,
        startPrice,
        reservePrice,
        duration,
        priceDecrement,
        decrementInterval,
      }, config)
    )

    success(`${auctionType.charAt(0).toUpperCase() + auctionType.slice(1)} auction created`)
    keyValue('Auction ID', auction.id)
    keyValue('Mint', mint)
    keyValue('Start Price', `${options.start} SOL`)
    if (reservePrice) keyValue('Reserve', `${options.reserve} SOL`)
    keyValue('Ends', new Date(auction.endTime).toISOString())
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftBid(auctionId: string, options: { price?: string }): Promise<void> {
  if (!options.price) {
    error('--price is required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { placeBid } = await import('../../marketplace/auction')

    const amount = BigInt(Math.round(Number.parseFloat(options.price) * 1e9))
    const auction = placeBid({ auctionId, amount }, config)

    success('Bid placed')
    keyValue('Auction', auctionId)
    keyValue('Bid', `${options.price} SOL`)
    keyValue('Highest Bid', `${auction.highestBid ? Number(auction.highestBid) / 1e9 : 0} SOL`)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function nftSettle(auctionId: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getAuctionInfo, settleAuction, buyDutchAuction } = await import('../../marketplace/auction')

    const auction = getAuctionInfo(auctionId)
    if (!auction) {
      error(`Auction not found: ${auctionId}`)
      process.exit(1)
    }

    if (auction.type === 'dutch') {
      const result = await withSpinner('Purchasing from Dutch auction...', () =>
        buyDutchAuction(auctionId, config)
      )
      success('Dutch auction purchased')
      keyValue('Signature', result.signature)
      keyValue('Price', formatSol(result.price))
    } else {
      const result = await withSpinner('Settling auction...', () =>
        settleAuction(auctionId, config)
      )
      success('Auction settled')
      keyValue('Signature', result.signature)
      keyValue('Winner', result.auction.highestBidder?.toBase58() ?? 'none')
      keyValue('Price', `${result.auction.highestBid ? Number(result.auction.highestBid) / 1e9 : 0} SOL`)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function marketplaceListings(options: { mine?: boolean }): Promise<void> {
  try {
    const config = await getConfig()
    const { getActiveListings } = await import('../../marketplace/listing')

    let listings = getActiveListings()

    if (options.mine) {
      const { getPublicKey } = await import('../../drivers/solana/wallet')
      const pubkey = getPublicKey(config)
      listings = listings.filter(l => l.seller.toBase58() === pubkey)
    }

    if (listings.length === 0) {
      info('No active listings')
      return
    }

    header(`Active Listings (${listings.length})`)
    for (const listing of listings) {
      keyValue('ID', listing.id)
      keyValue('Mint', formatAddress(listing.mint.toBase58()))
      keyValue('Price', formatSol(listing.price))
      keyValue('Seller', formatAddress(listing.seller.toBase58()))
      if (listing.expiry) keyValue('Expires', new Date(listing.expiry).toISOString())
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function marketplaceAuctions(options: { mine?: boolean }): Promise<void> {
  try {
    const config = await getConfig()
    const { getActiveAuctions } = await import('../../marketplace/auction')

    let auctions = getActiveAuctions()

    if (options.mine) {
      const { getPublicKey } = await import('../../drivers/solana/wallet')
      const pubkey = getPublicKey(config)
      auctions = auctions.filter(a => a.seller.toBase58() === pubkey)
    }

    if (auctions.length === 0) {
      info('No active auctions')
      return
    }

    header(`Active Auctions (${auctions.length})`)
    for (const auction of auctions) {
      keyValue('ID', `${auction.id} (${auction.type})`)
      keyValue('Mint', formatAddress(auction.mint.toBase58()))
      keyValue('Start Price', formatSol(auction.startPrice))
      if (auction.highestBid) keyValue('Highest Bid', formatSol(auction.highestBid))
      keyValue('Ends', new Date(auction.endTime).toISOString())
      keyValue('Bids', String(auction.bids.length))
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function marketplaceOffers(mint: string | undefined, options: { mine?: boolean }): Promise<void> {
  try {
    const config = await getConfig()

    if (mint) {
      const { getOffersForNFT } = await import('../../marketplace/offers')
      const offers = getOffersForNFT(mint)

      if (offers.length === 0) {
        info(`No active offers for ${formatAddress(mint)}`)
        return
      }

      header(`Offers for ${formatAddress(mint)} (${offers.length})`)
      for (const offer of offers) {
        keyValue('ID', offer.id)
        keyValue('Bidder', formatAddress(offer.bidder.toBase58()))
        keyValue('Price', formatSol(offer.price))
        if (offer.expiry) keyValue('Expires', new Date(offer.expiry).toISOString())
        info('')
      }
    } else if (options.mine) {
      const { loadState } = await import('../../marketplace/store')
      const { getPublicKey } = await import('../../drivers/solana/wallet')
      const pubkey = getPublicKey(config)
      const state = loadState()
      const myOffers = Object.values(state.offers)
        .filter(o => o.bidder === pubkey && o.status === 'active')

      if (myOffers.length === 0) {
        info('No active offers')
        return
      }

      header(`My Offers (${myOffers.length})`)
      for (const offer of myOffers) {
        keyValue('ID', offer.id)
        keyValue('Mint', offer.mint)
        keyValue('Price', `${Number(BigInt(offer.price)) / 1e9} SOL`)
        info('')
      }
    } else {
      info('Provide a mint address or use --mine to see your offers')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function marketplaceCleanup(): Promise<void> {
  try {
    const { cleanupExpired } = await import('../../marketplace/store')
    const result = cleanupExpired()
    const total = result.listings + result.offers + result.escrows + result.auctions

    if (total === 0) {
      info('No expired records found')
      return
    }

    success('Cleaned up expired records')
    if (result.listings > 0) keyValue('Listings', String(result.listings))
    if (result.offers > 0) keyValue('Offers', String(result.offers))
    if (result.escrows > 0) keyValue('Escrows', String(result.escrows))
    if (result.auctions > 0) keyValue('Auctions', String(result.auctions))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
