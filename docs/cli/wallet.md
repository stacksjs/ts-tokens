# Wallet Commands

Manage Solana wallets.

## `tokens wallet:generate`

Generate a new wallet keypair.

```bash
tokens wallet:generate
tokens wallet:generate --output ./my-wallet.json
```

### Options

| Option           | Description             |
| ---------------- | ----------------------- |
| `--output`, `-o` | Output file path        |
| `--force`        | Overwrite existing file |

### Output

```text
Generated new wallet:
  Address: ABC123...XYZ
  Saved to: ./my-wallet.json

⚠️  Keep your keypair file secure and never share it!
```

## `tokens wallet:show`

Display wallet address and info.

```bash
tokens wallet:show
tokens wallet:show --keypair ./my-wallet.json
```

### Output

```text
Wallet Address: ABC123...XYZ
Network: devnet
SOL Balance: 2.5 SOL
```

## `tokens wallet:balance`

Check SOL balance.

```bash
tokens wallet:balance
tokens wallet:balance --address <address>
```

### Options

| Option            | Description                       |
| ----------------- | --------------------------------- |
| `--address`, `-a` | Check balance of specific address |

### Output

```text
Balance: 2.500000000 SOL
```

## `tokens wallet:airdrop`

Request devnet/testnet SOL airdrop.

```bash
tokens wallet:airdrop
tokens wallet:airdrop --amount 2
```

### Options

| Option           | Description                           |
| ---------------- | ------------------------------------- |
| `--amount`, `-a` | Amount of SOL to request (default: 1) |

### Output

```text
Requesting 2 SOL airdrop...
✅ Airdrop successful!
   Signature: ABC123...
   New balance: 4.5 SOL
```

### Notes

- Only works on devnet and testnet
- Limited to 2 SOL per request
- Rate limited by the network

## `tokens wallet:transfer`

Transfer SOL to another address.

```bash
tokens wallet:transfer --to <address> --amount 1
```

### Options

| Option           | Description               |
| ---------------- | ------------------------- |
| `--to`, `-t`     | Recipient address         |
| `--amount`, `-a` | Amount of SOL to transfer |

### Output

```text
Transferring 1 SOL to ABC123...
✅ Transfer successful!
   Signature: XYZ789...
```

## `tokens wallet:history`

View recent transactions.

```bash
tokens wallet:history
tokens wallet:history --limit 20
```

### Options

| Option          | Description                    |
| --------------- | ------------------------------ |
| `--limit`, `-l` | Number of transactions to show |

## Related

- [CLI Overview](./index.md)
- [Configuration Commands](./config.md)
- [Token Commands](./tokens.md)
