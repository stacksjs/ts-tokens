/** Wallet CLI command handlers. */

import { success, error, keyValue, header, info, warn, formatSol } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig, saveConfigOverlay, getConfigOverlayPath } from '../../config'

/**
 * Resolve a keyring password from (in priority order):
 *
 * 1. the `--password` flag — kept for scripting, but warns because flags leak
 *    into shell history and process listings
 * 2. the `TOKENS_KEYRING_PASSWORD` environment variable
 * 3. an interactive masked prompt (only on a TTY, never in CI)
 *
 * Exits with a clear error when none is available.
 */
async function resolveKeyringPasswordFrom(flagPassword: string | undefined, purpose: string): Promise<string> {
  if (flagPassword) {
    warn('Warning: --password leaks into shell history and process listings.')
    warn('Prefer the TOKENS_KEYRING_PASSWORD environment variable or the interactive prompt.')
    return flagPassword
  }

  if (process.env.TOKENS_KEYRING_PASSWORD) {
    return process.env.TOKENS_KEYRING_PASSWORD
  }

  if (process.stdout.isTTY && !process.env.CI) {
    const { promptSecret } = await import('../utils/prompt')
    return promptSecret(purpose)
  }

  error('No keyring password provided.')
  error('Set TOKENS_KEYRING_PASSWORD, or re-run interactively to be prompted.')
  error('(--password works for scripting but leaks to shell history.)')
  process.exit(1)
}

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
    saveConfigOverlay({ wallet: { keypairPath } })

    success(`Imported keypair from ${keypairPath}`)
    keyValue('Public Key', keypair.publicKey.toBase58())
    info(`Persisted to ${getConfigOverlayPath()}`)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletEncrypt(options: { password?: string }): Promise<void> {
  const password = await resolveKeyringPasswordFrom(options.password, 'Choose a keyring password')

  try {
    const config = await getConfig()
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { encryptAndSaveKeypair } = await import('../../security/keyring')

    const keypair = loadWallet(config)
    encryptAndSaveKeypair(
      keypair.secretKey,
      keypair.publicKey.toBase58(),
      password
    )

    success('Keypair encrypted and saved to keyring')
    keyValue('Public Key', keypair.publicKey.toBase58())
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function walletDecrypt(options: { password?: string }): Promise<void> {
  const password = await resolveKeyringPasswordFrom(options.password, 'Keyring password')

  try {
    const { loadKeypairFromKeyring, setWallet } = await import('../../drivers/solana/wallet')
    const keypair = loadKeypairFromKeyring(password)
    setWallet(keypair)

    success('Wallet decrypted from keyring')
    keyValue('Public Key', keypair.publicKey.toBase58())
    info('The decrypted wallet lives in memory for this command only and is NOT persisted.')
    info('To use the keyring for signing, set TOKENS_KEYRING_PASSWORD in your environment —')
    info('every command then loads the keyring automatically (see wallet.keyringPath config).')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
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
