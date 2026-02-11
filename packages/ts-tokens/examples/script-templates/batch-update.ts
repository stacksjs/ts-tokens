/**
 * Batch Metadata Update Script Template
 *
 * Update metadata for multiple NFTs/tokens in batches.
 *
 * Usage:
 *   UPDATES_JSON="updates.json" BATCH_SIZE=5 DELAY_MS=500 \
 *   bun run examples/script-templates/batch-update.ts
 *
 * Environment Variables:
 *   UPDATES_JSON  - Path to JSON file with update items (required)
 *                   Format: [{ "mint": "...", "updates": { "name": "...", "uri": "..." } }, ...]
 *   BATCH_SIZE    - Number of updates per batch (default: 5)
 *   DELAY_MS      - Delay between batches in ms (default: 500)
 *   USE_ALT       - Set to "true" to use Address Lookup Tables
 */

import { batchMetadataUpdate } from '../../src/batch/metadata'
import { getConfig } from '../../src/config'
import type { BatchMetadataUpdateItem } from '../../src/batch/types'
import * as fs from 'node:fs'

async function main() {
  const updatesPath = process.env.UPDATES_JSON
  const batchSize = parseInt(process.env.BATCH_SIZE || '5')
  const delayMs = parseInt(process.env.DELAY_MS || '500')
  const useAlt = process.env.USE_ALT === 'true'

  if (!updatesPath) {
    console.error('Required: UPDATES_JSON')
    console.error('')
    console.error('Example updates.json:')
    console.error(JSON.stringify([
      {
        mint: 'TokenMint111...',
        updates: { name: 'Updated Name', uri: 'https://arweave.net/new-metadata' },
      },
    ], null, 2))
    process.exit(1)
  }

  if (!fs.existsSync(updatesPath)) {
    console.error(`File not found: ${updatesPath}`)
    process.exit(1)
  }

  const items: BatchMetadataUpdateItem[] = JSON.parse(fs.readFileSync(updatesPath, 'utf-8'))
  console.log(`Loaded ${items.length} metadata update items`)

  const config = await getConfig()

  console.log(`\nStarting batch metadata update...`)
  console.log(`  Batch size: ${batchSize}`)
  console.log(`  Delay: ${delayMs}ms`)
  console.log(`  ALT: ${useAlt ? 'enabled' : 'disabled'}`)
  console.log('')

  const result = await batchMetadataUpdate(
    {
      items,
      batchSize,
      delayMs,
      useLookupTable: useAlt,
      onProgress: (completed, total, mint) => {
        const pct = Math.round((completed / total) * 100)
        console.log(`  [${pct}%] ${completed}/${total}${mint ? ` — ${mint}` : ''}`)
      },
      onError: (error, item) => {
        console.error(`  Error updating ${item.mint}: ${error.message}`)
      },
    },
    config,
  )

  console.log('\nBatch update complete!')
  console.log(`  Total: ${result.total}`)
  console.log(`  Successful: ${result.successful}`)
  console.log(`  Failed: ${result.failed}`)

  if (result.errors.length > 0) {
    console.log('\nErrors:')
    for (const err of result.errors) {
      console.log(`  ${err.mint}: ${err.error}`)
    }
  }

  if (result.lookupTable) {
    console.log(`\nLookup Table: ${result.lookupTable}`)
  }
}

main().catch((error) => {
  console.error('Batch update failed:', error)
  process.exit(1)
})
