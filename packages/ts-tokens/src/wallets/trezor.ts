/**
 * Trezor Hardware Wallet Adapter
 *
 * Provides Trezor signing via Trezor Connect.
 * Requires optional peer dependency: @trezor/connect-web
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import type { WalletAdapter } from './types'

const DEFAULT_DERIVATION_PATH = "m/44'/501'/0'/0'"

export interface TrezorAdapterConfig {
  derivationPath?: string
  manifest?: {
    email: string
    appUrl: string
  }
}

async function loadTrezorConnect(): Promise<any> {
  try {
    // @ts-ignore — optional peer dependency
    return await import('@trezor/connect-web')
  } catch {
    throw new Error(
      'Trezor Connect not found. Install @trezor/connect-web: npm install @trezor/connect-web'
    )
  }
}

export class TrezorWalletAdapter implements WalletAdapter {
  readonly name = 'Trezor'
  readonly type = 'trezor' as const
  readonly icon = 'https://trezor.io/favicon.ico'
  readonly url = 'https://trezor.io'

  connected = false
  publicKey: PublicKey | null = null

  private trezorConnect: any = null
  private derivationPath: string
  private manifest: { email: string; appUrl: string }

  constructor(config?: TrezorAdapterConfig) {
    this.derivationPath = config?.derivationPath ?? DEFAULT_DERIVATION_PATH
    this.manifest = config?.manifest ?? {
      email: 'developer@example.com',
      appUrl: 'https://ts-tokens.dev',
    }
  }

  async connect(): Promise<void> {
    const TrezorConnect = await loadTrezorConnect()
    this.trezorConnect = TrezorConnect.default ?? TrezorConnect

    await this.trezorConnect.init({
      manifest: this.manifest,
    })

    const result = await this.trezorConnect.solanaGetAddress({
      path: this.derivationPath,
      showOnTrezor: false,
    })

    if (!result.success) {
      throw new Error(`Trezor error: ${result.payload.error}`)
    }

    this.publicKey = new PublicKey(result.payload.address)
    this.connected = true
  }

  async disconnect(): Promise<void> {
    if (this.trezorConnect) {
      await this.trezorConnect.dispose()
      this.trezorConnect = null
    }
    this.publicKey = null
    this.connected = false
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.connected || !this.trezorConnect) {
      throw new Error('Trezor not connected')
    }

    const serializedTx = transaction.serializeMessage()

    const result = await this.trezorConnect.solanaSignTransaction({
      path: this.derivationPath,
      serializedTx: Buffer.from(serializedTx).toString('hex'),
    })

    if (!result.success) {
      throw new Error(`Trezor signing error: ${result.payload.error}`)
    }

    const signature = Buffer.from(result.payload.signature, 'hex')
    transaction.addSignature(this.publicKey!, signature)

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
    if (!this.connected || !this.trezorConnect) {
      throw new Error('Trezor not connected')
    }

    const result = await this.trezorConnect.solanaSignMessage?.({
      path: this.derivationPath,
      message: Buffer.from(message).toString('hex'),
    })

    if (!result || !result.success) {
      throw new Error('Trezor message signing not supported or failed')
    }

    return Buffer.from(result.payload.signature, 'hex')
  }
}
