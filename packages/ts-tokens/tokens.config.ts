import type { TokenConfig } from './src/types'

/**
 * ts-tokens Configuration
 *
 * This file configures the ts-tokens library and CLI.
 * See https://ts-tokens.dev/config for all options.
 */
const config: TokenConfig = {
  // Blockchain settings
  chain: 'solana',
  network: 'devnet', // 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

  // Wallet configuration
  wallet: {
    // Path to keypair file (default: ~/.config/solana/id.json)
    // keypairPath: '~/.config/solana/id.json',

    // Or use environment variable
    // keypairEnv: 'TOKENS_KEYPAIR',
  },

  // Transaction settings
  commitment: 'confirmed',
  autoCreateAccounts: true,

  // Storage provider for metadata.
  // 'arweave' uploads via Irys (https://node1.irys.xyz, override with IRYS_NODE_URL);
  // needs a Solana keypair (see wallet config above) and a funded Irys balance.
  // 'ipfs' needs PINATA_JWT or a local node; 'shadow-drive' needs a running SHDW
  // node endpoint; 'local' is dev-only (URLs are NOT publicly resolvable).
  storageProvider: 'arweave', // 'arweave' | 'ipfs' | 'shadow-drive' | 'local'

  // Gateways
  ipfsGateway: 'https://ipfs.io',
  arweaveGateway: 'https://arweave.net',

  // Security
  securityChecks: true,
  dryRun: false,

  // Logging
  verbose: false,
}

export default config
