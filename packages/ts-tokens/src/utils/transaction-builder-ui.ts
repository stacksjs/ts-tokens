/**
 * Visual Transaction Builder
 *
 * Generates a self-contained HTML representation of a transaction's
 * instructions, accounts, and data for visual debugging and inspection.
 */

/**
 * Instruction descriptor for the visual builder.
 */
export interface VisualInstruction {
  /** Program ID that processes this instruction */
  programId: string
  /** Human-readable program name (optional) */
  programName?: string
  /** Accounts referenced by this instruction */
  accounts: Array<{
    pubkey: string
    isSigner: boolean
    isWritable: boolean
    label?: string
  }>
  /** Hex-encoded instruction data */
  data?: string
  /** Human-readable description of what this instruction does */
  description?: string
}

/**
 * Generate a self-contained HTML page visualizing a transaction's instructions.
 *
 * The returned HTML string includes embedded CSS and requires no external
 * dependencies — it can be written to a file and opened in any browser,
 * or served directly by the CLI dev server.
 *
 * @param instructions - Array of instruction descriptors to visualize
 * @param options - Optional metadata for the transaction
 * @returns A complete HTML document string
 *
 * @example
 * ```ts
 * const html = generateTransactionBuilderHTML([
 *   {
 *     programId: '11111111111111111111111111111111',
 *     programName: 'System Program',
 *     accounts: [
 *       { pubkey: 'Abc...', isSigner: true, isWritable: true, label: 'Payer' },
 *       { pubkey: 'Def...', isSigner: false, isWritable: true, label: 'New Account' },
 *     ],
 *     data: '0200000000ca9a3b00000000',
 *     description: 'Create Account',
 *   },
 * ])
 * ```
 */
export function generateTransactionBuilderHTML(
  instructions: VisualInstruction[],
  options?: {
    title?: string
    signature?: string
    feePayer?: string
    recentBlockhash?: string
  },
): string {
  const title = options?.title ?? 'Transaction Inspector'

  const instructionCards = instructions
    .map((ix, index) => {
      const accountRows = ix.accounts
        .map(
          (acc) => `
            <tr>
              <td class="pubkey" title="${acc.pubkey}">${acc.label ? `<span class="label">${escapeHtml(acc.label)}</span> ` : ''}${truncate(acc.pubkey, 20)}</td>
              <td>${acc.isSigner ? '<span class="badge signer">Signer</span>' : ''}</td>
              <td>${acc.isWritable ? '<span class="badge writable">Writable</span>' : '<span class="badge readonly">Read-only</span>'}</td>
            </tr>`,
        )
        .join('\n')

      const dataSection = ix.data
        ? `<div class="data-section">
            <h4>Data</h4>
            <code class="data-hex">${escapeHtml(ix.data)}</code>
            <span class="data-size">${ix.data.length / 2} bytes</span>
           </div>`
        : ''

      return `
        <div class="instruction-card">
          <div class="instruction-header">
            <span class="instruction-index">#${index + 1}</span>
            <span class="program-name">${escapeHtml(ix.programName ?? 'Unknown Program')}</span>
            <code class="program-id" title="${escapeHtml(ix.programId)}">${truncate(ix.programId, 16)}</code>
          </div>
          ${ix.description ? `<p class="instruction-desc">${escapeHtml(ix.description)}</p>` : ''}
          <table class="accounts-table">
            <thead>
              <tr><th>Account</th><th>Signer</th><th>Access</th></tr>
            </thead>
            <tbody>
              ${accountRows}
            </tbody>
          </table>
          ${dataSection}
        </div>`
    })
    .join('\n')

  const metaSection = options
    ? `<div class="meta-section">
        ${options.signature ? `<div class="meta-item"><span class="meta-label">Signature:</span> <code>${escapeHtml(options.signature)}</code></div>` : ''}
        ${options.feePayer ? `<div class="meta-item"><span class="meta-label">Fee Payer:</span> <code>${escapeHtml(options.feePayer)}</code></div>` : ''}
        ${options.recentBlockhash ? `<div class="meta-item"><span class="meta-label">Blockhash:</span> <code>${escapeHtml(options.recentBlockhash)}</code></div>` : ''}
        <div class="meta-item"><span class="meta-label">Instructions:</span> ${instructions.length}</div>
        <div class="meta-item"><span class="meta-label">Total Accounts:</span> ${countUniqueAccounts(instructions)}</div>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e1e4e8; padding: 2rem; line-height: 1.5; }
  .container { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #58a6ff; }
  .subtitle { color: #8b949e; margin-bottom: 1.5rem; font-size: 0.9rem; }
  .meta-section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
  .meta-item { padding: 0.25rem 0; font-size: 0.85rem; }
  .meta-label { color: #8b949e; display: inline-block; min-width: 120px; }
  .meta-item code { background: #21262d; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }
  .instruction-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 1rem; overflow: hidden; }
  .instruction-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: #1c2129; border-bottom: 1px solid #30363d; }
  .instruction-index { background: #58a6ff; color: #0d1117; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; }
  .program-name { font-weight: 600; }
  .program-id { color: #8b949e; font-size: 0.8rem; background: #21262d; padding: 2px 6px; border-radius: 4px; margin-left: auto; }
  .instruction-desc { padding: 0.5rem 1rem; color: #8b949e; font-size: 0.85rem; border-bottom: 1px solid #30363d; }
  .accounts-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .accounts-table th { text-align: left; padding: 0.5rem 1rem; color: #8b949e; font-weight: 500; border-bottom: 1px solid #30363d; }
  .accounts-table td { padding: 0.4rem 1rem; border-bottom: 1px solid #21262d; }
  .pubkey { font-family: monospace; font-size: 0.8rem; }
  .label { color: #58a6ff; font-weight: 500; font-family: inherit; }
  .badge { padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
  .signer { background: #1f6feb33; color: #58a6ff; border: 1px solid #1f6feb; }
  .writable { background: #f0883e33; color: #f0883e; border: 1px solid #f0883e; }
  .readonly { background: #21262d; color: #8b949e; border: 1px solid #30363d; }
  .data-section { padding: 0.75rem 1rem; border-top: 1px solid #30363d; }
  .data-section h4 { color: #8b949e; font-size: 0.8rem; margin-bottom: 0.25rem; }
  .data-hex { display: block; background: #0d1117; padding: 0.5rem; border-radius: 4px; font-size: 0.75rem; overflow-x: auto; word-break: break-all; }
  .data-size { display: block; color: #8b949e; font-size: 0.75rem; margin-top: 0.25rem; }
  .flow-arrow { text-align: center; color: #30363d; font-size: 1.5rem; margin: 0.25rem 0; }
  .footer { text-align: center; color: #484f58; font-size: 0.8rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #21262d; }
</style>
</head>
<body>
<div class="container">
  <h1>${escapeHtml(title)}</h1>
  <p class="subtitle">Generated by ts-tokens transaction builder</p>
  ${metaSection}
  ${instructionCards}
  <div class="footer">ts-tokens Transaction Inspector</div>
</div>
</body>
</html>`
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Truncate a string with ellipsis */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  const half = Math.floor((maxLen - 3) / 2)
  return `${str.slice(0, half)}...${str.slice(-half)}`
}

/** Count unique accounts across all instructions */
function countUniqueAccounts(instructions: VisualInstruction[]): number {
  const unique = new Set<string>()
  for (const ix of instructions) {
    for (const acc of ix.accounts) {
      unique.add(acc.pubkey)
    }
  }
  return unique.size
}
