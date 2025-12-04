/**
 * Example: Create a Fungible Token
 *
 * This example demonstrates how to create a new fungible token on Solana.
 *
 * Run with: bun run examples/create-token/index.ts
 */

import { createToken, mintTokens, transferTokens, getConfig } from 'ts-tokens'

async function main() {
  console.log('🚀 Creating a new fungible token...\n')

  // Load configuration
  const config = await getConfig()
  console.log(`Network: ${config.network}`)
  console.log(`RPC: ${config.rpcUrl}\n`)

  // Create the token
  console.log('Creating token...')
  const token = await createToken({
    name: 'Example Token',
    symbol: 'EXMPL',
    decimals: 9,
    initialSupply: 1_000_000_000_000, // 1000 tokens with 9 decimals
  }, config)

  console.log('✅ Token created!')
  console.log(`   Mint: ${token.mint}`)
  console.log(`   Signature: ${token.signature}`)
  console.log(`   ATA: ${token.ata}\n`)

  // Mint more tokens
  console.log('Minting additional tokens...')
  const mintResult = await mintTokens(
    token.mint,
    500_000_000_000, // 500 more tokens
    token.ata!, // To our own ATA
    config
  )
  console.log(`✅ Minted! Signature: ${mintResult.signature}\n`)

  // Transfer tokens (to self for demo)
  console.log('Transferring tokens...')
  const transferResult = await transferTokens(
    token.mint,
    100_000_000_000, // 100 tokens
    token.ata!, // To same address for demo
    config
  )
  console.log(`✅ Transferred! Signature: ${transferResult.signature}\n`)

  console.log('🎉 Done! Your token is ready.')
  console.log(`\nView on Solana Explorer:`)
  console.log(`https://explorer.solana.com/address/${token.mint}?cluster=${config.network}`)
}

main().catch(console.error)
