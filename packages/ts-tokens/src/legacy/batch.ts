/**
 * Legacy Batch Executor
 *
 * Generic batch execution helper with progress callbacks and error collection.
 */

import type { ProgressCallback, BatchResult } from '../types/legacy'

/**
 * Execute a batch operation with progress tracking and error handling
 */
export async function executeBatch<T = string>(options: {
  /** Items to process */
  items: string[]
  /** Async function to process each item */
  processor: (item: string) => Promise<T>
  /** Batch size (items processed before delay) */
  batchSize?: number
  /** Delay between batches in ms */
  delayMs?: number
  /** Progress callback */
  onProgress?: ProgressCallback
}): Promise<BatchResult<T>> {
  const {
    items,
    processor,
    batchSize = 5,
    delayMs = 500,
    onProgress,
  } = options

  const result: BatchResult<T> = {
    successful: [],
    failed: [],
    total: items.length,
  }

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    for (const item of batch) {
      try {
        const processed = await processor(item)
        result.successful.push(processed)
      } catch (err) {
        result.failed.push({
          item,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      if (onProgress) {
        onProgress(
          result.successful.length + result.failed.length,
          result.total,
          item
        )
      }
    }

    // Delay between batches
    if (i + batchSize < items.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return result
}
