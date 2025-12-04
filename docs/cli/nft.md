# NFT Commands

Create and manage NFTs and collections.

## `tokens nft:create`

Create a new NFT.

```bash
tokens nft:create --name "My NFT" --symbol MNFT --uri https://arweave.net/...
tokens nft:create --name "My NFT" --symbol MNFT --uri https://... --collection <mint>
```

### Required Options

| Option | Description |
|--------|-------------|
| `--name`, `-n` | NFT name |
| `--symbol`, `-s` | NFT symbol |
| `--uri`, `-u` | Metadata URI |

### Optional Options

| Option | Description |
|--------|-------------|
| `--collection` | Collection mint address |
| `--royalty` | Royalty in basis points (500 = 5%) |
| `--creators` | Creator addresses and shares |
| `--mutable` | Allow metadata updates (default: true) |

### Example

```bash
tokens nft:create \
  --name "Cool NFT #1" \
  --symbol COOL \
  --uri https://arweave.net/abc123 \
  --royalty 500 \
  --collection ABC123...
```

## `tokens nft:transfer`

Transfer an NFT.

```bash
tokens nft:transfer <mint> --to <recipient>
```

## `tokens nft:burn`

Burn an NFT.

```bash
tokens nft:burn <mint>
```

## `tokens nft:info`

Get NFT information.

```bash
tokens nft:info <mint>
```

### Example Output

```text
NFT Info:
  Mint: ABC123...
  Name: Cool NFT #1
  Symbol: COOL
  URI: https://arweave.net/abc123
  Collection: DEF456...
  Royalty: 5%
  Creators:
    - ABC123... (100%)
```

## `tokens nft:list`

List NFTs owned by an address.

```bash
tokens nft:list
tokens nft:list --owner <address>
```

### Example Output

```text
NFTs (3 total):
  1. Cool NFT #1 (ABC123...)
  2. Cool NFT #2 (DEF456...)
  3. Rare Item (GHI789...)
```

## `tokens collection:create`

Create a new NFT collection.

```bash
tokens collection:create --name "My Collection" --symbol MCOL --uri https://...
```

### Required Options

| Option | Description |
|--------|-------------|
| `--name`, `-n` | Collection name |
| `--symbol`, `-s` | Collection symbol |
| `--uri`, `-u` | Collection metadata URI |

### Optional Options

| Option | Description |
|--------|-------------|
| `--royalty` | Default royalty for items |
| `--size` | Expected collection size |

## `tokens collection:verify`

Verify an NFT belongs to a collection.

```bash
tokens collection:verify <nft-mint> --collection <collection-mint>
```

## `tokens collection:info`

Get collection information.

```bash
tokens collection:info <collection-mint>
```

### Example Output

```text
Collection Info:
  Mint: ABC123...
  Name: My Collection
  Symbol: MCOL
  Size: 1000
  Minted: 42
  Royalty: 5%
```

## Related

- [CLI Overview](./index.md)
- [Token Commands](./tokens.md)
- [Candy Machine Commands](./candy-machine.md)
