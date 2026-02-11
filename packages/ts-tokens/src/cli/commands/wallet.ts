/** Wallet CLI command handlers. */

import { success, error, keyValue, header, info, formatSol } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig, setConfig } from '../../config'

export async function walletGenerate(options: { output?: string }): Promise<void> {
  try {
    const { generateKeypair, saveKeypair } = await import('../../drivers/solana/wallet')
    const keypair = generateKeypair()

    header('Generated New Keypair')
    keyValue('Public Key', keypair.publicKey.toBase58())

    if (options.output) {
      saveKeypair(keypair, options.output)
      success(`Saved to ${options.output}`)
    } else {
      info('To save this keypair, use --output <path>')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletShow(): Promise<void> {
  try {
    const config = await getConfig()
    const { getPublicKey } = await import('../../drivers/solana/wallet')
    const pubkey = getPublicKey(config)
    keyValue('Wallet', pubkey)
  } catch {
    error('No wallet configured. Run `tokens wallet:generate` or set wallet.keypairPath in config.')
    process.exit(1)
  }
}

export async function walletBalance(): Promise<void> {
  try {
    const config = await getConfig()
    const { createSolanaConnection } = await import('../../drivers/solana/connection')
    const { getPublicKey } = await import('../../drivers/solana/wallet')

    const pubkey = getPublicKey(config)
    const connection = createSolanaConnection(config)
    const balance = await connection.getBalance(pubkey)

    keyValue('Wallet', pubkey)
    keyValue('Balance', formatSol(balance))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletAirdrop(amount?: string): Promise<void> {
  const config = await getConfig()

  if (config.network === 'mainnet-beta') {
    error('Airdrop is not available on mainnet')
    process.exit(1)
  }

  try {
    const { createSolanaConnection } = await import('../../drivers/solana/connection')
    const { getPublicKey } = await import('../../drivers/solana/wallet')
    const { solToLamports } = await import('../../utils')

    const pubkey = getPublicKey(config)
    const connection = createSolanaConnection(config)
    const solAmount = Number(amount) || 1
    const lamports = solToLamports(solAmount)

    const signature = await withSpinner(
      `Requesting airdrop of ${solAmount} SOL to ${pubkey}`,
      () => connection.requestAirdrop(pubkey, Number(lamports)),
      'Airdrop successful'
    )

    keyValue('Signature', signature)

    const balance = await connection.getBalance(pubkey)
    keyValue('New Balance', formatSol(balance))
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletImport(keypairPath: string): Promise<void> {
  try {
    const { loadKeypairFromFile } = await import('../../drivers/solana/wallet')
    const keypair = loadKeypairFromFile(keypairPath)
    setConfig({ wallet: { keypairPath } })

    success(`Imported keypair from ${keypairPath}`)
    keyValue('Public Key', keypair.publicKey.toBase58())
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletEncrypt(options: { password?: string }): Promise<void> {
  if (!options.password) {
    error('--password is required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { encryptAndSaveKeypair } = await import('../../security/keyring')

    const keypair = loadWallet(config)
    encryptAndSaveKeypair(
      keypair.secretKey,
      keypair.publicKey.toBase58(),
      options.password
    )

    success('Keypair encrypted and saved to keyring')
    keyValue('Public Key', keypair.publicKey.toBase58())
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletDecrypt(options: { password?: string }): Promise<void> {
  if (!options.password) {
    error('--password is required')
    process.exit(1)
  }

  try {
    const { loadKeypairFromKeyring, setWallet } = await import('../../drivers/solana/wallet')
    const keypair = loadKeypairFromKeyring(options.password)
    setWallet(keypair)

    success('Wallet loaded from keyring')
    keyValue('Public Key', keypair.publicKey.toBase58())
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletUnlock(options: { password?: string; timeout?: string }): Promise<void> {
  if (!options.password) {
    error('--password is required')
    process.exit(1)
  }

  try {
    const { startSession } = await import('../../security/session')
    const timeoutMs = parseInt(options.timeout || '30') * 60 * 1000
    startSession(options.password, { timeoutMs })

    success(`Signing session started (timeout: ${options.timeout || '30'} minutes)`)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletLock(): Promise<void> {
  const { endSession, isSessionActive } = await import('../../security/session')

  if (!isSessionActive()) {
    info('No active session to lock')
    return
  }

  endSession()
  success('Signing session ended')
}

export async function walletKeyringInfo(): Promise<void> {
  try {
    const { getKeyringInfo, keyringExists } = await import('../../security/keyring')

    if (!keyringExists()) {
      info('No keyring found. Use `tokens wallet:encrypt` to create one.')
      return
    }

    const krInfo = getKeyringInfo()
    header('Keyring Information')
    keyValue('Public Key', krInfo.publicKey)
    keyValue('Version', String(krInfo.version))
    keyValue('Algorithm', krInfo.algorithm)
    keyValue('KDF', krInfo.kdf)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
