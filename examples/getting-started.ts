/**
 * Getting Started with ts-tokens
 *
 * This example shows how to create a token and mint an NFT.
 */

import { createNFT, createToken, getTokenInfo } from 'ts-tokens'

async function main() {
  // Create a fungible token
  console.log('Creating token...')
  const token = await createToken({
    name: 'My Token',
    symbol: 'MTK',
    decimals: 9,
    initialSupply: 1000000n,
  })
  console.log(`Token created: ${token.mint}`)
  console.log(`Transaction: ${token.signature}`)

  // Get token info
  const info = await getTokenInfo(token.mint)
  console.log(`Token decimals: ${info.decimals}`)
  console.log(`Total supply: ${info.supply}`)

  // Create an NFT
  console.log('\nCreating NFT...')
  const nft = await createNFT({
    name: 'My NFT',
    symbol: 'MNFT',
    uri: 'https://arweave.net/metadata.json',
    sellerFeeBasisPoints: 500, // 5% royalty
    creators: [{
      address: 'YourWalletAddress',
      share: 100,
      verified: true,
    }],
  })
  console.log(`NFT created: ${nft.mint}`)
  console.log(`Transaction: ${nft.signature}`)
}

main().catch(console.error)
