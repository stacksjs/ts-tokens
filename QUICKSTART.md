# Quick Start Guide - ts-tokens Phase 1-4

## 🎯 What's Ready

✅ **Fungible Tokens**: Create, mint, transfer, burn, query
✅ **NFTs**: Create collections, mint NFTs, manage metadata
✅ **Candy Machine**: NFT drops with guards
✅ **Compressed NFTs**: Cost-effective cNFTs
✅ **Token Queries**: Supply, holders, history
✅ **Metadata Management**: On-chain and off-chain

## ⚡ Get Started in 3 Steps

### 1. Setup Environment

```bash
# Install dependencies (install Bun first if needed: curl -fsSL https://bun.sh/install | bash)
cd packages/ts-tokens
bun install

# Run automated setup
bun ../scripts/setup.ts
# OR make it executable and run directly
# chmod +x ../scripts/setup.ts && ../scripts/setup.ts
```

The setup script will:

- Check Solana CLI is installed
- Generate devnet keypair
- Airdrop 2 SOL for testing
- Create .env configuration
- Create example files

### 2. Build Library

```bash
# From packages/ts-tokens directory
bun run build
```

### 3. Start Building!

```bash
# Try the examples
bun run examples/create-token/index.ts
bun run examples/nft-collection/index.ts
```

## 📚 Key API Reference

### Tokens

```ts
import {
  createToken,
  getLargestAccounts,
  getTokenInfo,
  mintTokens,
  transferTokens
} from 'ts-tokens'

// Create token
const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000n
})

// Mint more
await mintTokens({
  mint: token.mint,
  destination: recipientAddress,
  amount: 100_000n
})

// Query
const info = await getTokenInfo(token.mint)
const holders = await getLargestAccounts(token.mint)
```

### NFTs

```ts
import {
  createCollection,
  createNFT,
  getNFTsByOwner,
  transferNFT
} from 'ts-tokens'

// Create collection
const collection = await createCollection({
  name: 'My Collection',
  symbol: 'COLL',
  uri: 'https://arweave.net/collection.json'
})

// Mint NFT
const nft = await createNFT({
  name: 'Cool NFT #1',
  symbol: 'COOL',
  uri: 'https://arweave.net/nft1.json',
  collection: collection.mint
})

// Query
const myNFTs = await getNFTsByOwner(walletAddress)
```

### Candy Machine

```ts
import {
  addConfigLines,
  createCandyMachine,
  mintFromCandyMachine
} from 'ts-tokens'

// Create CM
const cm = await createCandyMachine({
  itemsAvailable: 1000,
  symbol: 'DROP',
  sellerFeeBasisPoints: 500,
  collection: collectionMint
})

// Add items
await addConfigLines(cm.candyMachine, [
  { name: 'NFT #1', uri: 'https://...' },
  { name: 'NFT #2', uri: 'https://...' }
])

// Mint
const nft = await mintFromCandyMachine(cm.candyMachine)
```

## 🔧 Configuration

Create `.env` file:

```bash
# Required
SOLANA_NETWORK=devnet
WALLET_PATH=~/.config/solana/devnet.json

# Optional storage providers
PINATA_API_KEY=your_key
NFT_STORAGE_API_KEY=your_key
```

Or configure programmatically:

```ts
import { setConfig } from 'ts-tokens'

setConfig({
  network: 'devnet',
  wallet: { keypairPath: '~/.config/solana/devnet.json' },
  storageProvider: 'arweave'
})
```

## 📖 Documentation

- **Full Status**: See `IMPLEMENTATION_STATUS.md`
- **TODO List**: See `TODO.md` for Phase 5+ roadmap
- **Examples**: See `examples/` directory
- **API Docs**: Coming in Phase 8

## 🐛 Troubleshooting

### "Solana CLI not found"

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### "Insufficient funds"

```bash
solana airdrop 2
```

### "Cannot find module @solana/web3.js"

```bash
cd packages/ts-tokens
bun install
```

### "Transaction simulation failed"

- Check you're on devnet: `solana config get`
- Check balance: `solana balance`
- Try again (network congestion)

## 🚀 What's Next

After Phase 1-4, the roadmap includes:

- **Phase 5**: CLI Implementation
- **Phase 6**: React Components
- **Phase 7**: Vue Components
- **Phase 8**: Documentation
- **Phase 9**: Testing
- **Phase 10**: Release

## 💬 Support

- GitHub Issues: https://github.com/stacksjs/ts-tokens/issues
- Docs (coming): https://ts-tokens.stacksjs.org

---

Happy building! 🎉
