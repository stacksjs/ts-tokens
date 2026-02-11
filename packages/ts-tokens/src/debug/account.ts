/**
 * Account Debugging
 */

import type { Connection} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js'
import type { AccountInspection } from './types'

/**
 * Inspect an account
 */
export async function inspectAccount(
  connection: Connection,
  address: PublicKey
): Promise<AccountInspection> {
  const accountInfo = await connection.getAccountInfo(address)

  if (!accountInfo) {
    throw new Error(`Account not found: ${address.toBase58()}`)
  }

  const inspection: AccountInspection = {
    address,
    lamports: BigInt(accountInfo.lamports),
    owner: accountInfo.owner,
    executable: accountInfo.executable,
    rentEpoch: accountInfo.rentEpoch ?? 0,
    dataLength: accountInfo.data.length,
  }

  // Try to determine account type
  inspection.accountType = getAccountType(accountInfo.owner, accountInfo.data)

  // Try to parse data
  inspection.parsedData = tryParseAccountData(
    accountInfo.owner,
    accountInfo.data
  )

  return inspection
}

/**
 * Get account type based on owner and data
 */
function getAccountType(owner: PublicKey, data: Buffer): string {
  const ownerStr = owner.toBase58()

  // System Program
  if (ownerStr === '11111111111111111111111111111111') {
    return 'System Account'
  }

  // Token Program
  if (ownerStr === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
    if (data.length === 82) return 'Token Mint'
    if (data.length === 165) return 'Token Account'
    return 'Token Program Account'
  }

  // Token-2022
  if (ownerStr === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') {
    return 'Token-2022 Account'
  }

  // Metadata Program
  if (ownerStr === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s') {
    return 'Metadata Account'
  }

  return 'Unknown'
}

/**
 * Try to parse account data
 */
function tryParseAccountData(
  owner: PublicKey,
  data: Buffer
): Record<string, unknown> | undefined {
  const ownerStr = owner.toBase58()

  // Token Mint
  if (ownerStr === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && data.length === 82) {
    return {
      mintAuthority: data.slice(0, 32).some(b => b !== 0)
        ? new PublicKey(data.slice(4, 36)).toBase58()
        : null,
      supply: data.readBigUInt64LE(36),
      decimals: data[44],
      isInitialized: data[45] === 1,
      freezeAuthority: data[46] === 1
        ? new PublicKey(data.slice(47, 79)).toBase58()
        : null,
    }
  }

  // Token Account
  if (ownerStr === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && data.length === 165) {
    return {
      mint: new PublicKey(data.slice(0, 32)).toBase58(),
      owner: new PublicKey(data.slice(32, 64)).toBase58(),
      amount: data.readBigUInt64LE(64),
      delegateOption: data[72],
      delegate: data[72] === 1
        ? new PublicKey(data.slice(76, 108)).toBase58()
        : null,
      state: data[108],
      isNativeOption: data[109],
      delegatedAmount: data.readBigUInt64LE(121),
      closeAuthorityOption: data[129],
      closeAuthority: data[129] === 1
        ? new PublicKey(data.slice(130, 162)).toBase58()
        : null,
    }
  }

  return undefined
}

/**
 * Format account inspection for display
 */
export function formatAccountInspection(inspection: AccountInspection): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════',
    `Account: ${inspection.address.toBase58()}`,
    '═══════════════════════════════════════════════════════════',
    '',
    `Type: ${inspection.accountType ?? 'Unknown'}`,
    `Balance: ${Number(inspection.lamports) / 1e9} SOL`,
    `Owner: ${inspection.owner.toBase58()}`,
    `Executable: ${inspection.executable}`,
    `Data Length: ${inspection.dataLength} bytes`,
    `Rent Epoch: ${inspection.rentEpoch}`,
  ]

  if (inspection.parsedData) {
    lines.push('', '─── Parsed Data ───')
    for (const [key, value] of Object.entries(inspection.parsedData)) {
      const displayValue = typeof value === 'bigint' ? value.toString() : String(value)
      lines.push(`  ${key}: ${displayValue}`)
    }
  }

  return lines.join('\n')
}

/**
 * Get account balance history (requires archive node)
 */
export async function getBalanceHistory(
  connection: Connection,
  address: PublicKey,
  slots: number[]
): Promise<Array<{ slot: number; balance: bigint | null }>> {
  const results: Array<{ slot: number; balance: bigint | null }> = []

  for (const slot of slots) {
    try {
      // Note: This requires archive node access
      const balance = await connection.getBalance(address, { minContextSlot: slot })
      results.push({ slot, balance: BigInt(balance) })
    } catch {
      results.push({ slot, balance: null })
    }
  }

  return results
}

/**
 * Compare account state before and after transaction
 */
export async function diffAccountState(
  connection: Connection,
  address: PublicKey,
  beforeSlot: number,
  afterSlot: number
): Promise<{
  before: AccountInspection | null
  after: AccountInspection | null
  changes: string[]
}> {
  // In production, would fetch historical state
  const after = await inspectAccount(connection, address)

  return {
    before: null, // Would need archive node
    after,
    changes: [],
  }
}

/**
 * Find related accounts
 */
export async function findRelatedAccounts(
  connection: Connection,
  address: PublicKey
): Promise<{
  tokenAccounts: PublicKey[]
  ownedAccounts: PublicKey[]
}> {
  // Get token accounts owned by this address
  const tokenAccounts = await connection.getTokenAccountsByOwner(address, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  })

  return {
    tokenAccounts: tokenAccounts.value.map(ta => ta.pubkey),
    ownedAccounts: [], // Would need to search
  }
}
