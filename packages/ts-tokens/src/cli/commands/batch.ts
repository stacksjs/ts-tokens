/** CLI batch operation command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function batchRetry(recoveryFile: string): Promise<void> {
  try {
    const { loadRecoveryState, getRetryItems, formatRecoverySummary } = await import('../../batch/recovery')

    const state = loadRecoveryState(recoveryFile)
    const retryItems = getRetryItems(state)

    if (retryItems.length === 0) {
      info('No failed items to retry')
      info(formatRecoverySummary(state))
      return
    }

    header(`Failed Items (${retryItems.length})`)
    for (const item of retryItems) {
      keyValue(`#${item.index} ${item.recipient}`, item.error ?? 'Unknown error')
    }
    info('\nTo retry, re-run the batch operation with these recipients.')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function batchStatus(recoveryFile: string): Promise<void> {
  try {
    const { loadRecoveryState, formatRecoverySummary } = await import('../../batch/recovery')

    const state = loadRecoveryState(recoveryFile)
    info(formatRecoverySummary(state))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function batchMetadata(jsonFile: string, options: { batchSize?: string; delay?: string; alt?: boolean }): Promise<void> {
  try {
    const fs = await import('node:fs')
    if (!fs.existsSync(jsonFile)) {
      error(`File not found: ${jsonFile}`)
      process.exit(1)
    }

    const config = await getConfig()
    const { batchMetadataUpdate } = await import('../../batch/metadata')
    const items = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'))

    info(`Batch updating metadata for ${items.length} items...`)

    const result = await batchMetadataUpdate({
      items,
      batchSize: parseInt(options.batchSize || '5'),
      delayMs: parseInt(options.delay || '500'),
      useLookupTable: options.alt,
      onProgress: (completed: number, total: number, mint?: string) => {
        info(`[${completed}/${total}]${mint ? ` ${mint}` : ''}`)
      },
    }, config)

    success('Batch metadata update complete')
    keyValue('Successful', String(result.successful))
    keyValue('Failed', String(result.failed))
    if (result.errors.length > 0) {
      header('Errors')
      for (const err of result.errors) {
        keyValue(err.mint, err.error)
      }
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function batchCreateAlt(): Promise<void> {
  try {
    const config = await getConfig()
    const { createLookupTable } = await import('../../batch/lookup-table')

    const result = await withSpinner('Creating Address Lookup Table...', () =>
      createLookupTable(config)
    )
    success('Lookup Table created')
    keyValue('Address', result.address)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function batchExtendAlt(table: string, addresses: string[]): Promise<void> {
  try {
    const config = await getConfig()
    const { extendLookupTable } = await import('../../batch/lookup-table')

    info(`Extending ALT ${table} with ${addresses.length} addresses...`)
    const signatures = await withSpinner('Extending Lookup Table...', () =>
      extendLookupTable(table, addresses, config)
    )
    success('Lookup Table extended')
    keyValue('Signatures', signatures.join(', '))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
