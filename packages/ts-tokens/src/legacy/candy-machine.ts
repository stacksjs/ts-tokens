/**
 * Legacy Candy Machine Support
 *
 * Read and manage Candy Machine v1/v2/v3 instances.
 */

import type { TokenConfig, TransactionResult, TransactionOptions } from '../types'
import type { LegacyCandyMachineInfo, CandyMachineVersion } from '../types/legacy'
import { CandyMachineVersion as CMV } from '../types/legacy'

/** Known Candy Machine program IDs */
const CM_V1_PROGRAM_ID = 'cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ'
const CM_V2_PROGRAM_ID = 'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ'
const CM_V3_PROGRAM_ID = 'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR'

/**
 * Detect candy machine version by owner program ID
 */
function detectVersion(ownerProgram: string): CandyMachineVersion {
  switch (ownerProgram) {
    case CM_V1_PROGRAM_ID: return CMV.V1
    case CM_V2_PROGRAM_ID: return CMV.V2
    case CM_V3_PROGRAM_ID: return CMV.V3
    default: return CMV.V3
  }
}

/**
 * Get candy machine information
 *
 * Detects version automatically and returns a unified info object.
 */
export async function getCandyMachineInfo(
  address: string,
  config: TokenConfig
): Promise<LegacyCandyMachineInfo> {
  const { PublicKey } = await import('@solana/web3.js')
  const { createConnection } = await import('../drivers/solana/connection')

  const connection = createConnection(config)
  const cmPubkey = new PublicKey(address)

  const accountInfo = await connection.getAccountInfo(cmPubkey)
  if (!accountInfo) {
    throw new Error(`Candy Machine not found: ${address}`)
  }

  const version = detectVersion(accountInfo.owner.toBase58())

  if (version === CMV.V3) {
    const { deserializeCandyMachine } = await import('../programs/candy-machine/accounts')
    const cm = deserializeCandyMachine(accountInfo.data as Buffer)

    return {
      address,
      version,
      authority: cm.authority.toBase58(),
      collectionMint: cm.collectionMint.toBase58(),
      itemsAvailable: Number(cm.data.itemsAvailable),
      itemsRedeemed: Number(cm.itemsRedeemed),
      symbol: cm.data.symbol,
      sellerFeeBasisPoints: cm.data.sellerFeeBasisPoints,
      isMutable: cm.data.isMutable,
      creators: cm.data.creators.map(c => ({
        address: c.address.toBase58(),
        verified: c.verified,
        share: c.percentageShare,
      })),
      configLineSettings: cm.data.configLineSettings ?? null,
      hiddenSettings: cm.data.hiddenSettings
        ? {
            name: cm.data.hiddenSettings.name,
            uri: cm.data.hiddenSettings.uri,
            hash: Buffer.from(cm.data.hiddenSettings.hash).toString('hex'),
          }
        : null,
    }
  }

  // For v1/v2, parse basic header fields
  const data = accountInfo.data as Buffer
  let offset = 8 // Skip discriminator

  // Basic v1/v2 parsing (authority at first 32 bytes after discriminator)
  const authority = new PublicKey(data.subarray(offset, offset + 32)).toBase58()
  offset += 32

  return {
    address,
    version,
    authority,
    collectionMint: '',
    itemsAvailable: 0,
    itemsRedeemed: 0,
    symbol: '',
    sellerFeeBasisPoints: 0,
    isMutable: true,
    creators: [],
    configLineSettings: null,
    hiddenSettings: null,
  }
}

/**
 * Update a Candy Machine (v3 only)
 */
export async function updateCandyMachine(
  address: string,
  updates: {
    symbol?: string
    sellerFeeBasisPoints?: number
    isMutable?: boolean
    maxSupply?: number
  },
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { deserializeCandyMachine } = await import('../programs/candy-machine/accounts')
  const { updateCandyMachine: updateCM } = await import('../programs/candy-machine/instructions')

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const cmPubkey = new PublicKey(address)

  // Fetch current state
  const accountInfo = await connection.getAccountInfo(cmPubkey)
  if (!accountInfo) {
    throw new Error(`Candy Machine not found: ${address}`)
  }

  const cm = deserializeCandyMachine(accountInfo.data as Buffer)

  // Build updated data
  const updatedData = {
    ...cm.data,
    symbol: updates.symbol ?? cm.data.symbol,
    sellerFeeBasisPoints: updates.sellerFeeBasisPoints ?? cm.data.sellerFeeBasisPoints,
    isMutable: updates.isMutable ?? cm.data.isMutable,
    maxSupply: updates.maxSupply !== undefined ? BigInt(updates.maxSupply) : cm.data.maxSupply,
  }

  const instruction = updateCM({
    candyMachine: cmPubkey,
    authority: payer.publicKey,
    data: updatedData,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Withdraw funds from a Candy Machine (v3 only)
 */
export async function withdrawCandyMachineFunds(
  address: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const { PublicKey } = await import('@solana/web3.js')
  const { loadWallet } = await import('../drivers/solana/wallet')
  const { createConnection } = await import('../drivers/solana/connection')
  const { buildTransaction, sendAndConfirmTransaction } = await import('../drivers/solana/transaction')
  const { withdraw } = await import('../programs/candy-machine/instructions')

  const connection = createConnection(config)
  const payer = loadWallet(config)
  const cmPubkey = new PublicKey(address)

  const instruction = withdraw({
    candyMachine: cmPubkey,
    authority: payer.publicKey,
  })

  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    options
  )

  transaction.partialSign(payer)

  return sendAndConfirmTransaction(connection, transaction, options)
}

/**
 * Close a Candy Machine by withdrawing all funds
 *
 * Alias for withdrawCandyMachineFunds - closing a CM is equivalent to withdrawing.
 */
export async function closeCandyMachine(
  address: string,
  config: TokenConfig,
  options?: TransactionOptions
): Promise<TransactionResult> {
  return withdrawCandyMachineFunds(address, config, options)
}
