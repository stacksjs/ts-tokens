# Token Commands

Create and manage fungible tokens.

## `tokens create`

Create a new fungible token.

```bash
tokens create --name "My Token" --symbol MTK --decimals 9
tokens create --name "My Token" --symbol MTK --decimals 9 --supply 1000000
```

### Options

| Option | Description |
|--------|-------------|
| `--name <name>` | Token name |
| `--symbol <symbol>` | Token symbol |
| `--decimals <decimals>` | Decimal places (default: `9`) |
| `--supply <supply>` | Initial supply to mint |
| `--metadata-uri <uri>` | URI for token metadata |
| `--token-2022` | Use the Token-2022 program |
| `--transfer-fee <bps>` | Enable transfer fees (basis points) |
| `--max-fee <amount>` | Maximum transfer fee |
| `--interest-rate <rate>` | Interest-bearing rate (basis points) |
| `--soulbound` | Non-transferable (soulbound) |
| `--confidential` | Enable confidential transfers |
| `--default-frozen` | New accounts start frozen |

### Example Output

```text
Creating token...
✅ Token created!
   Mint: ABC123...XYZ
   Signature: DEF456...

View on Explorer: https://explorer.solana.com/address/ABC123...
```

## `tokens mint <mint> <amount>`

Mint additional tokens.

```bash
tokens mint <mint> 1000000
tokens mint <mint> 1000000 --to <recipient>
```

### Options

| Option | Description |
|--------|-------------|
| `--to <address>` | Recipient address (default: self) |

## `tokens transfer <mint> <amount> <to>`

Transfer tokens to another address.

```bash
tokens transfer <mint> 1000 <recipient>
```

## `tokens burn <mint> <amount>`

Burn tokens from your account. To burn your entire balance, pass the full
balance as the amount.

```bash
tokens burn <mint> 1000
```

## `tokens info <mint>`

Get token information.

```bash
tokens info <mint>
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

## `tokens balance <mint>`

Check your token balance for a mint.

```bash
tokens balance <mint>
```

## `tokens holders <mint>`

List token holders.

```bash
tokens holders <mint>
tokens holders <mint> --limit 50
```

### Options

| Option | Description |
|--------|-------------|
| `--limit <limit>` | Maximum number of holders to show (default: `20`) |

## `tokens authority <mint>`

Manage token authorities.

```bash
tokens authority <mint> --transfer-mint <new-address>
tokens authority <mint> --revoke-mint
tokens authority <mint> --transfer-freeze <new-address>
tokens authority <mint> --revoke-freeze
```

### Options

| Option | Description |
|--------|-------------|
| `--transfer-mint <address>` | Transfer mint authority to address |
| `--revoke-mint` | Revoke mint authority |
| `--transfer-freeze <address>` | Transfer freeze authority to address |
| `--revoke-freeze` | Revoke freeze authority |

## Related

- [CLI Overview](./index.md)
- [NFT Commands](./nft.md)
