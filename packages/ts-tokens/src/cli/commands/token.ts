/** Token CLI command handlers. */

import { success, error, keyValue, header, info, formatAddress } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

export async function tokenCreate(options: {
  name?: string
  symbol?: string
  decimals?: string
  supply?: string
  metadataUri?: string
  token2022?: boolean
  transferFee?: string
  maxFee?: string
  interestRate?: string
  soulbound?: boolean
  confidential?: boolean
  defaultFrozen?: boolean
}): Promise<void> {
  if (!options.name || !options.symbol) {
    error('--name and --symbol are required')
    process.exit(1)
  }

  const config = await getConfig()
  const { createToken } = await import('../../token/create')

  const extensions: Array<any> = []
  let useToken2022 = options.token2022 || false

  if (options.transferFee) {
    useToken2022 = true
    extensions.push({
      type: 'transferFee',
      feeBasisPoints: parseInt(options.transferFee),
      maxFee: BigInt(options.maxFee || '1000000000'),
      feeAuthority: '',
      withdrawAuthority: '',
    })
  }

  if (options.interestRate) {
    useToken2022 = true
    extensions.push({
      type: 'interestBearing',
      rate: parseInt(options.interestRate),
      rateAuthority: '',
    })
  }

  if (options.soulbound) {
    useToken2022 = true
    extensions.push({ type: 'nonTransferable' })
  }

  if (options.confidential) {
    useToken2022 = true
    extensions.push({ type: 'confidentialTransfer' })
  }

  if (options.defaultFrozen) {
    useToken2022 = true
    extensions.push({ type: 'defaultAccountState', state: 'frozen' })
  }

  if (useToken2022) {
    info('Program: Token-2022')
    if (extensions.length > 0) {
      info(`Extensions: ${extensions.map((e: any) => e.type).join(', ')}`)
    }
  }

  try {
    const result = await withSpinner('Creating token', () =>
      createToken({
        name: options.name!,
        symbol: options.symbol!,
        decimals: parseInt(options.decimals || '9'),
        initialSupply: options.supply ? BigInt(options.supply) : undefined,
        uri: options.metadataUri,
        useToken2022,
        extensions: extensions.length > 0 ? extensions : undefined,
      }, config),
      'Token created successfully',
    )

    keyValue('Mint', result.mint)
    keyValue('Signature', result.signature)
    if (result.metadataAddress) {
      keyValue('Metadata', result.metadataAddress)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenMint(mint: string, amount: string, options: { to?: string }): Promise<void> {
  const config = await getConfig()
  const { mintTokens } = await import('../../token/mint')

  try {
    const result = await withSpinner(`Minting ${amount} tokens`, () =>
      mintTokens({
        mint,
        amount: BigInt(amount),
        destination: options.to,
      }, config),
      'Tokens minted successfully',
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenTransfer(mint: string, amount: string, to: string): Promise<void> {
  const config = await getConfig()
  const { transfer } = await import('../../token/transfer')

  try {
    const result = await withSpinner(`Transferring ${amount} tokens to ${formatAddress(to)}`, () =>
      transfer(mint, to, BigInt(amount), config),
      'Transfer successful',
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenBurn(mint: string, amount: string): Promise<void> {
  const config = await getConfig()
  const { burn } = await import('../../token/burn')

  try {
    const result = await withSpinner(`Burning ${amount} tokens`, () =>
      burn(mint, BigInt(amount), config),
      'Tokens burned successfully',
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenInfo(mint: string): Promise<void> {
  const config = await getConfig()
  const { getMintInfo } = await import('../../drivers/solana/account')
  const { createConnection } = await import('../../drivers/solana/connection')

  try {
    const connection = createConnection(config)
    const mintInfo = await getMintInfo(connection, mint)

    header('Token Information')
    keyValue('Mint', mint)
    keyValue('Supply', String(mintInfo.supply))
    keyValue('Decimals', String(mintInfo.decimals))
    keyValue('Mint Authority', mintInfo.mintAuthority || 'None (fixed supply)')
    keyValue('Freeze Authority', mintInfo.freezeAuthority || 'None')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenBalance(mint: string): Promise<void> {
  const config = await getConfig()
  const { getTokenBalance } = await import('../../drivers/solana/account')
  const { getPublicKey } = await import('../../drivers/solana/wallet')
  const { createConnection } = await import('../../drivers/solana/connection')

  try {
    const connection = createConnection(config)
    const owner = getPublicKey(config)
    const balance = await getTokenBalance(connection, owner, mint)

    keyValue('Token', mint)
    keyValue('Balance', String(balance))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenHolders(mint: string, options: { limit?: string }): Promise<void> {
  const config = await getConfig()
  const { getTokenHolders } = await import('../../token/query')

  try {
    const limit = parseInt(options.limit || '20')
    const holders = await withSpinner('Fetching holders', () =>
      getTokenHolders(mint, config, { limit }),
    )

    if (holders.length === 0) {
      info('No holders found')
      return
    }

    header(`Holders (${holders.length})`)

    const ownerWidth = 44
    const balanceWidth = 15
    const pctWidth = 7

    console.log(`  ${'Owner'.padEnd(ownerWidth)}  ${'Balance'.padStart(balanceWidth)}  ${'%'.padStart(pctWidth)}`)
    console.log(`  ${'-'.repeat(ownerWidth)}  ${'-'.repeat(balanceWidth)}  ${'-'.repeat(pctWidth)}`)

    for (const holder of holders) {
      const ownerDisplay = holder.owner.length > ownerWidth
        ? holder.owner.slice(0, 20) + '...' + holder.owner.slice(-20)
        : holder.owner.padEnd(ownerWidth)
      console.log(`  ${ownerDisplay}  ${holder.balance.toString().padStart(balanceWidth)}  ${(holder.percentage.toFixed(2) + '%').padStart(pctWidth)}`)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenAuthority(mint: string, options: {
  revokeMint?: boolean
  revokeFreeze?: boolean
  transferMint?: string
  transferFreeze?: string
}): Promise<void> {
  const config = await getConfig()

  try {
    if (!options.revokeMint && !options.revokeFreeze && !options.transferMint && !options.transferFreeze) {
      const { getMintInfo } = await import('../../drivers/solana/account')
      const { createConnection } = await import('../../drivers/solana/connection')

      const connection = createConnection(config)
      const mintInfo = await getMintInfo(connection, mint)

      header('Token Authorities')
      keyValue('Mint', mint)
      keyValue('Mint Authority', mintInfo.mintAuthority || 'None (revoked)')
      keyValue('Freeze Authority', mintInfo.freezeAuthority || 'None (revoked)')
      return
    }

    if (options.revokeMint) {
      const { revokeMintAuthority } = await import('../../token/authority')
      const result = await withSpinner('Revoking mint authority', () =>
        revokeMintAuthority(mint, config),
        'Mint authority revoked',
      )
      keyValue('Signature', result.signature)
    }

    if (options.revokeFreeze) {
      const { revokeFreezeAuthority } = await import('../../token/authority')
      const result = await withSpinner('Revoking freeze authority', () =>
        revokeFreezeAuthority(mint, config),
        'Freeze authority revoked',
      )
      keyValue('Signature', result.signature)
    }

    if (options.transferMint) {
      const { setMintAuthority } = await import('../../token/authority')
      const result = await withSpinner(`Transferring mint authority to ${formatAddress(options.transferMint)}`, () =>
        setMintAuthority(mint, options.transferMint!, config),
        'Mint authority transferred',
      )
      keyValue('Signature', result.signature)
    }

    if (options.transferFreeze) {
      const { setFreezeAuthority } = await import('../../token/authority')
      const result = await withSpinner(`Transferring freeze authority to ${formatAddress(options.transferFreeze)}`, () =>
        setFreezeAuthority(mint, options.transferFreeze!, config),
        'Freeze authority transferred',
      )
      keyValue('Signature', result.signature)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenCreate2022(options: {
  name?: string
  symbol?: string
  decimals?: string
  extensions?: string
  transferFeeBps?: string
  maxFee?: string
}): Promise<void> {
  if (!options.name || !options.symbol) {
    error('--name and --symbol are required')
    process.exit(1)
  }

  const config = await getConfig()
  const { createToken2022 } = await import('../../token/token2022')

  try {
    const extNames = (options.extensions || '').split(',').filter(Boolean)
    const extensions: any[] = []

    for (const ext of extNames) {
      switch (ext.trim()) {
        case 'transferFee':
          extensions.push({
            type: 'transferFee',
            feeBasisPoints: parseInt(options.transferFeeBps || '100'),
            maxFee: BigInt(options.maxFee || '1000000000'),
            feeAuthority: '',
            withdrawAuthority: '',
          })
          break
        case 'nonTransferable':
          extensions.push({ type: 'nonTransferable' })
          break
        case 'defaultFrozen':
          extensions.push({ type: 'defaultAccountState', state: 'frozen' })
          break
      }
    }

    info(`Extensions: ${extensions.map(e => e.type).join(', ') || 'none'}`)

    const result = await withSpinner('Creating Token-2022', () =>
      createToken2022({
        name: options.name!,
        symbol: options.symbol!,
        decimals: parseInt(options.decimals || '9'),
        extensions,
      }, config),
      'Token-2022 created',
    )

    keyValue('Mint', result.mint)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenMetadata(mint: string, options: {
  name?: string
  symbol?: string
  uri?: string
}): Promise<void> {
  if (!options.name || !options.symbol || !options.uri) {
    error('--name, --symbol, and --uri are required')
    process.exit(1)
  }

  const config = await getConfig()
  const { setEmbeddedMetadata } = await import('../../token/embedded-metadata')

  try {
    const result = await withSpinner(`Setting embedded metadata on ${formatAddress(mint)}`, () =>
      setEmbeddedMetadata(mint, {
        name: options.name!,
        symbol: options.symbol!,
        uri: options.uri!,
      }, config),
      'Metadata set',
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenGroup(mint: string, options: { maxSize?: string }): Promise<void> {
  const config = await getConfig()
  const { createTokenGroup } = await import('../../token/token-group')

  try {
    const result = await withSpinner(`Creating token group on ${formatAddress(mint)}`, () =>
      createTokenGroup(mint, parseInt(options.maxSize || '100'), config),
      'Token group created',
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenHarvestFees(mint: string, options: {
  withdraw?: boolean
  destination?: string
}): Promise<void> {
  const config = await getConfig()
  const { harvestTransferFees } = await import('../../token/fee-harvester')

  try {
    const result = await withSpinner(`Harvesting transfer fees for ${formatAddress(mint)}`, () =>
      harvestTransferFees(mint, config, {
        withdraw: options.withdraw,
        destination: options.destination,
      }),
      'Fees harvested',
    )

    keyValue('Accounts Processed', String(result.accountsProcessed))
    if (result.harvestSignature) {
      keyValue('Harvest Signature', result.harvestSignature)
    }
    if (result.withdrawSignature) {
      keyValue('Withdraw Signature', result.withdrawSignature)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function feesCollect(mint: string, options: { accounts?: string }): Promise<void> {
  const config = await getConfig()
  const { createConnection } = await import('../../drivers/solana/connection')
  const { loadWallet } = await import('../../drivers/solana/wallet')
  const { harvestWithheldTokensToMint } = await import('../../programs/token-2022/instructions')
  const { PublicKey, Transaction } = await import('@solana/web3.js')
  const { TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')

  try {
    const connection = createConnection(config)
    const payer = loadWallet(config)
    const mintPubkey = new PublicKey(mint)

    let sources: InstanceType<typeof PublicKey>[] = []

    if (options.accounts) {
      sources = options.accounts.split(',').map(a => new PublicKey(a.trim()))
    } else {
      info('Discovering token accounts with withheld fees...')
      const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: mint } },
        ],
      })
      sources = accounts.map(a => a.pubkey)
    }

    if (sources.length === 0) {
      info('No token accounts found to harvest from')
      return
    }

    const signature = await withSpinner(`Harvesting fees from ${sources.length} account(s)`, async () => {
      const instruction = harvestWithheldTokensToMint({
        mint: mintPubkey,
        sources,
      })

      const transaction = new Transaction().add(instruction)
      transaction.feePayer = payer.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.sign(payer)

      const sig = await connection.sendRawTransaction(transaction.serialize())
      await connection.confirmTransaction(sig)
      return sig
    }, 'Fees harvested successfully')

    keyValue('Signature', signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function feesWithdraw(mint: string, options: { destination?: string }): Promise<void> {
  const config = await getConfig()
  const { createConnection } = await import('../../drivers/solana/connection')
  const { loadWallet } = await import('../../drivers/solana/wallet')
  const { withdrawWithheldTokensFromAccounts } = await import('../../programs/token-2022/instructions')
  const { PublicKey, Transaction } = await import('@solana/web3.js')
  const { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')

  try {
    const connection = createConnection(config)
    const payer = loadWallet(config)
    const mintPubkey = new PublicKey(mint)

    const destination = options.destination
      ? new PublicKey(options.destination)
      : await getAssociatedTokenAddress(mintPubkey, payer.publicKey, false, TOKEN_2022_PROGRAM_ID)

    keyValue('Destination', destination.toBase58())

    const signature = await withSpinner(`Withdrawing fees from mint ${formatAddress(mint)}`, async () => {
      const instruction = withdrawWithheldTokensFromAccounts({
        mint: mintPubkey,
        destination,
        authority: payer.publicKey,
        sources: [],
      })

      const transaction = new Transaction().add(instruction)
      transaction.feePayer = payer.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.sign(payer)

      const sig = await connection.sendRawTransaction(transaction.serialize())
      await connection.confirmTransaction(sig)
      return sig
    }, 'Fees withdrawn successfully')

    keyValue('Signature', signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
