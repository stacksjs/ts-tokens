# Candy Machine Commands

Create and manage Candy Machines for NFT drops.

## `tokens cm:create`

Create a new Candy Machine.

```bash
tokens cm:create \
  --collection <collection-mint> \
  --items 1000 \
  --price 1 \
  --symbol MNFT
```

### Required Options

| Option | Description |
|--------|-------------|
| `--collection` | Collection mint address |
| `--items` | Number of items available |
| `--price` | Price in SOL |
| `--symbol` | NFT symbol |

### Optional Options

| Option | Description |
|--------|-------------|
| `--royalty` | Royalty in basis points |
| `--go-live` | Go live date (ISO format) |
| `--end-date` | End date (ISO format) |
| `--hidden` | Use hidden settings for reveal |
| `--sequential` | Mint in sequential order |

## `tokens cm:upload`

Upload NFT assets and config lines.

```bash
tokens cm:upload <candy-machine> --assets ./assets/
```

### Options

| Option | Description |
|--------|-------------|
| `--assets`, `-a` | Path to assets directory |
| `--storage` | Storage provider (arweave, ipfs) |
| `--batch-size` | Items per batch (default: 10) |

### Assets Directory Structure

```text
assets/
├── 0.json
├── 0.png
├── 1.json
├── 1.png
└── ...
```

## `tokens cm:mint`

Mint an NFT from a Candy Machine.

```bash
tokens cm:mint <candy-machine>
tokens cm:mint <candy-machine> --count 5
```

### Options

| Option | Description |
|--------|-------------|
| `--count`, `-c` | Number to mint (default: 1) |

## `tokens cm:info`

Get Candy Machine information.

```bash
tokens cm:info <candy-machine>
```

### Example Output

```text
Candy Machine Info:
  Address: ABC123...
  Collection: DEF456...
  Items Available: 1000
  Items Minted: 42
  Items Remaining: 958
  Price: 1 SOL
  Go Live: 2024-01-01 00:00:00 UTC
  Status: Active
```

## `tokens cm:update`

Update Candy Machine settings.

```bash
tokens cm:update <candy-machine> --price 2
tokens cm:update <candy-machine> --go-live "2024-02-01T00:00:00Z"
```

## `tokens cm:withdraw`

Withdraw funds from Candy Machine.

```bash
tokens cm:withdraw <candy-machine>
```

## `tokens cm:guards`

Manage Candy Machine guards.

```bash
# Add SOL payment guard
tokens cm:guards <candy-machine> --add sol-payment --amount 1 --destination <address>

# Add start date guard
tokens cm:guards <candy-machine> --add start-date --date "2024-01-01T00:00:00Z"

# Add allowlist guard
tokens cm:guards <candy-machine> --add allowlist --file ./allowlist.json

# Add mint limit guard
tokens cm:guards <candy-machine> --add mint-limit --limit 3
```

### Available Guards

| Guard | Description |
|-------|-------------|
| `sol-payment` | Require SOL payment |
| `token-payment` | Require SPL token payment |
| `start-date` | Set start time |
| `end-date` | Set end time |
| `mint-limit` | Limit mints per wallet |
| `allowlist` | Merkle tree allowlist |
| `nft-gate` | Require NFT ownership |
| `token-gate` | Require token ownership |

## Related

- [CLI Overview](./index.md)
- [NFT Commands](./nft.md)
