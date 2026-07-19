/**
 * Security Checks
 *
 * Pre-transaction and pre-operation security checks.
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

export interface SecurityCheckResult {
  safe: boolean
  warnings: string[]
  recommendations: string[]
  /**
   * `false` when the check could not actually be performed (e.g. the data
   * source it needs is not configured or unavailable). When `checked` is
   * `false`, `safe` is always `false` as well: an unperformed check must
   * never report "safe". Omitted (undefined) means the check ran normally.
   */
  checked?: boolean
}

/**
 * Check if an address is a known scam address.
 *
 * There is no reputation/scam database wired into this library, so the
 * reputation of an address CANNOT be determined here. Only the address
 * format is verified; the reputation verdict is reported honestly as
 * NOT CHECKED (`checked: false`, `safe: false`) instead of a fabricated
 * "safe".
 */
export async function checkAddressReputation(address: string): Promise<SecurityCheckResult> {
  // Basic validation
  try {
    new PublicKey(address)
  } catch {
    return {
      safe: false,
      warnings: ['Invalid Solana address format'],
      recommendations: ['Verify the address is correct'],
    }
  }

  return {
    safe: false,
    checked: false,
    warnings: ['NOT CHECKED — no address reputation database is configured'],
    recommendations: [
      'Cross-reference the address with a public scam database (e.g. SolanaFM, Chainabuse) before interacting',
    ],
  }
}

/**
 * Check balance before transaction
 */
export async function checkSufficientBalance(
  connection: Connection,
  address: PublicKey,
  requiredLamports: number
): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  const balance = await connection.getBalance(address)

  if (balance < requiredLamports) {
    const required = requiredLamports / LAMPORTS_PER_SOL
    const available = balance / LAMPORTS_PER_SOL
    return {
      safe: false,
      warnings: [`Insufficient balance: need ${required} SOL, have ${available} SOL`],
      recommendations: ['Add more SOL to your wallet before proceeding'],
    }
  }

  // Warn if balance will be very low after transaction
  const remainingBalance = balance - requiredLamports
  if (remainingBalance < 0.01 * LAMPORTS_PER_SOL) {
    warnings.push('Balance will be very low after this transaction')
    recommendations.push('Consider keeping some SOL for future transaction fees')
  }

  return {
    safe: true,
    warnings,
    recommendations,
  }
}

/**
 * Check if amount is unusually large
 */
export function checkUnusualAmount(
  amount: bigint,
  totalSupply: bigint,
  decimals: number
): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Warn if transferring more than 50% of supply
  if (totalSupply > 0n && amount > totalSupply / 2n) {
    warnings.push('This amount is more than 50% of total supply')
    recommendations.push('Verify this is the intended amount')
  }

  // Warn if amount seems like a decimal mistake
  const uiAmount = Number(amount) / Math.pow(10, decimals)
  if (uiAmount > 1_000_000_000) {
    warnings.push('This is a very large amount')
    recommendations.push('Double-check the decimal places')
  }

  return {
    safe: warnings.length === 0,
    warnings,
    recommendations,
  }
}

/**
 * Check authority before a sensitive operation.
 *
 * This is a real on-chain check for mint/freeze authority: the mint account
 * is fetched, its owner is verified to be the SPL Token or Token-2022
 * program, and the authority stored in the mint layout is compared against
 * `expectedAuthority`.
 *
 * The 'update' (Metaplex metadata) authority cannot be checked here — it
 * lives in the metadata PDA, not the mint account — so that case is
 * reported honestly as NOT CHECKED (`checked: false`, `safe: false`).
 */
export async function checkAuthority(
  connection: Connection,
  mint: PublicKey,
  expectedAuthority: PublicKey,
  authorityType: 'mint' | 'freeze' | 'update'
): Promise<SecurityCheckResult> {
  if (authorityType === 'update') {
    return {
      safe: false,
      checked: false,
      warnings: ['NOT CHECKED — the metadata update authority lives in the Metaplex metadata account, which this check does not read'],
      recommendations: ['Fetch the metadata account and compare its updateAuthority field manually'],
    }
  }

  let accountInfo
  try {
    accountInfo = await connection.getAccountInfo(mint)
  } catch (error) {
    return {
      safe: false,
      checked: false,
      warnings: [`NOT CHECKED — could not fetch mint account: ${(error as Error).message}`],
      recommendations: ['Retry against a healthy RPC endpoint before relying on this check'],
    }
  }

  if (!accountInfo) {
    return {
      safe: false,
      warnings: ['Mint account not found'],
      recommendations: ['Verify the mint address is correct'],
    }
  }

  const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')
  if (!accountInfo.owner.equals(TOKEN_PROGRAM_ID) && !accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return {
      safe: false,
      warnings: [`Account is not owned by a token program (owner: ${accountInfo.owner.toBase58()}) — cannot parse authority`],
      recommendations: ['Verify the address is an SPL Token or Token-2022 mint'],
    }
  }

  // SPL Mint layout (shared by Token and Token-2022 for the first 82 bytes):
  //   mintAuthorityOption u32 @0, mintAuthority @4..36,
  //   supply u64 @36..44, decimals @44, isInitialized @45,
  //   freezeAuthorityOption u32 @46, freezeAuthority @50..82.
  if (accountInfo.data.length < 82) {
    return {
      safe: false,
      warnings: [`Account data too short for a mint (${accountInfo.data.length} bytes < 82) — cannot parse authority`],
      recommendations: ['Verify the address is a mint account, not a token account'],
    }
  }

  const data = accountInfo.data
  const optionOffset = authorityType === 'mint' ? 0 : 46
  const keyOffset = authorityType === 'mint' ? 4 : 50
  const hasAuthority = data.readUInt32LE(optionOffset) === 1

  if (!hasAuthority) {
    return {
      safe: false,
      warnings: [`The ${authorityType} authority has been revoked — no account holds it`],
      recommendations: [`Do not attempt ${authorityType} operations on this mint; they will fail on-chain`],
    }
  }

  const onChainAuthority = new PublicKey(data.subarray(keyOffset, keyOffset + 32))
  if (!onChainAuthority.equals(expectedAuthority)) {
    return {
      safe: false,
      warnings: [
        `${authorityType} authority mismatch — on-chain: ${onChainAuthority.toBase58()}, expected: ${expectedAuthority.toBase58()}`,
      ],
      recommendations: ['The transaction would fail on-chain; verify which account actually holds the authority'],
    }
  }

  return {
    safe: true,
    warnings: [],
    recommendations: [],
  }
}

/**
 * Pre-transaction security check
 */
export async function preTransactionCheck(options: {
  connection: Connection
  payer: PublicKey
  estimatedFee: number
  recipients?: string[]
  amount?: bigint
  isDestructive?: boolean
}): Promise<SecurityCheckResult> {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check balance
  const balanceCheck = await checkSufficientBalance(
    options.connection,
    options.payer,
    options.estimatedFee
  )
  warnings.push(...balanceCheck.warnings)
  recommendations.push(...balanceCheck.recommendations)

  // Check recipients
  if (options.recipients) {
    for (const recipient of options.recipients) {
      const repCheck = await checkAddressReputation(recipient)
      warnings.push(...repCheck.warnings)
      recommendations.push(...repCheck.recommendations)
    }
  }

  // Warn about destructive operations
  if (options.isDestructive) {
    warnings.push('This operation is irreversible')
    recommendations.push('Make sure you understand the consequences')
  }

  return {
    safe: warnings.filter(w => w.includes('Insufficient') || w.includes('Invalid')).length === 0,
    warnings,
    recommendations,
  }
}

/**
 * Check token configuration security
 */
export function checkTokenSecurity(options: {
  mintAuthority: string | null
  freezeAuthority: string | null
  supply: bigint
  decimals: number
  isMutable: boolean
}): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check mint authority
  if (options.mintAuthority) {
    recommendations.push('Consider revoking mint authority for fixed-supply tokens')
  }

  // Check freeze authority
  if (options.freezeAuthority) {
    warnings.push('Freeze authority is set - tokens can be frozen')
    recommendations.push('Consider revoking freeze authority for trustless tokens')
  }

  // Check mutability
  if (options.isMutable) {
    warnings.push('Token metadata is mutable')
    recommendations.push('Consider making metadata immutable after launch')
  }

  return {
    safe: true,
    warnings,
    recommendations,
  }
}

/**
 * Check NFT collection security
 */
export function checkCollectionSecurity(options: {
  updateAuthority: string
  royaltyBps: number
  creatorShares: number[]
  isMutable: boolean
  isVerified: boolean
}): SecurityCheckResult {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check royalty
  if (options.royaltyBps > 1000) {
    warnings.push(`High royalty: ${options.royaltyBps / 100}%`)
  }

  // Check creator shares
  const totalShares = options.creatorShares.reduce((a, b) => a + b, 0)
  if (totalShares !== 100) {
    warnings.push(`Creator shares don't sum to 100: ${totalShares}`)
  }

  // Check mutability
  if (options.isMutable) {
    warnings.push('Collection metadata is mutable')
    recommendations.push('Consider making immutable after launch')
  }

  // Check verification
  if (!options.isVerified) {
    warnings.push('Collection is not verified')
    recommendations.push('Verify the collection for marketplace visibility')
  }

  return {
    safe: warnings.filter(w => w.includes("don't sum")).length === 0,
    warnings,
    recommendations,
  }
}
