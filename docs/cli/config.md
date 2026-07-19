# Configuration Commands

Manage ts-tokens configuration.

## `tokens config:init`

Initialize a new configuration file.

```bash
tokens config:init
tokens config:init --network mainnet-beta
```

Creates a `tokens.config.ts` file in the current directory with default settings.

### Options

| Option | Description |
|--------|-------------|
| `--network <network>` | Initial network (mainnet-beta, devnet, testnet, localnet) (default: `devnet`) |

## `tokens config:show`

Display current configuration.

```bash
tokens config:show
```

### Output

```text
Network: devnet
RPC URL: https://api.devnet.solana.com
Wallet: ~/.config/solana/id.json
Storage: arweave
```

## `tokens config:network <network>`

Set the active network.

```bash
tokens config:network devnet
tokens config:network mainnet-beta
tokens config:network testnet
```

## `tokens config:set <key> <value>`

Set a configuration value, such as a custom RPC URL, the wallet keypair
path, or the default storage provider.

```bash
tokens config:set rpcUrl https://my-rpc.example.com
tokens config:set wallet ~/.config/solana/id.json
tokens config:set storage ipfs
```

## `tokens config:get <key>`

Read a single configuration value.

```bash
tokens config:get rpcUrl
tokens config:get storage
```

## Environment Variables

Configuration can also be set via environment variables:

| Variable | Description |
|----------|-------------|
| `SOLANA_NETWORK` | Network to use |
| `SOLANA_RPC_URL` | Custom RPC URL |
| `SOLANA_PRIVATE_KEY` | Base58 private key |
| `SOLANA_KEYPAIR_PATH` | Path to keypair file |

## Configuration File

Example `tokens.config.ts`:

```typescript
import { defineConfig } from 'ts-tokens'

export default defineConfig({
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  wallet: {
    path: '~/.config/solana/id.json',
  },
  storage: {
    provider: 'arweave',
    arweaveGateway: 'https://arweave.net',
  },
})
```

## Related

- [CLI Overview](./index.md)
- [Wallet Commands](./wallet.md)
