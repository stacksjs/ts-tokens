/**
 * Example: Create an NFT Collection
 *
 * This example demonstrates how to create an NFT collection and mint NFTs to it.
 *
 * Run with: bun run examples/nft-collection/index.ts
 */

import { createCollection, createNFT, getConfig } from 'ts-tokens'

async function main() {
  console.log('🎨 Creating an NFT Collection...\n')

  // Load configuration
  const config = await getConfig()
  console.log(`Network: ${config.network}`)
  console.log(`RPC: ${config.rpcUrl}\n`)

  // Create the collection
  console.log('Creating collection...')
  const collection = await createCollection({
    name: 'My Awesome Collection',
    symbol: 'AWSM',
    uri: 'https://arweave.net/collection-metadata.json',
    sellerFeeBasisPoints: 500, // 5% royalty
  }, config)

  console.log('✅ Collection created!')
  console.log(`   Mint: ${collection.mint}`)
  console.log(`   Signature: ${collection.signature}\n`)

  // Mint NFTs to the collection
  const nftCount = 3
  console.log(`Minting ${nftCount} NFTs to collection...`)

  for (let i = 1; i <= nftCount; i++) {
    const nft = await createNFT({
      name: `Awesome NFT #${i}`,
      symbol: 'AWSM',
      uri: `https://arweave.net/nft-${i}-metadata.json`,
      sellerFeeBasisPoints: 500,
      collection: collection.mint,
    }, config)

    console.log(`   ✅ NFT #${i}: ${nft.mint}`)
  }

  console.log('\n🎉 Done! Your collection is ready.')
  console.log(`\nView collection on Solana Explorer:`)
  console.log(`https://explorer.solana.com/address/${collection.mint}?cluster=${config.network}`)
}

main().catch(console.error)
