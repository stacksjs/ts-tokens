/**
 * NFT Collection Drop Script Template
 *
 * Complete NFT drop workflow:
 * 1. Create collection
 * 2. Batch mint NFTs with metadata
 * 3. Set royalties
 * 4. Transfer to recipients
 *
 * Usage:
 *   COLLECTION_NAME="My Collection" COLLECTION_SYMBOL="MC" \
 *   COLLECTION_URI="https://arweave.net/..." \
 *   ITEMS_JSON="items.json" ROYALTY_BPS=500 \
 *   bun run examples/script-templates/nft-drop.ts
 *
 * Environment Variables:
 *   COLLECTION_NAME   - Collection name (required)
 *   COLLECTION_SYMBOL - Collection symbol (required)
 *   COLLECTION_URI    - Collection metadata URI (required)
 *   ITEMS_JSON        - Path to JSON file with NFT items (required)
 *                       Format: [{ "name": "...", "uri": "...", "recipient": "..." }, ...]
 *   ROYALTY_BPS       - Royalty in basis points (default: 500 = 5%)
 */

import { createCollection, createNFT } from '../../src/nft/create'
import { transferNFT } from '../../src/nft/transfer'
import { getConfig } from '../../src/config'
import * as fs from 'node:fs'

interface NFTItem {
  name: string
  uri: string
  recipient?: string
}

async function main() {
  const collectionName = process.env.COLLECTION_NAME
  const collectionSymbol = process.env.COLLECTION_SYMBOL
  const collectionUri = process.env.COLLECTION_URI
  const itemsPath = process.env.ITEMS_JSON
  const royaltyBps = parseInt(process.env.ROYALTY_BPS || '500')

  if (!collectionName || !collectionSymbol || !collectionUri || !itemsPath) {
    console.error('Required: COLLECTION_NAME, COLLECTION_SYMBOL, COLLECTION_URI, ITEMS_JSON')
    process.exit(1)
  }

  if (!fs.existsSync(itemsPath)) {
    console.error(`Items file not found: ${itemsPath}`)
    process.exit(1)
  }

  const items: NFTItem[] = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'))
  const config = await getConfig()

  // Step 1: Create collection
  console.log(`[1/3] Creating collection "${collectionName}"...`)
  const collection = await createCollection({
    name: collectionName,
    symbol: collectionSymbol,
    uri: collectionUri,
    sellerFeeBasisPoints: royaltyBps,
  }, config)
  console.log(`  Collection Mint: ${collection.mint}`)
  console.log(`  Signature: ${collection.signature}`)

  // Step 2: Batch mint NFTs
  console.log(`\n[2/3] Minting ${items.length} NFTs...`)
  const minted: Array<{ mint: string; recipient?: string }> = []
  let successful = 0
  let failed = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      console.log(`  [${i + 1}/${items.length}] ${item.name}...`)
      const nft = await createNFT({
        name: item.name,
        symbol: collectionSymbol,
        uri: item.uri,
        collection: collection.mint,
        sellerFeeBasisPoints: royaltyBps,
      }, config)

      minted.push({ mint: nft.mint, recipient: item.recipient })
      successful++
      console.log(`    Mint: ${nft.mint}`)
    } catch (error) {
      failed++
      console.error(`    Failed: ${(error as Error).message}`)
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`  Minting complete: ${successful} successful, ${failed} failed`)

  // Step 3: Transfer to recipients
  const transfers = minted.filter(m => m.recipient)
  if (transfers.length > 0) {
    console.log(`\n[3/3] Transferring ${transfers.length} NFTs to recipients...`)
    let txSuccess = 0
    let txFailed = 0

    for (const item of transfers) {
      try {
        const result = await transferNFT(item.mint, item.recipient!, config)
        txSuccess++
        console.log(`  Transferred ${item.mint} → ${item.recipient}`)
      } catch (error) {
        txFailed++
        console.error(`  Transfer failed for ${item.mint}: ${(error as Error).message}`)
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`  Transfers: ${txSuccess} successful, ${txFailed} failed`)
  } else {
    console.log('\n[3/3] No recipient transfers needed')
  }

  console.log('\nNFT drop complete!')
  console.log(`  Collection: ${collection.mint}`)
  console.log(`  NFTs Minted: ${successful}`)
}

main().catch((error) => {
  console.error('NFT drop failed:', error)
  process.exit(1)
})
