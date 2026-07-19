# Wallet Commands

Manage Solana wallets.

## `tokens wallet:generate`

Generate a new wallet keypair.

```bash
tokens wallet:generate
tokens wallet:generate --output ./my-wallet.json
```

### Options

| Option | Description |
|--------|-------------|
| `--output <path>` | Output path for the keypair file |

### Output

```text
Generated new wallet:
  Address: ABC123...XYZ
  Saved to: ./my-wallet.json

⚠️  Keep your keypair file secure and never share it!
```

## `tokens wallet:show`

Display the current wallet address.

```bash
tokens wallet:show
```

### Output

```text
Wallet Address: ABC123...XYZ
Network: devnet
SOL Balance: 2.5 SOL
```

## `tokens wallet:balance`

Check the current wallet's SOL balance.

```bash
tokens wallet:balance
```

### Output

```text
Balance: 2.500000000 SOL
```

## `tokens wallet:airdrop [amount]`

Request a devnet/testnet SOL airdrop.

```bash
tokens wallet:airdrop
tokens wallet:airdrop 2
```

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

## `tokens wallet:import <path>`

Import a keypair from a file.

```bash
tokens wallet:import ./my-keypair.json
```

## `tokens wallet:encrypt`

Encrypt the current keypair into the system keyring.

```bash
tokens wallet:encrypt --password <password>
```

## `tokens wallet:decrypt`

Load the wallet from the encrypted keyring.

```bash
tokens wallet:decrypt --password <password>
```

## `tokens wallet:unlock`

Start a signing session so repeated commands do not prompt for the password.

```bash
tokens wallet:unlock --password <password> --timeout 60
```

### Options

| Option | Description |
|--------|-------------|
| `--password <password>` | Keyring password |
| `--timeout <minutes>` | Session timeout in minutes (default: `30`) |

## `tokens wallet:lock`

End the active signing session.

```bash
tokens wallet:lock
```

## `tokens wallet:keyring-info`

Show the keyring public key without decrypting the keypair.

```bash
tokens wallet:keyring-info
```

## Related

- [CLI Overview](./index.md)
- [Configuration Commands](./config.md)
- [Token Commands](./tokens.md)
