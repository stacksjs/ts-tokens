#!/usr/bin/env bun
/**
 * ts-tokens Setup Script
 *
 * Helps developers get started by checking requirements and setting up the development environment.
 */

import { exec } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Colors for terminal output
const colors = {
  reset: '\x1B[0m',
  bright: '\x1B[1m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  red: '\x1B[31m',
  cyan: '\x1B[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message: string) {
  log(`✓ ${message}`, 'green')
}

function warning(message: string) {
  log(`⚠ ${message}`, 'yellow')
}

function error(message: string) {
  log(`✗ ${message}`, 'red')
}

function info(message: string) {
  log(`ℹ ${message}`, 'cyan')
}

function header(message: string) {
  log(`\n${message}`, 'bright')
  log('='.repeat(message.length), 'bright')
}

/**
 * Check if Solana CLI is installed
 */
async function checkSolanaCLI(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('solana --version')
    success(`Solana CLI installed: ${stdout.trim()}`)
    return true
  }
  catch {
    error('Solana CLI not found')
    info('Install with: sh -c "$(curl -sSfL https://release.solana.com/stable/install)"')
    return false
  }
}

/**
 * Check current Solana configuration
 */
async function checkSolanaConfig(): Promise<void> {
  try {
    const { stdout: network } = await execAsync('solana config get | grep "RPC URL"')
    const { stdout: keypair } = await execAsync('solana config get | grep "Keypair Path"')

    info(`Current ${network.trim()}`)
    info(`Current ${keypair.trim()}`)
  }
  catch {
    warning('Could not read Solana config')
  }
}

/**
 * Generate a new devnet keypair
 */
async function generateKeypair(path: string): Promise<boolean> {
  try {
    if (existsSync(path)) {
      warning(`Keypair already exists at ${path}`)
      return true
    }

    // Create directory if it doesn't exist
    const dir = path.substring(0, path.lastIndexOf('/'))
    await mkdir(dir, { recursive: true })

    await execAsync(`solana-keygen new --no-bip39-passphrase --outfile ${path} --force`)
    success(`Generated new keypair at ${path}`)
    return true
  }
  catch (err) {
    error(`Failed to generate keypair: ${err}`)
    return false
  }
}

/**
 * Set Solana to devnet
 */
async function setDevnet(): Promise<boolean> {
  try {
    await execAsync('solana config set --url devnet')
    success('Set Solana network to devnet')
    return true
  }
  catch {
    error('Failed to set devnet')
    return false
  }
}

/**
 * Airdrop SOL to an address
 */
async function airdropSOL(amount: number = 2): Promise<boolean> {
  try {
    info(`Requesting ${amount} SOL airdrop...`)
    await execAsync(`solana airdrop ${amount}`, { timeout: 30000 })
    success(`Airdropped ${amount} SOL`)

    // Check balance
    const { stdout } = await execAsync('solana balance')
    success(`Current balance: ${stdout.trim()}`)
    return true
  }
  catch (err) {
    error(`Failed to airdrop SOL: ${err}`)
    warning('You can try again later with: solana airdrop 2')
    return false
  }
}

/**
 * Create .env.example file
 */
async function createEnvExample(): Promise<void> {
  const envExample = `# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
WALLET_PATH=~/.config/solana/devnet.json

# Or use private key directly (NOT for production!)
# SOLANA_PRIVATE_KEY=your_base58_private_key

# Storage Provider Keys (optional for testing, required for production)

# Pinata (IPFS)
# PINATA_API_KEY=your_pinata_key
# PINATA_SECRET_KEY=your_pinata_secret

# NFT.Storage (IPFS)
# NFT_STORAGE_API_KEY=your_nft_storage_key

# Arweave
# ARWEAVE_WALLET=path_to_arweave_wallet.json

# Shadow Drive uses your Solana wallet and SHDW tokens - no separate key needed
`

  try {
    await writeFile('.env.example', envExample)
    success('Created .env.example file')

    if (!existsSync('.env')) {
      await writeFile('.env', envExample)
      success('Created .env file from template')
    }
    else {
      info('.env file already exists, skipping')
    }
  }
  catch (err) {
    error(`Failed to create .env files: ${err}`)
  }
}

/**
 * Add .env to .gitignore if not already there
 */
async function updateGitignore(): Promise<void> {
  const gitignorePath = '.gitignore'

  try {
    let gitignore = ''
    if (existsSync(gitignorePath)) {
      gitignore = await readFile(gitignorePath, 'utf-8')
    }

    if (!gitignore.includes('.env')) {
      gitignore += '\n# Environment variables\n.env\n*.json\n!package.json\n!tsconfig.json\n'
      await writeFile(gitignorePath, gitignore)
      success('Updated .gitignore')
    }
    else {
      info('.gitignore already configured')
    }
  }
  catch (err) {
    warning(`Could not update .gitignore: ${err}`)
  }
}

/**
 * Create example usage file
 */
async function createExample(): Promise<void> {
  const examplePath = 'examples/getting-started.ts'
  const example = `/**
 * Getting Started with ts-tokens
 * 
 * This example shows how to create a token and mint an NFT.
 */

import { createToken, createNFT, getTokenInfo } from 'ts-tokens'

async function main() {
  // Create a fungible token
  console.log('Creating token...')
  const token = await createToken({
    name: 'My Token',
    symbol: 'MTK',
    decimals: 9,
    initialSupply: 1000000n,
  })
  console.log(\`Token created: \${token.mint}\`)
  console.log(\`Transaction: \${token.signature}\`)

  // Get token info
  const info = await getTokenInfo(token.mint)
  console.log(\`Token decimals: \${info.decimals}\`)
  console.log(\`Total supply: \${info.supply}\`)

  // Create an NFT
  console.log('\\nCreating NFT...')
  const nft = await createNFT({
    name: 'My NFT',
    symbol: 'MNFT',
    uri: 'https://arweave.net/metadata.json',
    sellerFeeBasisPoints: 500, // 5% royalty
    creators: [{
      address: 'YourWalletAddress',
      share: 100,
      verified: true,
    }],
  })
  console.log(\`NFT created: \${nft.mint}\`)
  console.log(\`Transaction: \${nft.signature}\`)
}

main().catch(console.error)
`

  try {
    await mkdir('examples', { recursive: true })
    await writeFile(examplePath, example)
    success('Created example file at examples/getting-started.ts')
  }
  catch (err) {
    error(`Failed to create example: ${err}`)
  }
}

/**
 * Main setup function
 */
async function setup() {
  header('🚀 ts-tokens Setup')

  log('\nThis script will help you set up your development environment for ts-tokens.\n')

  // Check Solana CLI
  header('1. Checking Solana CLI')
  const hasSolana = await checkSolanaCLI()

  if (!hasSolana) {
    warning('Please install Solana CLI first, then run this script again.')
    process.exit(1)
  }

  await checkSolanaConfig()

  // Set to devnet
  header('2. Configuring Solana Network')
  await setDevnet()

  // Generate devnet keypair
  header('3. Generating Devnet Keypair')
  const keypairPath = join(homedir(), '.config', 'solana', 'devnet.json')
  const hasKeypair = await generateKeypair(keypairPath)

  if (hasKeypair) {
    // Airdrop SOL
    header('4. Airdropping Devnet SOL')
    await airdropSOL(2)
  }

  // Create .env files
  header('5. Creating Configuration Files')
  await createEnvExample()
  await updateGitignore()

  // Create example
  header('6. Creating Example Files')
  await createExample()

  // Final instructions
  header('✨ Setup Complete!')
  log('\nYour development environment is ready!\n')

  info('Next steps:')
  log('  1. Review and update .env file with your configuration')
  log('  2. Check out examples/getting-started.ts')
  log('  3. Run: bun run examples/getting-started.ts')
  log('\nDocumentation: https://github.com/stacksjs/ts-tokens#readme')
  log('\nHappy building! 🎉\n')
}

// Run setup
setup().catch((err) => {
  error(`Setup failed: ${err}`)
  process.exit(1)
})
