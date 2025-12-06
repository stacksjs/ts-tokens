# Token Commands

Create and manage fungible tokens.

## `tokens token:create`

Create a new fungible token.

```bash
tokens token:create --name "My Token" --symbol MTK --decimals 9
tokens token:create --name "My Token" --symbol MTK --decimals 9 --supply 1000000
```

### Required Options

| Option             | Description                 |
| ------------------ | --------------------------- |
| `--name`, `-n`     | Token name                  |
| `--symbol`, `-s`   | Token symbol (max 10 chars) |
| `--decimals`, `-d` | Decimal places (0-9)        |

### Optional Options

| Option               | Description             |
| -------------------- | ----------------------- |
| `--supply`           | Initial supply to mint  |
| `--mint-authority`   | Custom mint authority   |
| `--freeze-authority` | Custom freeze authority |
| `--metadata-uri`     | URI for token metadata  |

### Example Output

```text
Creating token...
✅ Token created!
   Mint: ABC123...XYZ
   Signature: DEF456...

View on Explorer: https://explorer.solana.com/address/ABC123...
```

## `tokens token:mint`

Mint additional tokens.

```bash
tokens token:mint <mint> --amount 1000000
tokens token:mint <mint> --amount 1000000 --to <recipient>
```

### Options

| Option           | Description                       |
| ---------------- | --------------------------------- |
| `--amount`, `-a` | Amount to mint (in base units)    |
| `--to`, `-t`     | Recipient address (default: self) |

## `tokens token:transfer`

Transfer tokens to another address.

```bash
tokens token:transfer <mint> --amount 1000 --to <recipient>
```

### Options

| Option           | Description        |
| ---------------- | ------------------ |
| `--amount`, `-a` | Amount to transfer |
| `--to`, `-t`     | Recipient address  |
| `--memo`         | Optional memo      |

## `tokens token:burn`

Burn tokens from your account.

```bash
tokens token:burn <mint> --amount 1000
tokens token:burn <mint> --all
```

### Options

| Option           | Description     |
| ---------------- | --------------- |
| `--amount`, `-a` | Amount to burn  |
| `--all`          | Burn all tokens |

## `tokens token:info`

Get token information.

```bash
tokens token:info <mint>
```

### Example Output

```text
Token Info:
  Mint: ABC123...XYZ
  Name: My Token
  Symbol: MTK
  Decimals: 9
  Supply: 1,000,000
  Mint Authority: DEF456...
  Freeze Authority: None
```

## `tokens token:balance`

Check token balance.

```bash
tokens token:balance <mint>
tokens token:balance <mint> --address <owner>
```

### Options

| Option            | Description            |
| ----------------- | ---------------------- |
| `--address`, `-a` | Owner address to check |

## `tokens token:accounts`

List all token accounts.

```bash
tokens token:accounts
tokens token:accounts --owner <address>
```

### Example Output

```text
Token Accounts:
  MTK (ABC123...): 1,000.00
  USDC (DEF456...): 500.00
  SOL: 2.5
```

## Related

- [CLI Overview](./index.md)
- [NFT Commands](./nft.md)
