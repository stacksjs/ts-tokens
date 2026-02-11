/**
 * Candy Machine Query Functions
 *
 * Query and inspect Candy Machine state.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig } from '../../types'
import { createConnection } from '../../drivers/solana/connection'
import { deserializeCandyMachine } from '../../programs/candy-machine/accounts'

/**
 * Structured Candy Machine info
 */
export interface CandyMachineInfo {
  address: string
  authority: string
  mintAuthority: string
  collectionMint: string
  itemsAvailable: number
  itemsRedeemed: number
  itemsRemaining: number
  symbol: string
  sellerFeeBasisPoints: number
  isMutable: boolean
  maxSupply: number
  creators: Array<{
    address: string
    verified: boolean
    share: number
  }>
  configLineSettings: {
    prefixName: string
    nameLength: number
    prefixUri: string
    uriLength: number
    isSequential: boolean
  } | null
  hiddenSettings: {
    name: string
    uri: string
    hash: Uint8Array
  } | null
}

/**
 * Get full Candy Machine information
 */
export async function getCandyMachineInfo(
  candyMachine: string,
  config: TokenConfig
): Promise<CandyMachineInfo> {
  const connection = createConnection(config)
  const pubkey = new PublicKey(candyMachine)

  const accountInfo = await connection.getAccountInfo(pubkey)
  if (!accountInfo) {
    throw new Error('Candy Machine account not found')
  }

  const cm = deserializeCandyMachine(accountInfo.data as Buffer)
  const itemsAvailable = Number(cm.data.itemsAvailable)
  const itemsRedeemed = Number(cm.itemsRedeemed)

  return {
    address: candyMachine,
    authority: cm.authority.toBase58(),
    mintAuthority: cm.mintAuthority.toBase58(),
    collectionMint: cm.collectionMint.toBase58(),
    itemsAvailable,
    itemsRedeemed,
    itemsRemaining: itemsAvailable - itemsRedeemed,
    symbol: cm.data.symbol,
    sellerFeeBasisPoints: cm.data.sellerFeeBasisPoints,
    isMutable: cm.data.isMutable,
    maxSupply: Number(cm.data.maxSupply),
    creators: cm.data.creators.map(c => ({
      address: c.address.toBase58(),
      verified: c.verified,
      share: c.percentageShare,
    })),
    configLineSettings: cm.data.configLineSettings,
    hiddenSettings: cm.data.hiddenSettings,
  }
}

/**
 * Get number of items available in a Candy Machine
 */
export async function getLoadedItems(
  candyMachine: string,
  config: TokenConfig
): Promise<number> {
  const info = await getCandyMachineInfo(candyMachine, config)
  return info.itemsAvailable
}

/**
 * Get number of minted/redeemed items from a Candy Machine
 */
export async function getMintedItems(
  candyMachine: string,
  config: TokenConfig
): Promise<number> {
  const info = await getCandyMachineInfo(candyMachine, config)
  return info.itemsRedeemed
}

/**
 * Config line item from candy machine
 */
export interface CandyMachineItem {
  index: number
  name: string
  uri: string
}

/**
 * Get config line items from a Candy Machine
 *
 * Parses the config lines section from the account data.
 */
export async function getCandyMachineItems(
  candyMachine: string,
  config: TokenConfig
): Promise<CandyMachineItem[]> {
  const connection = createConnection(config)
  const pubkey = new PublicKey(candyMachine)

  const accountInfo = await connection.getAccountInfo(pubkey)
  if (!accountInfo) {
    throw new Error('Candy Machine account not found')
  }

  const data = accountInfo.data as Buffer
  const cm = deserializeCandyMachine(data)

  if (!cm.data.configLineSettings) {
    return []
  }

  const settings = cm.data.configLineSettings
  const itemsAvailable = Number(cm.data.itemsAvailable)
  const lineSize = settings.nameLength + settings.uriLength

  // Config lines start after the fixed header section
  // The header is variable length, so we calculate the config lines offset
  // by working backwards from the total account size
  const configLinesStart = data.length - (itemsAvailable * lineSize) - Math.ceil(itemsAvailable / 8)

  const items: CandyMachineItem[] = []

  // The bitmap tracking which items are set is at the end of the account
  const bitmapStart = data.length - Math.ceil(itemsAvailable / 8)

  for (let i = 0; i < itemsAvailable; i++) {
    // Check if this config line has been set via the bitmap
    const byteIndex = Math.floor(i / 8)
    const bitIndex = i % 8
    const isSet = (data[bitmapStart + byteIndex] & (1 << bitIndex)) !== 0

    if (!isSet) continue

    const offset = configLinesStart + (i * lineSize)
    const name = settings.prefixName + data.subarray(offset, offset + settings.nameLength).toString('utf8').replace(/\0/g, '')
    const uri = settings.prefixUri + data.subarray(offset + settings.nameLength, offset + lineSize).toString('utf8').replace(/\0/g, '')

    items.push({ index: i, name, uri })
  }

  return items
}
