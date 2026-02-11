/**
 * Token Launch Script Template
 *
 * Complete token launch workflow:
 * 1. Create token with metadata
 * 2. Mint initial supply
 * 3. Transfer to treasury
 * 4. Batch airdrop to early holders
 * 5. Optionally revoke mint authority
 *
 * Usage:
 *   TOKEN_NAME="MyToken" TOKEN_SYMBOL="MTK" DECIMALS=9 \
 *   INITIAL_SUPPLY=1000000000 TREASURY_ADDRESS="..." \
 *   AIRDROP_LIST="airdrop.json" REVOKE_MINT=true \
 *   bun run examples/script-templates/token-launch.ts
 *
 * Environment Variables:
 *   TOKEN_NAME      - Token name (required)
 *   TOKEN_SYMBOL    - Token symbol (required)
 *   DECIMALS        - Decimal places (default: 9)
 *   INITIAL_SUPPLY  - Total supply to mint (required)
 *   TREASURY_ADDRESS - Treasury wallet for initial allocation
 *   AIRDROP_LIST    - Path to JSON file with airdrop recipients
 *                     Format: [{ "address": "...", "amount": "..." }, ...]
 *   REVOKE_MINT     - Set to "true" to revoke mint authority after launch
 */

import { createToken } from '../../src/token/create'
import { mintTokens } from '../../src/token/mint'
import { transfer } from '../../src/token/transfer'
import { revokeMintAuthority } from '../../src/token/authority'
import { getConfig } from '../../src/config'
import * as fs from 'node:fs'

async function main() {
  const name = process.env.TOKEN_NAME
  const symbol = process.env.TOKEN_SYMBOL
  const decimals = parseInt(process.env.DECIMALS || '9')
  const initialSupply = process.env.INITIAL_SUPPLY
  const treasuryAddress = process.env.TREASURY_ADDRESS
  const airdropListPath = process.env.AIRDROP_LIST
  const revokeMint = process.env.REVOKE_MINT === 'true'

  if (!name || !symbol || !initialSupply) {
    console.error('Required: TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY')
    process.exit(1)
  }

  const config = await getConfig()

  // Step 1: Create token
  console.log(`[1/5] Creating token ${name} (${symbol})...`)
  const token = await createToken({
    name,
    symbol,
    decimals,
  }, config)
  console.log(`  Mint: ${token.mint}`)
  console.log(`  Signature: ${token.signature}`)

  // Step 2: Mint initial supply
  console.log(`\n[2/5] Minting ${initialSupply} tokens...`)
  const mintResult = await mintTokens({
    mint: token.mint,
    amount: BigInt(initialSupply),
  }, config)
  console.log(`  Signature: ${mintResult.signature}`)

  // Step 3: Transfer to treasury
  if (treasuryAddress) {
    const treasuryAmount = BigInt(initialSupply) / 2n // 50% to treasury
    console.log(`\n[3/5] Transferring ${treasuryAmount} to treasury ${treasuryAddress}...`)
    const txResult = await transfer(token.mint, treasuryAddress, treasuryAmount, config)
    console.log(`  Signature: ${txResult.signature}`)
  } else {
    console.log('\n[3/5] Skipping treasury transfer (no TREASURY_ADDRESS set)')
  }

  // Step 4: Airdrop
  if (airdropListPath && fs.existsSync(airdropListPath)) {
    const recipients = JSON.parse(fs.readFileSync(airdropListPath, 'utf-8')) as Array<{
      address: string
      amount: string
    }>

    console.log(`\n[4/5] Airdropping to ${recipients.length} recipients...`)
    let successful = 0
    let failed = 0

    for (const recipient of recipients) {
      try {
        await transfer(token.mint, recipient.address, BigInt(recipient.amount), config)
        successful++
        console.log(`  Sent ${recipient.amount} to ${recipient.address}`)
      } catch (error) {
        failed++
        console.error(`  Failed: ${recipient.address} — ${(error as Error).message}`)
      }
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`  Done: ${successful} successful, ${failed} failed`)
  } else {
    console.log('\n[4/5] Skipping airdrop (no AIRDROP_LIST set)')
  }

  // Step 5: Revoke mint authority
  if (revokeMint) {
    console.log('\n[5/5] Revoking mint authority (fixed supply)...')
    const revokeResult = await revokeMintAuthority(token.mint, config)
    console.log(`  Signature: ${revokeResult.signature}`)
  } else {
    console.log('\n[5/5] Skipping mint authority revocation (set REVOKE_MINT=true to enable)')
  }

  console.log('\nToken launch complete!')
  console.log(`  Mint Address: ${token.mint}`)
}

main().catch((error) => {
  console.error('Token launch failed:', error)
  process.exit(1)
})
