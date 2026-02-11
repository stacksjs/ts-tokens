/** CLI Multi-Sig command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

// ---------------------------------------------------------------------------
// Multisig Management
// ---------------------------------------------------------------------------

export async function multisigCreate(options: {
  owners: string[]
  threshold: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createOnChainMultisig } = await import('../../multisig/management')

    const owners = options.owners.map(o => new PublicKey(o))
    const threshold = parseInt(options.threshold)

    const result = await withSpinner('Creating multisig...', () =>
      createOnChainMultisig(owners, threshold, config)
    )

    success('Multisig created')
    keyValue('Multisig', result.multisig ?? '')
    keyValue('Threshold', `${threshold} of ${owners.length}`)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function multisigInfo(address: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { getOnChainMultisig } = await import('../../multisig/management')
    const { getMultisig } = await import('../../multisig/create')

    const connection = createConnection(config)
    const pubkey = new PublicKey(address)

    // Try on-chain program multisig first
    const onChain = await getOnChainMultisig(connection, pubkey)
    if (onChain) {
      header('On-Chain Multisig')
      keyValue('Address', address)
      keyValue('Creator', onChain.creator.toBase58())
      keyValue('Threshold', onChain.threshold.toString())
      keyValue('Owners', onChain.owners.length.toString())
      for (const owner of onChain.owners) {
        info(`  ${owner.toBase58()}`)
      }
      keyValue('Transaction Count', onChain.transactionCount.toString())
      return
    }

    // Fall back to SPL Token multisig
    const splMultisig = await getMultisig(connection, pubkey)
    if (splMultisig) {
      header('SPL Token Multisig')
      keyValue('Address', address)
      keyValue('Threshold', `${splMultisig.m} of ${splMultisig.n}`)
      keyValue('Initialized', splMultisig.isInitialized ? 'Yes' : 'No')
      for (const signer of splMultisig.signers) {
        info(`  ${signer.toBase58()}`)
      }
      return
    }

    error('Multisig not found')
    process.exit(1)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function multisigOwners(address: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { getOnChainMultisig } = await import('../../multisig/management')

    const connection = createConnection(config)
    const pubkey = new PublicKey(address)

    const multisig = await getOnChainMultisig(connection, pubkey)
    if (!multisig) {
      error('Multisig not found')
      process.exit(1)
    }

    header(`Multisig Owners (${multisig.owners.length})`)
    keyValue('Threshold', `${multisig.threshold} of ${multisig.owners.length}`)
    for (let i = 0; i < multisig.owners.length; i++) {
      keyValue(`Owner ${i + 1}`, multisig.owners[i].toBase58())
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Transaction Lifecycle
// ---------------------------------------------------------------------------

export async function multisigPropose(multisig: string, options: {
  instructionData: string
  expiresIn?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { proposeTransaction } = await import('../../multisig/transactions')

    const result = await withSpinner('Proposing transaction...', () =>
      proposeTransaction({
        multisig: new PublicKey(multisig),
        instructionData: Buffer.from(options.instructionData, 'hex'),
        expiresIn: options.expiresIn ? parseInt(options.expiresIn) : undefined,
      }, config)
    )

    success('Transaction proposed')
    keyValue('Transaction', result.transaction ?? '')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function multisigApprove(multisig: string, txIndex: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { approveTransaction } = await import('../../multisig/transactions')

    const result = await withSpinner('Approving transaction...', () =>
      approveTransaction({
        multisig: new PublicKey(multisig),
        transactionIndex: BigInt(txIndex),
      }, config)
    )

    success('Transaction approved')
    keyValue('Transaction', result.transaction ?? '')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function multisigReject(multisig: string, txIndex: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { rejectTransaction } = await import('../../multisig/transactions')

    const result = await withSpinner('Rejecting transaction...', () =>
      rejectTransaction({
        multisig: new PublicKey(multisig),
        transactionIndex: BigInt(txIndex),
      }, config)
    )

    success('Transaction rejected')
    keyValue('Transaction', result.transaction ?? '')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function multisigExecute(multisig: string, txIndex: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { executeTransaction } = await import('../../multisig/transactions')

    const result = await withSpinner('Executing transaction...', () =>
      executeTransaction({
        multisig: new PublicKey(multisig),
        transactionIndex: BigInt(txIndex),
      }, config)
    )

    success('Transaction executed')
    keyValue('Transaction', result.transaction ?? '')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function multisigPending(multisig: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { getPendingTransactions } = await import('../../multisig/transactions')

    const connection = createConnection(config)
    const pending = await getPendingTransactions(connection, new PublicKey(multisig))

    if (pending.length === 0) {
      info('No pending transactions')
      return
    }

    header(`Pending Transactions (${pending.length})`)
    for (const tx of pending) {
      keyValue('Address', tx.address.toBase58())
      keyValue('Proposer', tx.proposer.toBase58())
      keyValue('Approvals', tx.approvals.length.toString())
      keyValue('Rejections', tx.rejections.length.toString())
      if (tx.expiresAt) {
        keyValue('Expires At', new Date(Number(tx.expiresAt) * 1000).toISOString())
      }
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function multisigHistory(multisig: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { getTransactionHistory } = await import('../../multisig/transactions')

    const connection = createConnection(config)
    const history = await getTransactionHistory(connection, new PublicKey(multisig))

    if (history.length === 0) {
      info('No transaction history')
      return
    }

    header(`Transaction History (${history.length})`)
    for (const entry of history) {
      keyValue('Action', entry.action)
      keyValue('Actor', entry.actor.toBase58())
      keyValue('Signature', entry.signature)
      keyValue('Time', new Date(Number(entry.timestamp) * 1000).toISOString())
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
