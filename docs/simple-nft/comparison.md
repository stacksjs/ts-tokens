# Feature Comparison

## ts-tokens Simple NFT vs Metaplex SDK vs Raw Solana

| Feature | Raw Solana | Metaplex SDK | ts-tokens Simple NFT |
|---------|-----------|-------------|---------------------|
| **Create NFT** | ~80 lines | ~15 lines | ~5 lines |
| **Accounts required** | 6+ manual | 3 auto-derived | 0 manual |
| **Royalty input** | Basis points | percentAmount() | Percentage number |
| **Metadata upload** | Manual | Manual/plugins | Automatic |
| **Default mutability** | N/A | true | false (safer) |
| **TypeScript types** | Manual | Generated from Rust | Hand-crafted |
| **Collection verify** | Separate IX | Separate call | Part of addToCollection |
| **Batch operations** | Manual | Limited | Built-in with progress |
| **CLI support** | None | None | 7 commands |
| **Framework** | @solana/web3.js | Umi | @solana/web3.js |

## On-Chain Compatibility

All three approaches produce the **exact same on-chain accounts**:

```
┌──────────────────────────────────────────────┐
│ Mint Account (SPL Token)                      │
│ Metadata PDA (Token Metadata Program)         │
│ Master Edition PDA (Token Metadata Program)   │
│ Token Account (ATA)                           │
└──────────────────────────────────────────────┘
```

NFTs created with ts-tokens Simple NFT are fully compatible with:
- Phantom, Solflare, and all Solana wallets
- Magic Eden, Tensor, and all NFT marketplaces
- Metaplex tools and SDKs
- Any program that reads Token Metadata accounts

## Instruction Comparison

### Creating an NFT

| Step | Raw Solana | Metaplex | Simple NFT |
|------|-----------|----------|------------|
| Upload image | Manual fetch/post | Plugin system | `image: Buffer` |
| Generate metadata JSON | Manual | Manual | Automatic |
| Upload metadata | Manual fetch/post | Plugin system | Automatic |
| Create mint account | SystemProgram.createAccount | Handled | Handled |
| Initialize mint | createInitializeMintInstruction | Handled | Handled |
| Create ATA | createAssociatedTokenAccountInstruction | Handled | Handled |
| Mint token | createMintToInstruction | Handled | Handled |
| Create metadata PDA | Build IX manually | createNft() | Handled |
| Create master edition | Build IX manually | createNft() | Handled |

### Updating Metadata

| Approach | Code |
|----------|------|
| Raw | `serializeUpdateMetadataV2({...})` + manual IX building |
| Metaplex | `updateV1(umi, { mint, name: 'New' }).sendAndConfirm(umi)` |
| Simple NFT | `updateSimpleNFT(conn, mint, auth, { name: 'New' }, config)` |

## When to Use What

**Use Simple NFT when:**
- Building a new project from scratch
- You want the simplest possible API
- You prefer percentages over basis points
- You want automatic metadata handling
- You need batch operations with progress

**Use Metaplex SDK when:**
- You need Umi ecosystem plugins
- You're working with programmable NFTs (pNFTs)
- You need compressed NFT support via Bubblegum
- You're integrating with existing Metaplex tooling

**Use Raw Solana when:**
- You need maximum control over transactions
- You're building a custom program
- You need optimized compute units
- You're working with non-standard account structures
