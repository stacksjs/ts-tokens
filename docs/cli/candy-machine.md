# Candy Machine Commands

Create and manage Candy Machines for NFT drops.

## `tokens candy:create`

Create a new Candy Machine.

```bash
tokens candy:create \
  --collection <collection-mint> \
  --items 1000 \
  --symbol MNFT \
  --royalty 500
```

Or load the full configuration (including guards) from a JSON file:

```bash
tokens candy:create --config ./candy-machine.json
```

### Options

| Option | Description |
|--------|-------------|
| `--items <n>` | Number of items available |
| `--symbol <symbol>` | Collection symbol |
| `--royalty <bps>` | Royalty in basis points |
| `--collection <address>` | Collection NFT address |
| `--config <path>` | Load candy machine config (including guards) from JSON file |

## `tokens candy:upload <path>`

Upload NFT assets and create config lines.

```bash
tokens candy:upload ./assets/
tokens candy:upload ./assets/ --storage ipfs
```

### Options

| Option | Description |
|--------|-------------|
| `--storage <provider>` | Storage provider (arweave, ipfs, shadow) (default: `arweave`) |

### Assets Directory Structure

```text
assets/
├── 0.json
├── 0.png
├── 1.json
├── 1.png
└── ...
```

## `tokens candy:add <candy-machine> <items-file>`

Add config lines to a Candy Machine from a JSON file.

```bash
tokens candy:add <candy-machine> ./items.json
```

## `tokens candy:mint <candy-machine>`

Mint an NFT from a Candy Machine.

```bash
tokens candy:mint <candy-machine>
tokens candy:mint <candy-machine> --count 5
```

### Options

| Option | Description |
|--------|-------------|
| `--count <n>` | Number to mint (default: `1`) |

## `tokens candy:info <candy-machine>`

Get Candy Machine information.

```bash
tokens candy:info <candy-machine>
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

## `tokens candy:withdraw <candy-machine>`

Withdraw funds from a Candy Machine.

```bash
tokens candy:withdraw <candy-machine>
```

## `tokens candy:delete <candy-machine>`

Delete a Candy Machine and reclaim rent.

```bash
tokens candy:delete <candy-machine>
```

## `tokens candy:guards <candy-machine>`

Show the guards configured on a Candy Machine.

```bash
tokens candy:guards <candy-machine>
```

Guards are configured at creation time via `tokens candy:create --config
./candy-machine.json`. Guards you can configure include:

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
