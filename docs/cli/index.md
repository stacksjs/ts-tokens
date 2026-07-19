# CLI Overview

The ts-tokens CLI provides a powerful command-line interface for managing Solana tokens and NFTs.

## Installation

```bash
# Install globally
bun add -g ts-tokens

# Or use with bunx
bunx ts-tokens <command>
```

## Commands

### Configuration

| Command | Description |
|---------|-------------|
| `tokens config:init` | Initialize configuration |
| `tokens config:show` | Show current configuration |
| `tokens config:network <network>` | Set network |

### Wallet

| Command | Description |
|---------|-------------|
| `tokens wallet:generate` | Generate new wallet |
| `tokens wallet:show` | Show wallet address |
| `tokens wallet:balance` | Check SOL balance |
| `tokens wallet:airdrop` | Request devnet airdrop |

### Tokens

| Command | Description |
|---------|-------------|
| `tokens create` | Create fungible token |
| `tokens mint <mint> <amount>` | Mint tokens |
| `tokens transfer <mint> <amount> <to>` | Transfer tokens |
| `tokens burn <mint> <amount>` | Burn tokens |
| `tokens info <mint>` | Get token info |
| `tokens balance <mint>` | Check token balance |
| `tokens holders <mint>` | List token holders |
| `tokens authority <mint>` | Manage token authorities |

### NFTs

| Command | Description |
|---------|-------------|
| `tokens nft:create` | Create NFT |
| `tokens nft:transfer` | Transfer NFT |
| `tokens nft:burn` | Burn NFT |
| `tokens nft:info` | Get NFT info |
| `tokens nft:list` | List owned NFTs |

### Collections

| Command | Description |
|---------|-------------|
| `tokens collection:create` | Create collection |

## Examples

```bash
# Initialize config
tokens config:init

# Set to devnet
tokens config:network devnet

# Get airdrop
tokens wallet:airdrop 2

# Create a token
tokens create --name "My Token" --symbol MTK --decimals 9 --supply 1000000

# Create an NFT
tokens nft:create --name "My NFT" --symbol MNFT --uri https://arweave.net/...

# Transfer tokens
tokens transfer <mint> 1000 <recipient>
```

## Global Options

| Option | Description |
|--------|-------------|
| `--network` | Override network (mainnet-beta, devnet, testnet) |
| `--rpc` | Override RPC URL |
| `--keypair` | Override keypair path |
| `--help` | Show help |
| `--version` | Show version |

## Related

- [Configuration Commands](./config.md)
- [Wallet Commands](./wallet.md)
- [Token Commands](./tokens.md)
- [NFT Commands](./nft.md)
