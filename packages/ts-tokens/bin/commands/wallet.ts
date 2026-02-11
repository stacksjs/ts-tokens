import {
  walletGenerate, walletShow, walletBalance, walletAirdrop,
  walletImport, walletEncrypt, walletDecrypt,
  walletUnlock, walletLock, walletKeyringInfo,
} from '../../src/cli/commands/wallet'

export function register(cli: any): void {
  cli
    .command('wallet:generate', 'Generate a new keypair')
    .option('--output <path>', 'Output path for keypair file')
    .action(async (options: { output?: string }) => {
      await walletGenerate(options)
    })

  cli
    .command('wallet:show', 'Show current wallet address')
    .action(async () => {
      await walletShow()
    })

  cli
    .command('wallet:balance', 'Show wallet balance')
    .action(async () => {
      await walletBalance()
    })

  cli
    .command('wallet:airdrop [amount]', 'Request devnet/testnet airdrop')
    .action(async (amount?: string) => {
      await walletAirdrop(amount)
    })

  cli
    .command('wallet:import <path>', 'Import keypair from file')
    .action(async (keypairPath: string) => {
      await walletImport(keypairPath)
    })

  cli
    .command('wallet:encrypt', 'Encrypt current keypair to keyring')
    .option('--password <password>', 'Encryption password')
    .action(async (options: { password?: string }) => {
      await walletEncrypt(options)
    })

  cli
    .command('wallet:decrypt', 'Load wallet from encrypted keyring')
    .option('--password <password>', 'Decryption password')
    .action(async (options: { password?: string }) => {
      await walletDecrypt(options)
    })

  cli
    .command('wallet:unlock', 'Start a signing session')
    .option('--password <password>', 'Keyring password')
    .option('--timeout <minutes>', 'Session timeout in minutes', '30')
    .action(async (options: { password?: string; timeout?: string }) => {
      await walletUnlock(options)
    })

  cli
    .command('wallet:lock', 'End the signing session')
    .action(async () => {
      await walletLock()
    })

  cli
    .command('wallet:keyring-info', 'Show keyring public key without decrypting')
    .action(async () => {
      await walletKeyringInfo()
    })
}
