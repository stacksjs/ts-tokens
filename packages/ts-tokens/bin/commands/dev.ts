import {
  dev, devReset, devFund, devTime, devAirdrop, devRehearse,
} from '../../src/cli/commands/dev'

export function register(cli: any): void {
  cli
    .command('dev', 'Start a local Solana test validator with a funded wallet')
    .action(async () => {
      await dev()
    })

  cli
    .command('dev:reset', 'Stop the local validator and clean the ledger')
    .action(async () => {
      await devReset()
    })

  cli
    .command('dev:fund <address> <amount>', 'Airdrop SOL on the local validator (via Solana CLI)')
    .action(async (address: string, amount: string) => {
      await devFund(address, Number(amount))
    })

  cli
    .command('dev:airdrop <address> <amount>', 'Airdrop SOL via RPC with retries (no Solana CLI needed)')
    .option('--network <network>', 'Cluster: devnet | testnet | localnet', { default: 'devnet' })
    .action(async (address: string, amount: string, options: any) => {
      await devAirdrop(address, Number(amount), { network: options.network })
    })

  cli
    .command('dev:time <slot>', 'Warp the local validator to a slot')
    .action(async (slot: string) => {
      await devTime(Number(slot))
    })

  cli
    .command('dev:rehearse', 'Run a full NFT-drop dress rehearsal against a live cluster')
    .option('--network <network>', 'Cluster: devnet | testnet | localnet', { default: 'devnet' })
    .option('--count <count>', 'Number of NFTs to mint into the collection', { default: '3' })
    .option('--fund <sol>', 'SOL to airdrop to the rehearsal wallet', { default: '1' })
    .option('--keypair <path>', 'Path to a funded keypair JSON (skips the faucet)')
    .action(async (options: any) => {
      await devRehearse({
        network: options.network,
        count: Number(options.count),
        fund: Number(options.fund),
        keypair: options.keypair,
      })
    })
}
