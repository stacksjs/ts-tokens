/**
 * Example: Token Airdrop Script
 *
 * Airdrop tokens to multiple addresses from a CSV file.
 *
 * Run with: bun run examples/token-airdrop/index.ts
 */

import { transfer, getConfig } from 'ts-tokens'
import { readFileSync } from 'fs'

interface AirdropRecipient {
  address: string
  amount: number
}

async function loadRecipients(filePath: string): Promise<AirdropRecipient[]> {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')

  // Skip header
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    const [address, amount] = line.split(',')
    return {
      address: address.trim(),
      amount: parseInt(amount.trim(), 10),
    }
  })
}

async function airdrop(
  mintAddress: string,
  recipients: AirdropRecipient[],
  decimals: number
) {
  const config = await getConfig()

  console.log(`Starting airdrop of ${recipients.length} recipients\n`)
  console.log(`Token: ${mintAddress}`)
  console.log(`Decimals: ${decimals}\n`)

  let successful = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i++) {
    const { address, amount } = recipients[i]
    const baseUnits = BigInt(amount) * BigInt(10 ** decimals)

    console.log(`[${i + 1}/${recipients.length}] Sending ${amount} tokens to ${address.slice(0, 8)}...`)

    try {
      const result = await transfer(
        mintAddress,
        address,
        Number(baseUnits),
        config
      )

      console.log(`   Success: ${result.signature.slice(0, 20)}...`)
      successful++
    } catch (error) {
      console.log(`   Failed: ${(error as Error).message}`)
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\nAirdrop Summary:')
  console.log(`   Successful: ${successful}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total: ${recipients.length}`)
}

async function main() {
  // Configuration
  const MINT_ADDRESS = process.env.MINT_ADDRESS || 'YOUR_MINT_ADDRESS'
  const DECIMALS = parseInt(process.env.DECIMALS || '9', 10)
  const RECIPIENTS_FILE = process.env.RECIPIENTS_FILE || './recipients.csv'

  if (MINT_ADDRESS === 'YOUR_MINT_ADDRESS') {
    console.log('Usage:')
    console.log('  MINT_ADDRESS=<mint> DECIMALS=9 RECIPIENTS_FILE=./recipients.csv bun run index.ts')
    console.log('')
    console.log('Recipients CSV format:')
    console.log('  address,amount')
    console.log('  ABC123...,100')
    console.log('  DEF456...,200')
    process.exit(1)
  }

  try {
    const recipients = await loadRecipients(RECIPIENTS_FILE)
    await airdrop(MINT_ADDRESS, recipients, DECIMALS)
  } catch (error) {
    console.error('Error:', (error as Error).message)
    process.exit(1)
  }
}

main()
