import { getConfig } from '../../src/config'

export function register(cli: any): void {
  cli
    .command('airdrop <mint> <recipients-file>', 'Airdrop tokens to recipients')
    .option('--amount <amount>', 'Amount per recipient (for fungible tokens)')
    .option('--delay <ms>', 'Delay between transactions in ms', '500')
    .action(async (mint: string, recipientsFile: string, options: { amount?: string; delay?: string }) => {
      const config = await getConfig()
      const { transfer } = await import('../../src/token/transfer')
      const fs = await import('node:fs')

      try {
        const content = fs.readFileSync(recipientsFile, 'utf-8')
        const recipients: string[] = JSON.parse(content)

        if (!Array.isArray(recipients) || recipients.length === 0) {
          console.error('Recipients file must contain a JSON array of addresses')
          process.exit(1)
        }

        const amount = BigInt(options.amount || '1')
        const delay = parseInt(options.delay || '500')

        console.log(`Airdropping to ${recipients.length} recipients...`)
        console.log(`  Token: ${mint}`)
        console.log(`  Amount: ${amount} per recipient\n`)

        let successful = 0
        let failed = 0

        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i]
          try {
            console.log(`  [${i + 1}/${recipients.length}] Sending to ${recipient}...`)
            const result = await transfer(mint, recipient, amount, config)
            console.log(`    \u2713 ${result.signature}`)
            successful++
          } catch (err) {
            console.log(`    \u2717 Failed: ${err instanceof Error ? err.message : err}`)
            failed++
          }

          if (i < recipients.length - 1 && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }

        console.log(`\nAirdrop complete!`)
        console.log(`  Successful: ${successful}`)
        console.log(`  Failed: ${failed}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('snapshot <mint>', 'Snapshot token holders')
    .option('--output <path>', 'Output file path')
    .option('--min-balance <amount>', 'Minimum balance filter')
    .action(async (mint: string, options: { output?: string; minBalance?: string }) => {
      const config = await getConfig()
      const { getTokenHolders } = await import('../../src/token/query')
      const fs = await import('node:fs')

      try {
        console.log(`Taking snapshot of ${mint} holders...`)
        const holders = await getTokenHolders(mint, config, { limit: 10000 })

        let filtered = holders
        if (options.minBalance) {
          const minBalance = BigInt(options.minBalance)
          filtered = holders.filter(h => h.balance >= minBalance)
        }

        console.log(`\nFound ${filtered.length} holders`)

        const snapshot = filtered.map(h => ({
          owner: h.owner,
          tokenAccount: h.tokenAccount,
          balance: h.balance.toString(),
          percentage: h.percentage,
        }))

        if (options.output) {
          fs.writeFileSync(options.output, JSON.stringify(snapshot, null, 2))
          console.log(`Snapshot saved to: ${options.output}`)
        } else {
          console.log(JSON.stringify(snapshot, null, 2))
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('verify <signature>', 'Verify a transaction')
    .action(async (signature: string) => {
      const config = await getConfig()
      const { createConnection } = await import('../../src/drivers/solana/connection')

      try {
        const connection = createConnection(config)
        console.log(`Verifying transaction ${signature}...`)

        const tx = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        })

        if (!tx) {
          console.log('Transaction not found')
          process.exit(1)
        }

        console.log('\nTransaction Details:')
        console.log(`  Signature: ${signature}`)
        console.log(`  Slot: ${tx.slot}`)
        console.log(`  Block Time: ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'N/A'}`)
        console.log(`  Status: ${tx.meta?.err ? 'Failed' : 'Success'}`)
        console.log(`  Fee: ${tx.meta?.fee || 0} lamports`)
        console.log(`  Compute Units: ${tx.meta?.computeUnitsConsumed || 'N/A'}`)

        if (tx.meta?.err) {
          console.log(`  Error: ${JSON.stringify(tx.meta.err)}`)
        }

        if (tx.meta?.logMessages) {
          console.log('\nLogs:')
          for (const log of tx.meta.logMessages) {
            console.log(`  ${log}`)
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('decode <data>', 'Decode transaction or account data')
    .option('--type <type>', 'Data type (transaction/account/base58/base64)', 'base64')
    .action(async (data: string, options: { type?: string }) => {
      try {
        const type = options.type || 'base64'

        if (type === 'base64') {
          const decoded = Buffer.from(data, 'base64')
          console.log('Decoded (hex):')
          console.log(`  ${decoded.toString('hex')}`)
          console.log(`\nDecoded (utf8):`)
          console.log(`  ${decoded.toString('utf8')}`)
          console.log(`\nLength: ${decoded.length} bytes`)
        } else if (type === 'base58') {
          const { decode } = await import('../../src/utils/base58')
          const decoded = decode(data)
          console.log('Decoded (hex):')
          console.log(`  ${Buffer.from(decoded).toString('hex')}`)
          console.log(`\nLength: ${decoded.length} bytes`)
        } else if (type === 'transaction') {
          const config = await getConfig()
          const { createConnection } = await import('../../src/drivers/solana/connection')
          const connection = createConnection(config)

          const tx = await connection.getTransaction(data, {
            maxSupportedTransactionVersion: 0,
          })

          if (tx) {
            console.log('Transaction Data:')
            console.log(JSON.stringify({
              slot: tx.slot,
              blockTime: tx.blockTime,
              fee: tx.meta?.fee,
              status: tx.meta?.err ? 'failed' : 'success',
              logMessages: tx.meta?.logMessages,
            }, null, 2))
          } else {
            console.log('Transaction not found')
          }
        } else if (type === 'account') {
          const config = await getConfig()
          const { createConnection } = await import('../../src/drivers/solana/connection')
          const { PublicKey } = await import('@solana/web3.js')
          const connection = createConnection(config)

          const accountInfo = await connection.getAccountInfo(new PublicKey(data))
          if (accountInfo) {
            console.log('Account Data:')
            console.log(`  Owner: ${accountInfo.owner.toBase58()}`)
            console.log(`  Lamports: ${accountInfo.lamports}`)
            console.log(`  Executable: ${accountInfo.executable}`)
            console.log(`  Data Length: ${accountInfo.data.length} bytes`)
            console.log(`  Data (hex): ${accountInfo.data.slice(0, 64).toString('hex')}${accountInfo.data.length > 64 ? '...' : ''}`)
          } else {
            console.log('Account not found')
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
