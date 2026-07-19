/** Token CLI command handlers. */

import { success, error, keyValue, header, info, warn, formatAddress } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'
import type { TokenConfig } from '../../types'

/**
 * Fetch a mint's on-chain decimals so CLI amounts can be given in human units
 * ("1.5" tokens) rather than raw base units.
 */
async function resolveMintDecimals(mint: string, config: TokenConfig): Promise<number> {
  const { createConnection } = await import('../../drivers/solana/connection')
  const { getMintWithProgram } = await import('../../token/program')
  const { PublicKey } = await import('@solana/web3.js')

  const connection = createConnection(config)
  const { mint: mintAccount } = await getMintWithProgram(connection, new PublicKey(mint))
  return mintAccount.decimals
}

/**
 * Run the pre-transaction security checks, gated on the `securityChecks`
 * config option (default on). Warnings are always printed; an unsafe result
 * aborts the command.
 */
async function runPreTransactionChecks(
  config: TokenConfig,
  options: { recipients?: string[]; isDestructive?: boolean } = {},
): Promise<void> {
  if (config.securityChecks === false) return

  const { preTransactionCheck } = await import('../../security/checks')
  const { createConnection } = await import('../../drivers/solana/connection')
  const { getPublicKey } = await import('../../drivers/solana/wallet')
  const { PublicKey } = await import('@solana/web3.js')

  const connection = createConnection(config)
  const payer = getPublicKey(config)
  const result = await preTransactionCheck({
    connection,
    payer: new PublicKey(payer),
    estimatedFee: 5000,
    recipients: options.recipients,
    isDestructive: options.isDestructive,
  })

  for (const warning of result.warnings) {
    warn(`Security check: ${warning}`)
  }
  if (!result.safe) {
    error('Pre-transaction security checks failed — aborting.')
    info('Set `securityChecks: false` in config to bypass these checks.')
    process.exit(1)
  }
}

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

  try {
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
  try {
    const config = await getConfig()
    const { mintTokens } = await import('../../token/mint')
    const { parseTokenAmount } = await import('../../utils')

    // Amounts are human units ("1.5"); convert with the mint's real decimals.
    const decimals = await resolveMintDecimals(mint, config)
    const rawAmount = parseTokenAmount(amount, decimals)

    await runPreTransactionChecks(config, {
      recipients: options.to ? [options.to] : undefined,
    })

    const result = await withSpinner(`Minting ${amount} tokens`, () =>
      mintTokens({
        mint,
        amount: rawAmount,
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
  try {
    const config = await getConfig()
    const { transfer } = await import('../../token/transfer')
    const { parseTokenAmount } = await import('../../utils')

    // Amounts are human units ("1.5"); convert with the mint's real decimals.
    const decimals = await resolveMintDecimals(mint, config)
    const rawAmount = parseTokenAmount(amount, decimals)

    await runPreTransactionChecks(config, { recipients: [to] })

    const result = await withSpinner(`Transferring ${amount} tokens to ${formatAddress(to)}`, () =>
      transfer(mint, to, rawAmount, config),
      'Transfer successful',
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenBurn(mint: string, amount: string): Promise<void> {
  try {
    const config = await getConfig()
    const { burn } = await import('../../token/burn')
    const { parseTokenAmount } = await import('../../utils')

    // Amounts are human units ("1.5"); convert with the mint's real decimals.
    const decimals = await resolveMintDecimals(mint, config)
    const rawAmount = parseTokenAmount(amount, decimals)

    await runPreTransactionChecks(config, { isDestructive: true })

    const result = await withSpinner(`Burning ${amount} tokens`, () =>
      burn(mint, rawAmount, config),
      'Tokens burned successfully',
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function tokenInfo(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getMintInfo } = await import('../../drivers/solana/account')
    const { createConnection } = await import('../../drivers/solana/connection')
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
  try {
    const config = await getConfig()
    const { getTokenBalance } = await import('../../drivers/solana/account')
    const { getPublicKey } = await import('../../drivers/solana/wallet')
    const { createConnection } = await import('../../drivers/solana/connection')
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
  try {
    const config = await getConfig()
    const { getTokenHolders } = await import('../../token/query')
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
  try {
    const config = await getConfig()
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

  try {
    const config = await getConfig()
    const { createToken2022 } = await import('../../token/token2022')
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

  try {
    const config = await getConfig()
    const { setEmbeddedMetadata } = await import('../../token/embedded-metadata')
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
  try {
    const config = await getConfig()
    const { createTokenGroup } = await import('../../token/token-group')
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
  try {
    const config = await getConfig()
    const { harvestTransferFees } = await import('../../token/fee-harvester')
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
  try {
    const config = await getConfig()
    const { harvestTransferFees } = await import('../../token/fee-harvester')

    // Explicit source accounts via --accounts; otherwise discover all accounts
    // with withheld fees. Both paths share the canonical harvester (and its
    // batch size) with tokenHarvestFees.
    const sources = options.accounts?.split(',').map(a => a.trim()).filter(Boolean)
    if (!sources) {
      info('Discovering token accounts with withheld fees...')
    }

    const result = await withSpinner(
      'Harvesting withheld transfer fees',
      () => harvestTransferFees(mint, config, { withdraw: false, sources }),
      'Fees harvested successfully',
    )

    if (result.accountsProcessed === 0) {
      info('No token accounts with withheld fees found to harvest from')
      return
    }

    keyValue('Accounts Processed', String(result.accountsProcessed))
    for (const sig of result.harvestSignatures) {
      keyValue('Signature', sig)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function feesWithdraw(mint: string, options: { destination?: string }): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { withdrawWithheldTokensFromMint } = await import('../../programs/token-2022/instructions')
    const { PublicKey, Transaction } = await import('@solana/web3.js')
    const { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')
    const connection = createConnection(config)
    const payer = loadWallet(config)
    const mintPubkey = new PublicKey(mint)

    const destination = options.destination
      ? new PublicKey(options.destination)
      : await getAssociatedTokenAddress(mintPubkey, payer.publicKey, false, TOKEN_2022_PROGRAM_ID)

    keyValue('Destination', destination.toBase58())

    // Withdraw fees that have been harvested onto the mint (via `fees:collect`)
    // to the destination. Withdrawing directly from source accounts uses a
    // different instruction and requires enumerating those accounts; the
    // harvest-to-mint flow is the supported path here.
    const signature = await withSpinner(`Withdrawing fees from mint ${formatAddress(mint)}`, async () => {
      const instruction = withdrawWithheldTokensFromMint({
        mint: mintPubkey,
        destination,
        authority: payer.publicKey,
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
