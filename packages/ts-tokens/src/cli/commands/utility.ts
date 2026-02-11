/** Utility CLI command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function airdrop(
  mint: string,
  recipientsFile: string,
  options: { amount?: string; delay?: string },
): Promise<void> {
  try {
    const config = await getConfig()
    const { transfer } = await import('../../token/transfer')
    const fs = await import('node:fs')

    const content = fs.readFileSync(recipientsFile, 'utf-8')
    const recipients: string[] = JSON.parse(content)

    if (!Array.isArray(recipients) || recipients.length === 0) {
      error('Recipients file must contain a JSON array of addresses')
      process.exit(1)
    }

    const amount = BigInt(options.amount || '1')
    const delay = parseInt(options.delay || '500')

    header('Airdrop')
    keyValue('Token', mint)
    keyValue('Recipients', String(recipients.length))
    keyValue('Amount per recipient', String(amount))

    let successful = 0
    let failed = 0

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]
      try {
        const result = await withSpinner(
          `[${i + 1}/${recipients.length}] Sending to ${recipient}`,
          () => transfer(mint, recipient, amount, config),
        )
        keyValue('Signature', result.signature)
        successful++
      } catch {
        error(`Failed to send to ${recipient}`)
        failed++
      }

      if (i < recipients.length - 1 && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    header('Airdrop Results')
    keyValue('Successful', String(successful))
    keyValue('Failed', String(failed))
    success('Airdrop complete')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function snapshot(
  mint: string,
  options: { output?: string; minBalance?: string },
): Promise<void> {
  try {
    const config = await getConfig()
    const { getTokenHolders } = await import('../../token/query')
    const fs = await import('node:fs')

    const holders = await withSpinner(
      `Taking snapshot of ${mint} holders`,
      () => getTokenHolders(mint, config, { limit: 10000 }),
      'Snapshot complete',
    )

    let filtered = holders
    if (options.minBalance) {
      const minBalance = BigInt(options.minBalance)
      filtered = holders.filter(h => h.balance >= minBalance)
    }

    keyValue('Holders found', String(filtered.length))

    const data = filtered.map(h => ({
      owner: h.owner,
      tokenAccount: h.tokenAccount,
      balance: h.balance.toString(),
      percentage: h.percentage,
    }))

    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(data, null, 2))
      success(`Snapshot saved to ${options.output}`)
    } else {
      info(JSON.stringify(data, null, 2))
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function verify(signature: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')

    const connection = createConnection(config)

    const tx = await withSpinner(
      `Verifying transaction ${signature}`,
      () => connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 }),
    )

    if (!tx) {
      error('Transaction not found')
      process.exit(1)
    }

    header('Transaction Details')
    keyValue('Signature', signature)
    keyValue('Slot', String(tx.slot))
    keyValue('Block Time', tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'N/A')
    keyValue('Status', tx.meta?.err ? 'Failed' : 'Success')
    keyValue('Fee', `${tx.meta?.fee || 0} lamports`)
    keyValue('Compute Units', String(tx.meta?.computeUnitsConsumed ?? 'N/A'))

    if (tx.meta?.err) {
      keyValue('Error', JSON.stringify(tx.meta.err))
    }

    if (tx.meta?.logMessages) {
      header('Logs')
      for (const log of tx.meta.logMessages) {
        info(log)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function decode(data: string, options: { type?: string }): Promise<void> {
  try {
    const type = options.type || 'base64'

    if (type === 'base64') {
      const decoded = Buffer.from(data, 'base64')
      header('Decoded Data')
      keyValue('Hex', decoded.toString('hex'))
      keyValue('UTF-8', decoded.toString('utf8'))
      keyValue('Length', `${decoded.length} bytes`)
    } else if (type === 'base58') {
      const { decode: b58decode } = await import('../../utils/base58')
      const decoded = b58decode(data)

      header('Decoded Data')
      keyValue('Hex', Buffer.from(decoded).toString('hex'))
      keyValue('Length', `${decoded.length} bytes`)
    } else if (type === 'transaction') {
      const config = await getConfig()
      const { createConnection } = await import('../../drivers/solana/connection')
      const connection = createConnection(config)

      const tx = await withSpinner(
        'Fetching transaction',
        () => connection.getTransaction(data, { maxSupportedTransactionVersion: 0 }),
      )

      if (!tx) {
        error('Transaction not found')
        process.exit(1)
      }

      header('Transaction Data')
      keyValue('Slot', String(tx.slot))
      keyValue('Block Time', String(tx.blockTime))
      keyValue('Fee', String(tx.meta?.fee))
      keyValue('Status', tx.meta?.err ? 'failed' : 'success')

      if (tx.meta?.logMessages) {
        header('Log Messages')
        for (const log of tx.meta.logMessages) {
          info(log)
        }
      }
    } else if (type === 'account') {
      const config = await getConfig()
      const { createConnection } = await import('../../drivers/solana/connection')
      const { PublicKey } = await import('@solana/web3.js')
      const connection = createConnection(config)

      const accountInfo = await withSpinner(
        'Fetching account',
        () => connection.getAccountInfo(new PublicKey(data)),
      )

      if (!accountInfo) {
        error('Account not found')
        process.exit(1)
      }

      header('Account Data')
      keyValue('Owner', accountInfo.owner.toBase58())
      keyValue('Lamports', String(accountInfo.lamports))
      keyValue('Executable', String(accountInfo.executable))
      keyValue('Data Length', `${accountInfo.data.length} bytes`)
      keyValue('Data (hex)', `${accountInfo.data.slice(0, 64).toString('hex')}${accountInfo.data.length > 64 ? '...' : ''}`)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
