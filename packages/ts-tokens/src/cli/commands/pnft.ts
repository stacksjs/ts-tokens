/**
 * CLI pNFT & Soulbound Token command handlers
 *
 * Programmable NFT operations with transfer rules.
 */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

/**
 * Create a programmable NFT (or soulbound token)
 */
export async function pnftCreate(options: {
  name?: string
  symbol?: string
  uri?: string
  soulbound?: boolean
  recoveryAuthority?: string
  collection?: string
}): Promise<void> {
  if (!options.name || !options.symbol || !options.uri) {
    error('--name, --symbol, and --uri are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()

    if (options.soulbound) {
      const { createSoulbound } = await import('../../pnft/create')
      let recoveryAuthority: import('@solana/web3.js').PublicKey | undefined
      if (options.recoveryAuthority) {
        const { PublicKey } = await import('@solana/web3.js')
        recoveryAuthority = new PublicKey(options.recoveryAuthority)
      }

      const result = await withSpinner('Creating soulbound token', () =>
        createSoulbound({
          name: options.name!,
          symbol: options.symbol!,
          uri: options.uri!,
          recoveryAuthority,
        }, config),
        'Soulbound token created successfully'
      )

      header('Soulbound Token Created')
      keyValue('Mint', result.mint ?? '')
      keyValue('Account', result.pnftAccount ?? '')
      keyValue('Signature', result.signature)
    } else {
      const { createPNFT } = await import('../../pnft/create')

      const result = await withSpinner('Creating programmable NFT', () =>
        createPNFT({
          name: options.name!,
          symbol: options.symbol!,
          uri: options.uri!,
        }, config),
        'Programmable NFT created successfully'
      )

      header('Programmable NFT Created')
      keyValue('Mint', result.mint ?? '')
      keyValue('Account', result.pnftAccount ?? '')
      keyValue('Signature', result.signature)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Show rules for a pNFT
 */
export async function pnftRules(mint: string): Promise<void> {
  try {
    const config = await getConfig()
    const { getAllRules, formatRules } = await import('../../pnft/rules')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')

    const connection = createConnection(config)
    const mintPubkey = new PublicKey(mint)

    const rules = await withSpinner(`Fetching rules for ${mint}`, () =>
      getAllRules(connection, mintPubkey)
    )

    if (rules.length === 0) {
      info('No rules found for this pNFT')
      return
    }

    header('Transfer Rules')
    success(formatRules(rules))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Add a rule to a pNFT
 */
export async function pnftAddRule(mint: string, options: {
  type?: string
  royaltyBps?: string
  addresses?: string
  periodSeconds?: string
  maxTransfers?: string
}): Promise<void> {
  if (!options.type) {
    error('--type is required (e.g., royalty_enforcement, allow_list, deny_list, cooldown_period, max_transfers, soulbound)')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { addRule, createRoyaltyRule, createAllowListRule, createDenyListRule, createCooldownRule, createMaxTransfersRule } = await import('../../pnft/rules')
    const { PublicKey } = await import('@solana/web3.js')
    const { loadWallet } = await import('../../drivers/solana/wallet')

    const mintPubkey = new PublicKey(mint)
    const wallet = loadWallet(config)

    let rule: import('../../pnft/types').TransferRule

    switch (options.type) {
      case 'royalty_enforcement': {
        const bps = parseInt(options.royaltyBps ?? '500')
        rule = createRoyaltyRule(bps, [{ address: wallet.publicKey, share: 100 }])
        break
      }
      case 'allow_list': {
        const addrs = (options.addresses ?? '').split(',').filter(Boolean).map(a => new PublicKey(a.trim()))
        rule = createAllowListRule(addrs)
        break
      }
      case 'deny_list': {
        const addrs = (options.addresses ?? '').split(',').filter(Boolean).map(a => new PublicKey(a.trim()))
        rule = createDenyListRule(addrs)
        break
      }
      case 'cooldown_period':
        rule = createCooldownRule(parseInt(options.periodSeconds ?? '3600'))
        break
      case 'max_transfers':
        rule = createMaxTransfersRule(parseInt(options.maxTransfers ?? '10'))
        break
      case 'soulbound':
        rule = { type: 'soulbound', enabled: true } as import('../../pnft/types').TransferRule
        break
      default:
        error(`Unknown rule type: ${options.type}`)
        process.exit(1)
    }

    const result = await withSpinner(`Adding ${options.type} rule`, () =>
      addRule(rule!, mintPubkey, config),
      'Rule added successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Remove a rule from a pNFT
 */
export async function pnftRemoveRule(mint: string, options: {
  type?: string
}): Promise<void> {
  if (!options.type) {
    error('--type is required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { removeRule } = await import('../../pnft/rules')
    const { PublicKey } = await import('@solana/web3.js')

    const mintPubkey = new PublicKey(mint)

    const result = await withSpinner(`Removing ${options.type} rule`, () =>
      removeRule(options.type! as import('../../pnft/types').TransferRuleType, mintPubkey, config),
      'Rule removed successfully'
    )

    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Transfer a programmable NFT
 */
export async function pnftTransfer(mint: string, to: string): Promise<void> {
  try {
    const config = await getConfig()
    const { transferPNFT } = await import('../../pnft/transfer')
    const { PublicKey } = await import('@solana/web3.js')
    const { loadWallet } = await import('../../drivers/solana/wallet')

    const wallet = loadWallet(config)

    const result = await withSpinner(`Transferring pNFT ${mint}`, () =>
      transferPNFT({
        mint: new PublicKey(mint),
        from: wallet.publicKey,
        to: new PublicKey(to),
        payRoyalty: true,
      }, config),
      'pNFT transferred successfully'
    )

    keyValue('Signature', result.signature)
    if (result.royaltyPaid !== undefined && result.royaltyPaid > 0n) {
      keyValue('Royalty Paid', result.royaltyPaid.toString())
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Check if a pNFT transfer is allowed
 */
export async function pnftCanTransfer(mint: string, to: string): Promise<void> {
  try {
    const config = await getConfig()
    const { canTransfer } = await import('../../pnft/transfer')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { PublicKey } = await import('@solana/web3.js')
    const { loadWallet } = await import('../../drivers/solana/wallet')

    const connection = createConnection(config)
    const wallet = loadWallet(config)

    const validation = await withSpinner('Checking transfer eligibility', () =>
      canTransfer(connection, new PublicKey(mint), wallet.publicKey, new PublicKey(to))
    )

    header('Transfer Validation')
    keyValue('Allowed', String(validation.allowed))
    if (validation.reason) {
      keyValue('Reason', validation.reason)
    }
    if (validation.failedRules.length > 0) {
      keyValue('Failed Rules', validation.failedRules.join(', '))
    }
    if (validation.royaltyAmount !== undefined) {
      keyValue('Royalty Amount', validation.royaltyAmount.toString())
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Create a soulbound token
 */
export async function sbtCreate(options: {
  name?: string
  symbol?: string
  uri?: string
  recoveryAuthority?: string
}): Promise<void> {
  return pnftCreate({
    ...options,
    soulbound: true,
  })
}

/**
 * Recover a soulbound token
 */
export async function sbtRecover(mint: string, newOwner: string): Promise<void> {
  try {
    const config = await getConfig()
    const { recoverSoulbound } = await import('../../pnft/create')
    const { PublicKey } = await import('@solana/web3.js')

    const result = await withSpinner('Recovering soulbound token', () =>
      recoverSoulbound(new PublicKey(mint), new PublicKey(newOwner), config),
      'Soulbound token recovered successfully'
    )

    keyValue('Signature', result.signature)
    keyValue('Account', result.pnftAccount ?? '')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
