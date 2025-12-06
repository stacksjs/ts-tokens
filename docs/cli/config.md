# Configuration Commands

Manage ts-tokens configuration.

## `tokens config:init`

Initialize a new configuration file.

```bash
tokens config:init
```

Creates a `tokens.config.ts` file in the current directory with default settings.

### Options

| Option      | Description                                     |
| ----------- | ----------------------------------------------- |
| `--network` | Initial network (mainnet-beta, devnet, testnet) |
| `--force`   | Overwrite existing config                       |

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

## `tokens config:network`

Set the active network.

```bash
tokens config:network devnet
tokens config:network mainnet-beta
tokens config:network testnet
```

## `tokens config:rpc`

Set a custom RPC URL.

```bash
tokens config:rpc https://my-rpc.example.com
```

## `tokens config:wallet`

Set the wallet keypair path.

```bash
tokens config:wallet ~/.config/solana/id.json
tokens config:wallet ./my-keypair.json
```

## `tokens config:storage`

Set the default storage provider.

```bash
tokens config:storage arweave
tokens config:storage ipfs
tokens config:storage shadow-drive
```

## Environment Variables

Configuration can also be set via environment variables:

| Variable              | Description          |
| --------------------- | -------------------- |
| `SOLANA_NETWORK`      | Network to use       |
| `SOLANA_RPC_URL`      | Custom RPC URL       |
| `SOLANA_PRIVATE_KEY`  | Base58 private key   |
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
