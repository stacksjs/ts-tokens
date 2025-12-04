# Create Token Example

This example demonstrates how to create a fungible token on Solana using ts-tokens.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure your wallet:

```bash
# Create tokens.config.ts or set environment variable
export SOLANA_PRIVATE_KEY="your-base58-private-key"
```

3. Make sure you're on devnet and have SOL:

```bash
tokens config:network devnet
tokens wallet:airdrop --amount 2
```

## Run

```bash
bun run examples/create-token/index.ts
```

## What it does

1. Creates a new fungible token with:
   - Name: "Example Token"
   - Symbol: "EXMPL"
   - Decimals: 9
   - Initial supply: 1000 tokens

2. Mints 500 additional tokens

3. Demonstrates a token transfer

## Output

```
🚀 Creating a new fungible token...

Network: devnet
RPC: https://api.devnet.solana.com

Creating token...
✅ Token created!
   Mint: ABC123...
   Signature: XYZ789...

Minting additional tokens...
✅ Minted! Signature: ...

Transferring tokens...
✅ Transferred! Signature: ...

🎉 Done! Your token is ready.
```
