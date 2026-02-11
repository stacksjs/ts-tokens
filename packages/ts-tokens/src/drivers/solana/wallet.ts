/**
 * Solana Wallet Management
 *
 * Handles keypair loading, signing, and wallet adapter integration.
 */

import type { VersionedTransaction } from '@solana/web3.js';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js'
import type { TokenConfig, Wallet, WalletAdapter } from '../../types'
import { decode as decodeBase58 } from '../../utils/base58'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { getSessionKeypair } from '../../security/session'
import { loadEncryptedKeypair, keyringExists } from '../../security/keyring'
import type { KeyringOptions } from '../../security/keyring'

/**
 * Current wallet instance
 */
let currentWallet: Keypair | null = null

/**
 * Load keypair from a JSON file
 *
 * @param keypairPath - Path to keypair JSON file
 * @returns Keypair instance
 */
export function loadKeypairFromFile(keypairPath: string): Keypair {
  // Expand home directory
  const expandedPath = keypairPath.replace(/^~/, os.homedir())
  const absolutePath = path.resolve(expandedPath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Keypair file not found: ${absolutePath}`)
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  const secretKey = new Uint8Array(JSON.parse(content))

  return Keypair.fromSecretKey(secretKey)
}

/**
 * Load keypair from environment variable
 *
 * @param envVar - Environment variable name
 * @returns Keypair instance
 */
export function loadKeypairFromEnv(envVar: string = 'TOKENS_KEYPAIR'): Keypair {
  const value = process.env[envVar]

  if (!value) {
    throw new Error(`Environment variable ${envVar} is not set`)
  }

  // Try to parse as JSON array first
  try {
    const secretKey = new Uint8Array(JSON.parse(value))
    return Keypair.fromSecretKey(secretKey)
  } catch {
    // Try as base58 encoded string
    try {
      const secretKey = decodeBase58(value)
      return Keypair.fromSecretKey(secretKey)
    } catch {
      throw new Error(`Invalid keypair format in ${envVar}. Expected JSON array or base58 string.`)
    }
  }
}

/**
 * Parse a secret key from a string input (base58 or JSON byte array)
 *
 * @param input - Raw string input (base58 or JSON array of bytes)
 * @returns Secret key as Uint8Array
 */
export function parseSecretKeyInput(input: string): Uint8Array {
  const trimmed = input.trim()

  if (!trimmed) {
    throw new Error('Empty secret key input')
  }

  // Try JSON array first (e.g. "[1,2,3,...]")
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed)
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error('Invalid JSON array')
      }
      return new Uint8Array(arr)
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('Invalid JSON byte array format')
      }
      throw e
    }
  }

  // Try base58
  try {
    return decodeBase58(trimmed)
  } catch {
    throw new Error('Invalid secret key format. Expected base58 string or JSON byte array.')
  }
}

/**
 * Load keypair from stdin (reads fd 0 synchronously)
 *
 * @returns Keypair instance
 */
export function loadKeypairFromStdin(): Keypair {
  const fd = fs.openSync('/dev/stdin', 'r')
  const buf = Buffer.alloc(1024)
  const bytesRead = fs.readSync(fd, buf, 0, 1024, null)
  fs.closeSync(fd)

  const input = buf.slice(0, bytesRead).toString('utf-8')
  const secretKey = parseSecretKeyInput(input)
  return Keypair.fromSecretKey(secretKey)
}

/**
 * Load keypair from encrypted keyring
 *
 * @param password - Password to decrypt the keyring
 * @param options - Keyring options (path overrides)
 * @returns Keypair instance
 */
export function loadKeypairFromKeyring(
  password: string,
  options?: KeyringOptions
): Keypair {
  const secretKey = loadEncryptedKeypair(password, options)
  return Keypair.fromSecretKey(secretKey)
}

/**
 * Generate a new random keypair
 *
 * @returns New Keypair instance
 */
export function generateKeypair(): Keypair {
  return Keypair.generate()
}

/**
 * Load wallet based on configuration
 *
 * @param config - Token configuration
 * @returns Keypair instance
 */
export function loadWallet(config: TokenConfig): Keypair {
  // 1. Check for active session keypair
  const sessionKp = getSessionKeypair()
  if (sessionKp) {
    return sessionKp
  }

  // 2. Check for cached wallet
  if (currentWallet) {
    return currentWallet
  }

  // 3. Try loading from config keypair path
  if (config.wallet?.keypairPath) {
    currentWallet = loadKeypairFromFile(config.wallet.keypairPath)
    return currentWallet
  }

  // 4. Try loading from config env var
  if (config.wallet?.keypairEnv) {
    currentWallet = loadKeypairFromEnv(config.wallet.keypairEnv)
    return currentWallet
  }

  // 5. Try default environment variable
  if (process.env.TOKENS_KEYPAIR) {
    currentWallet = loadKeypairFromEnv('TOKENS_KEYPAIR')
    return currentWallet
  }

  // 6. Try encrypted keyring (if password is set via env)
  if (process.env.TOKENS_KEYRING_PASSWORD) {
    const keyringOpts = config.wallet?.keyringPath
      ? { keyringDir: path.dirname(config.wallet.keyringPath), keyringFile: path.basename(config.wallet.keyringPath) }
      : undefined
    if (keyringExists(keyringOpts)) {
      currentWallet = loadKeypairFromKeyring(process.env.TOKENS_KEYRING_PASSWORD, keyringOpts)
      return currentWallet
    }
  }

  // 7. Try default Solana CLI keypair location
  const defaultPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
  if (fs.existsSync(defaultPath)) {
    currentWallet = loadKeypairFromFile(defaultPath)
    return currentWallet
  }

  throw new Error(
    'No wallet configured. Set wallet.keypairPath in config, ' +
    'TOKENS_KEYPAIR environment variable, or create ~/.config/solana/id.json'
  )
}

/**
 * Set the current wallet
 *
 * @param keypair - Keypair to use
 */
export function setWallet(keypair: Keypair): void {
  currentWallet = keypair
}

/**
 * Clear the current wallet
 */
export function clearWallet(): void {
  currentWallet = null
}

/**
 * Get the current wallet's public key
 *
 * @param config - Token configuration
 * @returns Public key as base58 string
 */
export function getPublicKey(config: TokenConfig): string {
  const wallet = loadWallet(config)
  return wallet.publicKey.toBase58()
}

/**
 * Sign a transaction
 *
 * @param transaction - Transaction to sign
 * @param config - Token configuration
 * @returns Signed transaction
 */
export function signTransaction<T extends Transaction | VersionedTransaction>(
  transaction: T,
  config: TokenConfig
): T {
  const wallet = loadWallet(config)

  if (transaction instanceof Transaction) {
    transaction.partialSign(wallet)
  } else {
    transaction.sign([wallet])
  }

  return transaction
}

/**
 * Sign multiple transactions
 *
 * @param transactions - Transactions to sign
 * @param config - Token configuration
 * @returns Signed transactions
 */
export function signAllTransactions<T extends Transaction | VersionedTransaction>(
  transactions: T[],
  config: TokenConfig
): T[] {
  return transactions.map(tx => signTransaction(tx, config))
}

/**
 * Sign a message
 *
 * @param message - Message to sign
 * @param config - Token configuration
 * @returns Signature
 */
export function signMessage(message: Uint8Array, config: TokenConfig): Uint8Array {
  const wallet = loadWallet(config)
  const { sign } = require('tweetnacl')
  return sign.detached(message, wallet.secretKey)
}

/**
 * Create a wallet wrapper that implements the Wallet interface
 *
 * @param config - Token configuration
 * @returns Wallet interface implementation
 */
export function createWallet(config: TokenConfig): Wallet {
  const keypair = loadWallet(config)

  return {
    publicKey: keypair.publicKey.toBase58(),

    async signTransaction<T>(transaction: T): Promise<T> {
      return signTransaction(transaction as any, config) as T
    },

    async signAllTransactions<T>(transactions: T[]): Promise<T[]> {
      return signAllTransactions(transactions as any[], config) as T[]
    },

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      return signMessage(message, config)
    },
  }
}

/**
 * Save keypair to a file
 *
 * @param keypair - Keypair to save
 * @param filePath - Path to save to
 */
export function saveKeypair(keypair: Keypair, filePath: string): void {
  const expandedPath = filePath.replace(/^~/, os.homedir())
  const absolutePath = path.resolve(expandedPath)
  const dir = path.dirname(absolutePath)

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Save with restricted permissions
  const content = JSON.stringify(Array.from(keypair.secretKey))
  fs.writeFileSync(absolutePath, content, { mode: 0o600 })
}

/**
 * Validate a public key string
 *
 * @param address - Address to validate
 * @returns True if valid
 */
export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

/**
 * Convert a string to PublicKey
 *
 * @param address - Address string
 * @returns PublicKey instance
 */
export function toPublicKey(address: string): PublicKey {
  return new PublicKey(address)
}

/**
 * Get keypair from secret key bytes
 *
 * @param secretKey - Secret key as Uint8Array
 * @returns Keypair instance
 */
export function keypairFromSecretKey(secretKey: Uint8Array): Keypair {
  return Keypair.fromSecretKey(secretKey)
}

/**
 * Get keypair from seed
 *
 * @param seed - 32-byte seed
 * @returns Keypair instance
 */
export function keypairFromSeed(seed: Uint8Array): Keypair {
  return Keypair.fromSeed(seed)
}
