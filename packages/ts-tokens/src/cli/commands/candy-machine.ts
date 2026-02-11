/** Candy Machine CLI command handlers. */

import { success, error, keyValue, header, info, formatSol } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function candyCreate(options: {
  items?: string
  symbol?: string
  royalty?: string
  collection?: string
  config?: string
}): Promise<void> {
  try {
    let fileConfig: Record<string, any> = {}

    if (options.config) {
      const fs = await import('node:fs')
      const path = await import('node:path')
      const resolved = path.resolve(options.config)

      if (!fs.existsSync(resolved)) {
        error(`Config file not found: ${resolved}`)
        process.exit(1)
      }

      try {
        fileConfig = JSON.parse(fs.readFileSync(resolved, 'utf-8'))
      } catch {
        error('Invalid JSON in config file')
        process.exit(1)
      }
    }

    const collection = options.collection || fileConfig.collection
    const items = options.items || fileConfig.items?.toString() || fileConfig.itemsAvailable?.toString()

    if (!collection || !items) {
      error('--collection and --items are required (via flags or config file)')
      process.exit(1)
    }

    const config = await getConfig()
    const { createCandyMachine } = await import('../../nft/candy-machine/create')

    const result = await withSpinner(
      'Creating Candy Machine',
      () => createCandyMachine({
        itemsAvailable: parseInt(items),
        symbol: options.symbol || fileConfig.symbol || '',
        sellerFeeBasisPoints: options.royalty ? parseInt(options.royalty) : (fileConfig.sellerFeeBasisPoints ?? 0),
        maxEditionSupply: fileConfig.maxEditionSupply ?? 0,
        isMutable: fileConfig.isMutable ?? true,
        creators: fileConfig.creators ?? [],
        collection,
        configLineSettings: fileConfig.configLineSettings ?? {
          prefixName: '',
          nameLength: 32,
          prefixUri: '',
          uriLength: 200,
          isSequential: false,
        },
        ...(fileConfig.hiddenSettings ? { hiddenSettings: fileConfig.hiddenSettings } : {}),
      }, config),
      'Candy Machine created'
    )

    keyValue('Address', result.candyMachine)
    keyValue('Collection', result.collection)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function candyAdd(candyMachine: string, itemsFile: string): Promise<void> {
  try {
    const config = await getConfig()
    const { addConfigLines } = await import('../../nft/candy-machine/create')
    const fs = await import('node:fs')

    const content = fs.readFileSync(itemsFile, 'utf-8')
    const items: Array<{ name: string; uri: string }> = JSON.parse(content)

    const result = await withSpinner(
      `Adding ${items.length} config lines to ${candyMachine}`,
      () => addConfigLines(candyMachine, 0, items, config),
      'Config lines added'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function candyMint(candyMachine: string, options: { count?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const { mintFromCandyMachine } = await import('../../nft/candy-machine/create')

    const count = parseInt(options.count || '1')

    for (let i = 0; i < count; i++) {
      const result = await withSpinner(
        `Minting NFT ${i + 1}/${count}`,
        () => mintFromCandyMachine(candyMachine, config),
        `Minted NFT ${i + 1}/${count}`
      )

      keyValue('Mint', result.mint)
      keyValue('Signature', result.signature)
    }

    success('All mints complete')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function candyInfo(candyMachine: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const pubkey = new PublicKey(candyMachine)
    const accountInfo = await connection.getAccountInfo(pubkey)

    if (!accountInfo) {
      error('Candy Machine not found')
      process.exit(1)
    }

    header('Candy Machine Information')
    keyValue('Address', candyMachine)
    keyValue('Owner', accountInfo.owner.toBase58())
    keyValue('Data Size', `${accountInfo.data.length} bytes`)
    keyValue('Lamports', String(accountInfo.lamports))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function candyWithdraw(candyMachine: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const payer = loadWallet(config)
    const pubkey = new PublicKey(candyMachine)
    const accountInfo = await connection.getAccountInfo(pubkey)

    if (!accountInfo) {
      error('Candy Machine not found')
      process.exit(1)
    }

    header('Candy Machine Balance')
    keyValue('Address', candyMachine)
    keyValue('Balance', formatSol(accountInfo.lamports))
    keyValue('Owner', payer.publicKey.toBase58())
    info('Full withdrawal requires closing the Candy Machine account on-chain.')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function candyDelete(candyMachine: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const pubkey = new PublicKey(candyMachine)
    const accountInfo = await connection.getAccountInfo(pubkey)

    if (!accountInfo) {
      error('Candy Machine not found')
      process.exit(1)
    }

    header('Candy Machine Deletion')
    keyValue('Address', candyMachine)
    keyValue('Rent to reclaim', formatSol(accountInfo.lamports))
    info('Deletion requires sending a close instruction to the Candy Machine program.')
    info('This will reclaim the rent and close the account permanently.')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function candyUpload(assetsPath: string, options: { storage?: string }): Promise<void> {
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const resolved = path.resolve(assetsPath)
    if (!fs.existsSync(resolved)) {
      error(`Path not found: ${resolved}`)
      process.exit(1)
    }

    const stats = fs.statSync(resolved)
    const provider = options.storage || 'arweave'

    if (stats.isDirectory()) {
      const files = fs.readdirSync(resolved)

      header('Assets Upload')
      keyValue('Directory', resolved)
      keyValue('Files', String(files.length))
      keyValue('Storage provider', provider)

      info('Files to upload:')
      for (const file of files.slice(0, 10)) {
        info(`  ${file}`)
      }
      if (files.length > 10) {
        info(`  ... and ${files.length - 10} more`)
      }
    } else {
      header('Asset Upload')
      keyValue('File', resolved)
      keyValue('Size', `${stats.size} bytes`)
      keyValue('Storage provider', provider)
    }

    info('Upload requires a funded storage provider account.')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function candyGuards(candyMachine: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const pubkey = new PublicKey(candyMachine)
    const accountInfo = await connection.getAccountInfo(pubkey)

    if (!accountInfo) {
      error('Candy Machine not found')
      process.exit(1)
    }

    header('Candy Machine Guards')
    keyValue('Address', candyMachine)
    keyValue('Data Size', `${accountInfo.data.length} bytes`)
    info('Guard parsing requires decoding the Candy Guard account data.')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
