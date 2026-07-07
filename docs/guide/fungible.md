# Fungible Tokens

Create and manage SPL fungible tokens on Solana.

## Creating Tokens

### Simple Token

```typescript
import { createSimpleToken } from 'ts-tokens'

const token = await createSimpleToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
})

console.log('Token mint:', token.mint.toBase58())
```

### Token with Metadata

```typescript
import { createToken } from 'ts-tokens'

const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  uri: 'https://arweave.net/token-metadata.json',
  initialSupply: 1_000_000_000,
  mintAuthority: walletKeypair,
  freezeAuthority: walletKeypair,
})
```

### Token with Initial Distribution

```typescript
const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000_000,
  distribution: [
    { address: treasury, percentage: 50 },
    { address: team, percentage: 20 },
    { address: community, percentage: 30 },
  ],
})
```

## Minting

### Mint to Single Recipient

```typescript
import { mintTokens } from 'ts-tokens'

await mintTokens({
  mint: tokenMint,
  amount: 1_000_000,
  destination: recipientAddress,
})
```

### Mint to Multiple Recipients

```typescript
import { mintTokensToMany } from 'ts-tokens'

await mintTokensToMany({
  mint: tokenMint,
  recipients: [
    { address: address1, amount: 100_000 },
    { address: address2, amount: 200_000 },
    { address: address3, amount: 300_000 },
  ],
})
```

## Transfers

### Simple Transfer

```typescript
import { transferTokens, transfer } from 'ts-tokens'

// Full options
await transferTokens({
  mint: tokenMint,
  from: senderWallet,
  to: recipientAddress,
  amount: 50_000,
})

// Shorthand
await transfer(tokenMint, recipientAddress, 50_000)
```

### Batch Transfer

```typescript
import { transferTokensToMany } from 'ts-tokens'

await transferTokensToMany({
  mint: tokenMint,
  from: senderWallet,
  recipients: [
    { address: address1, amount: 10_000 },
    { address: address2, amount: 20_000 },
    { address: address3, amount: 30_000 },
  ],
})
```

## Burning

### Burn Tokens

```typescript
import { burnTokens, burn } from 'ts-tokens'

// Full options
await burnTokens({
  mint: tokenMint,
  amount: 100_000,
  owner: ownerWallet,
})

// Shorthand
await burn(tokenMint, 100_000)
```

### Burn All Tokens

```typescript
import { burnAll } from 'ts-tokens'

// Burn all tokens from account
await burnAll({
  mint: tokenMint,
  owner: ownerWallet,
})
```

## Token Accounts

### Create Token Account

```typescript
import { createTokenAccount } from 'ts-tokens'

const account = await createTokenAccount({
  mint: tokenMint,
  owner: ownerAddress,
})

console.log('Token account:', account.toBase58())
```

### Get Associated Token Account

```typescript
import { getAssociatedTokenAccountAddress } from 'ts-tokens'

const ataAddress = getAssociatedTokenAccountAddress(
  tokenMint,
  ownerAddress,
)

console.log('ATA:', ataAddress.toBase58())
```

### Check Account Exists

```typescript
import { tokenAccountExists } from 'ts-tokens'

const exists = await tokenAccountExists(tokenAccountAddress)

if (!exists) {
  // Create account
}
```

### Get Account Balance

```typescript
import { getTokenAccountInfo } from 'ts-tokens'

const info = await getTokenAccountInfo(tokenAccountAddress)

console.log('Balance:', info.amount)
console.log('Decimals:', info.decimals)
console.log('UI Amount:', info.uiAmount)
```

## Authority Management

### Mint Authority

```typescript
import { setMintAuthority, revokeMintAuthority } from 'ts-tokens'

// Transfer to new authority
await setMintAuthority({
  mint: tokenMint,
  currentAuthority: currentWallet,
  newAuthority: newAuthorityAddress,
})

// Revoke (disable future minting)
await revokeMintAuthority({
  mint: tokenMint,
  authority: authorityWallet,
})
```

### Freeze Authority

```typescript
import {
  setFreezeAuthority,
  revokeFreezeAuthority,
  freezeAccount,
  thawAccount,
} from 'ts-tokens'

// Set freeze authority
await setFreezeAuthority({
  mint: tokenMint,
  currentAuthority: currentWallet,
  newAuthority: newAuthorityAddress,
})

// Freeze a token account
await freezeAccount({
  account: tokenAccountAddress,
  mint: tokenMint,
  authority: freezeAuthorityWallet,
})

// Unfreeze account
await thawAccount({
  account: tokenAccountAddress,
  mint: tokenMint,
  authority: freezeAuthorityWallet,
})

// Revoke freeze authority
await revokeFreezeAuthority({
  mint: tokenMint,
  authority: authorityWallet,
})
```

## Token 2022 Extensions

### Interest-Bearing Tokens

```typescript
import { createToken } from 'ts-tokens'

const token = await createToken({
  name: 'Interest Token',
  symbol: 'INT',
  decimals: 9,
  extensions: {
    interestBearing: {
      rate: 500, // 5% annual rate
      rateAuthority: rateAuthorityAddress,
    },
  },
})
```

### Transfer Fees

```typescript
const token = await createToken({
  name: 'Fee Token',
  symbol: 'FEE',
  decimals: 9,
  extensions: {
    transferFee: {
      feeBasisPoints: 100, // 1%
      maxFee: 1_000_000,
      transferFeeAuthority: feeAuthorityAddress,
      withdrawWithheldAuthority: withdrawAuthorityAddress,
    },
  },
})
```

### Non-Transferable Tokens

```typescript
const token = await createToken({
  name: 'Soulbound Token',
  symbol: 'SBT',
  decimals: 0,
  extensions: {
    nonTransferable: true,
  },
})
```

### Confidential Transfers

```typescript
const token = await createToken({
  name: 'Private Token',
  symbol: 'PVT',
  decimals: 9,
  extensions: {
    confidentialTransfer: {
      autoApprove: true,
    },
  },
})
```

## Metadata

### Update Token Metadata

```typescript
import { updateTokenMetadata } from 'ts-tokens'

await updateTokenMetadata({
  mint: tokenMint,
  name: 'Updated Name',
  symbol: 'UPD',
  uri: 'https://arweave.net/new-metadata.json',
})
```

### Get Token Metadata

```typescript
import { getTokenMetadata } from 'ts-tokens'

const metadata = await getTokenMetadata(tokenMint)

console.log('Name:', metadata.name)
console.log('Symbol:', metadata.symbol)
console.log('URI:', metadata.uri)
```

## Security

### Validate Token

```typescript
import { validateToken } from 'ts-tokens'

const validation = await validateToken(tokenMint)

console.log('Is valid:', validation.isValid)
console.log('Has mint authority:', validation.hasMintAuthority)
console.log('Has freeze authority:', validation.hasFreezeAuthority)
console.log('Supply:', validation.supply)
```

### Security Audit

```typescript
import { auditToken } from 'ts-tokens'

const audit = await auditToken(tokenMint)

console.log('Risk score:', audit.riskScore)
console.log('Warnings:', audit.warnings)
console.log('Is honeypot:', audit.isHoneypot)
```

## Best Practices

### Creating Production Tokens

```typescript
import { createToken, revokeMintAuthority } from 'ts-tokens'

// 1. Create token with initial supply
const token = await createToken({
  name: 'Production Token',
  symbol: 'PROD',
  decimals: 9,
  initialSupply: 1_000_000_000,
  freezeAuthority: null, // No freeze authority
})

// 2. Distribute initial tokens
await mintTokensToMany({
  mint: token.mint,
  recipients: [
    { address: treasury, amount: 500_000_000 },
    { address: team, amount: 200_000_000 },
    { address: liquidity, amount: 300_000_000 },
  ],
})

// 3. Revoke mint authority (fixed supply)
await revokeMintAuthority({
  mint: token.mint,
  authority: walletKeypair,
})
```

## Next Steps

- [Getting Started](/guide/getting-started) - Setup guide
- [NFTs](/guide/nft) - Create NFTs
