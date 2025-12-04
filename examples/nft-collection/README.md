# NFT Collection Example

Create an NFT collection and mint NFTs to it.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure your wallet and ensure you have devnet SOL:

```bash
tokens config:network devnet
tokens wallet:airdrop --amount 2
```

## Run

```bash
bun run examples/nft-collection/index.ts
```

## What it does

1. Creates a new NFT collection with 5% royalties
2. Mints 3 NFTs to the collection
3. Each NFT is linked to the collection

## Output

```text
🎨 Creating an NFT Collection...

Network: devnet
Creating collection...
✅ Collection created!
   Mint: ABC123...

Minting 3 NFTs to collection...
   ✅ NFT #1: DEF456...
   ✅ NFT #2: GHI789...
   ✅ NFT #3: JKL012...

🎉 Done! Your collection is ready.
```
