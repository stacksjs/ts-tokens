import { getConfig, setConfig } from '../../src/config'

export function register(cli: any): void {
  cli
    .command('wallet:generate', 'Generate a new keypair')
    .option('--output <path>', 'Output path for keypair file')
    .action(async (options: { output?: string }) => {
      const { generateKeypair, saveKeypair } = await import('../../src/drivers/solana/wallet')
      const keypair = generateKeypair()
      console.log(`Generated new keypair:`)
      console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)

      if (options.output) {
        saveKeypair(keypair, options.output)
        console.log(`  Saved to: ${options.output}`)
      } else {
        console.log(`\nTo save this keypair, use --output <path>`)
      }
    })

  cli
    .command('wallet:show', 'Show current wallet address')
    .action(async () => {
      const config = await getConfig()
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')
      try {
        const pubkey = getPublicKey(config)
        console.log(`Wallet: ${pubkey}`)
      } catch {
        console.error('No wallet configured. Run `tokens wallet:generate` or set wallet.keypairPath in config.')
      }
    })

  cli
    .command('wallet:balance', 'Show wallet balance')
    .action(async () => {
      const config = await getConfig()
      const { createSolanaConnection } = await import('../../src/drivers/solana/connection')
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')
      const { lamportsToSol } = await import('../../src/utils')

      try {
        const pubkey = getPublicKey(config)
        const connection = createSolanaConnection(config)
        const balance = await connection.getBalance(pubkey)
        console.log(`Wallet: ${pubkey}`)
        console.log(`Balance: ${lamportsToSol(balance)} SOL`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
      }
    })

  cli
    .command('wallet:airdrop [amount]', 'Request devnet/testnet airdrop')
    .action(async (amount?: string) => {
      const config = await getConfig()

      if (config.network === 'mainnet-beta') {
        console.error('Airdrop is not available on mainnet')
        process.exit(1)
      }

      const { createSolanaConnection } = await import('../../src/drivers/solana/connection')
      const { getPublicKey } = await import('../../src/drivers/solana/wallet')
      const { solToLamports, lamportsToSol } = await import('../../src/utils')

      try {
        const pubkey = getPublicKey(config)
        const connection = createSolanaConnection(config)
        const lamports = solToLamports(Number(amount) || 1)

        console.log(`Requesting airdrop of ${amount || 1} SOL to ${pubkey}...`)
        const signature = await connection.requestAirdrop(pubkey, Number(lamports))
        console.log(`Airdrop successful!`)
        console.log(`Signature: ${signature}`)

        const balance = await connection.getBalance(pubkey)
        console.log(`New balance: ${lamportsToSol(balance)} SOL`)
      } catch (error) {
        console.error('Airdrop failed:', error instanceof Error ? error.message : error)
      }
    })

  cli
    .command('wallet:import <path>', 'Import keypair from file')
    .action(async (keypairPath: string) => {
      try {
        const { loadKeypairFromFile } = await import('../../src/drivers/solana/wallet')
        const keypair = loadKeypairFromFile(keypairPath)
        setConfig({ wallet: { keypairPath } })
        console.log(`\u2713 Imported keypair from ${keypairPath}`)
        console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('wallet:encrypt', 'Encrypt current keypair to keyring')
    .option('--password <password>', 'Encryption password')
    .action(async (options: { password?: string }) => {
      if (!options.password) {
        console.error('Error: --password is required')
        process.exit(1)
      }

      const config = await getConfig()
      const { loadWallet } = await import('../../src/drivers/solana/wallet')
      const { encryptAndSaveKeypair } = await import('../../src/security/keyring')

      try {
        const keypair = loadWallet(config)
        encryptAndSaveKeypair(
          keypair.secretKey,
          keypair.publicKey.toBase58(),
          options.password
        )
        console.log(`\u2713 Keypair encrypted and saved to keyring`)
        console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('wallet:decrypt', 'Load wallet from encrypted keyring')
    .option('--password <password>', 'Decryption password')
    .action(async (options: { password?: string }) => {
      if (!options.password) {
        console.error('Error: --password is required')
        process.exit(1)
      }

      const { loadKeypairFromKeyring, setWallet } = await import('../../src/drivers/solana/wallet')

      try {
        const keypair = loadKeypairFromKeyring(options.password)
        setWallet(keypair)
        console.log(`\u2713 Wallet loaded from keyring`)
        console.log(`  Public Key: ${keypair.publicKey.toBase58()}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('wallet:unlock', 'Start a signing session')
    .option('--password <password>', 'Keyring password')
    .option('--timeout <minutes>', 'Session timeout in minutes', '30')
    .action(async (options: { password?: string; timeout?: string }) => {
      if (!options.password) {
        console.error('Error: --password is required')
        process.exit(1)
      }

      const { startSession } = await import('../../src/security/session')

      try {
        const timeoutMs = parseInt(options.timeout || '30') * 60 * 1000
        startSession(options.password, { timeoutMs })
        console.log(`\u2713 Signing session started (timeout: ${options.timeout || '30'} minutes)`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('wallet:lock', 'End the signing session')
    .action(async () => {
      const { endSession, isSessionActive } = await import('../../src/security/session')

      if (!isSessionActive()) {
        console.log('No active session to lock')
        return
      }

      endSession()
      console.log('\u2713 Signing session ended')
    })

  cli
    .command('wallet:keyring-info', 'Show keyring public key without decrypting')
    .action(async () => {
      const { getKeyringInfo, keyringExists } = await import('../../src/security/keyring')

      try {
        if (!keyringExists()) {
          console.log('No keyring found. Use `tokens wallet:encrypt` to create one.')
          return
        }

        const info = getKeyringInfo()
        console.log('Keyring Information:')
        console.log(`  Public Key: ${info.publicKey}`)
        console.log(`  Version: ${info.version}`)
        console.log(`  Algorithm: ${info.algorithm}`)
        console.log(`  KDF: ${info.kdf}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
