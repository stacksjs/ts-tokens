/**
 * Ledger Hardware Wallet Adapter
 *
 * Provides Ledger signing via HID transport.
 * Requires optional peer dependencies:
 *   @ledgerhq/hw-transport-node-hid
 *   @ledgerhq/hw-app-solana
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import type { WalletAdapter, LedgerConfig } from './types'

const DEFAULT_DERIVATION_PATH = "44'/501'/0'/0'"

export interface LedgerAdapterConfig extends LedgerConfig {
  derivationPath?: string
}

/**
 * Ledger wallet adapter using HID transport
 */
export class LedgerWalletAdapter implements WalletAdapter {
  readonly name = 'Ledger'
  readonly type = 'ledger' as const
  readonly icon = 'https://www.ledger.com/favicon.ico'
  readonly url = 'https://www.ledger.com'

  connected = false
  publicKey: PublicKey | null = null

  private transport: any = null
  private app: any = null
  private derivationPath: string

  constructor(config?: LedgerAdapterConfig) {
    this.derivationPath = config?.derivationPath ?? DEFAULT_DERIVATION_PATH
  }

  async connect(): Promise<void> {
    const TransportNodeHid = await loadTransport()
    this.transport = await TransportNodeHid.default.open('')
    const SolanaApp = await loadSolanaApp()
    this.app = new SolanaApp.default(this.transport)

    const { address } = await this.app.getAddress(this.derivationPath, false)
    this.publicKey = new PublicKey(address)
    this.connected = true
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close()
      this.transport = null
      this.app = null
    }
    this.publicKey = null
    this.connected = false
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.app) throw new Error('Ledger not connected')

    const message = transaction.serializeMessage()
    const { signature } = await this.app.signTransaction(this.derivationPath, message)
    transaction.addSignature(this.publicKey!, Buffer.from(signature))
    return transaction
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const signed: Transaction[] = []
    for (const tx of transactions) {
      signed.push(await this.signTransaction(tx))
    }
    return signed
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.app) throw new Error('Ledger not connected')

    const { signature } = await this.app.signOffchainMessage(this.derivationPath, Buffer.from(message))
    return new Uint8Array(signature)
  }
}

/**
 * Create a Ledger wallet adapter
 */
export function createLedgerAdapter(config?: LedgerAdapterConfig): LedgerWalletAdapter {
  return new LedgerWalletAdapter(config)
}

async function loadTransport(): Promise<any> {
  try {
    // @ts-ignore — optional peer dependency
    return await import('@ledgerhq/hw-transport-node-hid')
  } catch {
    throw new Error(
      'Ledger HID transport not available. Install @ledgerhq/hw-transport-node-hid as a peer dependency.'
    )
  }
}

async function loadSolanaApp(): Promise<any> {
  try {
    // @ts-ignore — optional peer dependency
    return await import('@ledgerhq/hw-app-solana')
  } catch {
    throw new Error(
      'Ledger Solana app not available. Install @ledgerhq/hw-app-solana as a peer dependency.'
    )
  }
}
