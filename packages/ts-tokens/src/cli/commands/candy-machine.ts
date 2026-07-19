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

export async function candyAdd(candyMachine: string, itemsFile: string, options: { offset?: string } = {}): Promise<void> {
  try {
    const config = await getConfig()
    const { addConfigLines } = await import('../../nft/candy-machine/create')
    const fs = await import('node:fs')

    const content = fs.readFileSync(itemsFile, 'utf-8')
    const items: Array<{ name: string; uri: string }> = JSON.parse(content)

    // Append after the last loaded config line instead of always writing at
    // index 0 (which overwrites existing lines). --offset overrides.
    let startIndex: number
    if (options.offset !== undefined) {
      startIndex = parseInt(options.offset)
      if (!Number.isFinite(startIndex) || startIndex < 0) {
        error(`Invalid --offset: ${options.offset}`)
        process.exit(1)
      }
    } else {
      const { getCandyMachineItems } = await import('../../nft/candy-machine/query')
      const loaded = await withSpinner('Reading loaded config lines', () =>
        getCandyMachineItems(candyMachine, config),
      )
      startIndex = loaded.length === 0 ? 0 : Math.max(...loaded.map(i => i.index)) + 1
    }

    info(`Adding ${items.length} config line(s) starting at index ${startIndex}`)

    const result = await withSpinner(
      `Adding ${items.length} config lines to ${candyMachine}`,
      () => addConfigLines(candyMachine, startIndex, items, config),
      'Config lines added'
    )

    keyValue('Start index', String(startIndex))
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

/**
 * Withdraw all lamports from a Candy Machine account, closing it. Candy Machine
 * v3 has a single `withdraw` instruction that both drains rent and closes the
 * account — there is no separate "collect balance without closing" operation.
 */
export async function candyWithdraw(candyMachine: string): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { withdraw } = await import('../../programs/candy-machine/instructions')
    const { PublicKey, Transaction } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const payer = loadWallet(config)
    const pubkey = new PublicKey(candyMachine)
    const accountInfo = await connection.getAccountInfo(pubkey)

    if (!accountInfo) {
      error('Candy Machine not found')
      process.exit(1)
    }

    header('Candy Machine Withdrawal')
    keyValue('Address', candyMachine)
    keyValue('Rent to reclaim', formatSol(accountInfo.lamports))
    keyValue('Authority', payer.publicKey.toBase58())

    const signature = await withSpinner('Withdrawing and closing Candy Machine', async () => {
      const instruction = withdraw({ candyMachine: pubkey, authority: payer.publicKey })
      const transaction = new Transaction().add(instruction)
      transaction.feePayer = payer.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.sign(payer)

      const sig = await connection.sendRawTransaction(transaction.serialize())
      await connection.confirmTransaction(sig)
      return sig
    }, 'Candy Machine withdrawn and closed')

    keyValue('Signature', signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Delete a Candy Machine. Candy Machine v3 exposes no dedicated delete/close
 * instruction distinct from `withdraw` — withdrawing drains the rent and closes
 * the account. This command therefore delegates to the same on-chain path.
 */
export async function candyDelete(candyMachine: string): Promise<void> {
  info('Candy Machine v3 has no separate delete instruction; closing via withdraw.')
  await candyWithdraw(candyMachine)
}

export async function candyUpload(assetsPath: string, options: { storage?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { getStorageAdapter } = await import('../../storage')

    const resolved = path.resolve(assetsPath)
    if (!fs.existsSync(resolved)) {
      error(`Path not found: ${resolved}`)
      process.exit(1)
    }

    const provider = options.storage || config.storageProvider || 'arweave'

    let adapter
    try {
      adapter = getStorageAdapter(provider as any, config)
    } catch (err) {
      error(`Storage provider "${provider}" is not available: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    const stats = fs.statSync(resolved)
    const filePaths: string[] = stats.isDirectory()
      ? fs.readdirSync(resolved)
          .map((f: string) => path.join(resolved, f))
          .filter((p: string) => fs.statSync(p).isFile())
      : [resolved]

    header('Assets Upload')
    keyValue('Source', resolved)
    keyValue('Files', String(filePaths.length))
    keyValue('Storage provider', provider)

    const results: Array<{ file: string; uri: string }> = []
    for (const filePath of filePaths) {
      const uri = await withSpinner(`Uploading ${path.basename(filePath)}`, async () => {
        // Storage adapters read the file themselves and return { url, ... }.
        const uploaded = await adapter.uploadFile(filePath)
        return uploaded.url
      }, `Uploaded ${path.basename(filePath)}`)
      results.push({ file: path.basename(filePath), uri })
    }

    header('Upload Results')
    for (const r of results) {
      keyValue(r.file, r.uri)
    }
    success(`Uploaded ${results.length} file(s)`)

    // Uploading only puts the files on storage — it does NOT create config
    // lines on the Candy Machine. Point at the follow-up command.
    info('')
    info('Next steps:')
    info('  1. Create an items JSON file mapping item names to the uploaded URIs:')
    info('       [{ "name": "NFT #1", "uri": "https://…" }, …]')
    info('  2. Add them to your Candy Machine:')
    info('       tokens candy:add <candy-machine> <items-file>')
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
    const { findCandyGuardPda } = await import('../../programs/candy-machine/pda')
    const { parseCandyGuard } = await import('../../programs/candy-machine/accounts')
    const { GuardType } = await import('../../programs/candy-machine/guards')

    const connection = createConnection(config)
    const pubkey = new PublicKey(candyMachine)

    // The candy machine itself is wrapped by a Candy Guard PDA derived from its
    // address; that PDA holds the enabled guards.
    const [guardPda] = findCandyGuardPda(pubkey)
    const guardAccount = await connection.getAccountInfo(guardPda)

    if (!guardAccount) {
      error('No Candy Guard account found for this Candy Machine')
      info(`Expected guard PDA: ${guardPda.toBase58()}`)
      process.exit(1)
    }

    const guard = parseCandyGuard(guardAccount.data)

    // The first 8 bytes of the guard data are the features bitmap: bit N set
    // means guard N (GuardType) is enabled.
    let features = 0n
    if (guard.guardData.length >= 8) {
      features = guard.guardData.readBigUInt64LE(0)
    }

    const enabled: string[] = []
    for (const [name, value] of Object.entries(GuardType)) {
      if (typeof value !== 'number') continue
      if ((features & (1n << BigInt(value))) !== 0n) {
        enabled.push(name)
      }
    }

    header('Candy Machine Guards')
    keyValue('Candy Machine', candyMachine)
    keyValue('Guard PDA', guardPda.toBase58())
    keyValue('Authority', guard.authority.toBase58())
    if (enabled.length === 0) {
      info('No guards enabled')
    } else {
      keyValue('Enabled guards', enabled.join(', '))
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
