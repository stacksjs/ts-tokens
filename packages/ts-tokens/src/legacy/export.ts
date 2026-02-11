/**
 * Legacy Export Utilities
 *
 * Export collection data to JSON, CSV, and Metaplex formats.
 * Zero external dependencies for CSV serialization.
 */

import type { HolderEntry } from '../types/legacy'

/**
 * Export data as formatted JSON
 */
export function exportToJSON(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Export holder/NFT data as CSV
 *
 * Zero-dependency CSV serializer that handles escaping.
 */
export function exportToCSV(
  data: Array<Record<string, unknown>>,
  options?: { delimiter?: string }
): string {
  if (data.length === 0) return ''

  const delimiter = options?.delimiter ?? ','

  // Extract headers from first item
  const headers = Object.keys(data[0])

  // Escape CSV field
  const escapeField = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value)
    // Escape if contains delimiter, quotes, or newlines
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines: string[] = []

  // Header row
  lines.push(headers.map(escapeField).join(delimiter))

  // Data rows
  for (const row of data) {
    const values = headers.map(h => escapeField(row[h]))
    lines.push(values.join(delimiter))
  }

  return lines.join('\n')
}

/**
 * Export holders as CSV (convenience)
 */
export function exportHoldersToCSV(holders: HolderEntry[]): string {
  const rows = holders.map(h => ({
    owner: h.owner,
    count: h.count,
    mints: h.mints.join(';'),
  }))

  return exportToCSV(rows)
}

/**
 * Export data in Metaplex-compatible format
 *
 * Produces the format expected by Metaplex tools (Sugar, etc.)
 */
export function exportToMetaplexFormat(data: {
  collection?: string
  stats?: { totalItems: number; uniqueHolders: number }
  holders?: HolderEntry[]
}): string {
  const metaplexData = {
    collection: data.collection || '',
    totalSupply: data.stats?.totalItems || 0,
    uniqueHolders: data.stats?.uniqueHolders || 0,
    holders: (data.holders || []).map(h => ({
      ownerAddress: h.owner,
      tokenCount: h.count,
      mints: h.mints,
    })),
  }

  return JSON.stringify(metaplexData, null, 2)
}
