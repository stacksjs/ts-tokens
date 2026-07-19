# NFT Commands

Create and manage NFTs and collections.

## `tokens nft:create`

Create a new NFT.

```bash
tokens nft:create --name "My NFT" --symbol MNFT --uri https://arweave.net/...
tokens nft:create --name "My NFT" --symbol MNFT --uri https://... --collection <mint>
```

### Options

| Option | Description |
|--------|-------------|
| `--name <name>` | NFT name |
| `--symbol <symbol>` | NFT symbol |
| `--uri <uri>` | Metadata URI |
| `--collection <address>` | Collection address |
| `--royalty <bps>` | Royalty in basis points (e.g., 500 = 5%) |

### Example

```bash
tokens nft:create \
  --name "Cool NFT #1" \
  --symbol COOL \
  --uri https://arweave.net/abc123 \
  --royalty 500 \
  --collection ABC123...
```

## `tokens nft:mint <uri>`

Mint an NFT from an existing metadata URI.

```bash
tokens nft:mint https://arweave.net/metadata/0.json --name "My NFT" --symbol MNFT
```

### Options

| Option | Description |
|--------|-------------|
| `--name <name>` | NFT name |
| `--symbol <symbol>` | NFT symbol |
| `--royalty <bps>` | Royalty in basis points |
| `--collection <address>` | Collection address |

## `tokens nft:transfer <mint> <to>`

Transfer an NFT.

```bash
tokens nft:transfer <mint> <recipient>
```

## `tokens nft:burn <mint>`

Burn an NFT.

```bash
tokens nft:burn <mint>
```

## `tokens nft:info <mint>`

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

## `tokens nft:list [owner]`

List NFTs owned by an address (defaults to the configured wallet).

```bash
tokens nft:list
tokens nft:list <owner-address>
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

### Options

| Option | Description |
|--------|-------------|
| `--name <name>` | Collection name |
| `--symbol <symbol>` | Collection symbol |
| `--uri <uri>` | Collection metadata URI |
| `--royalty <bps>` | Royalty in basis points (e.g., 500 = 5%) |

## `tokens collection:verify <collection> <nft>`

Verify an NFT belongs to a collection.

```bash
tokens collection:verify <collection-mint> <nft-mint>
```

## `tokens collection:info <address>`

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

## `tokens collection:items <address>`

List the NFTs in a collection.

```bash
tokens collection:items <collection-mint>
tokens collection:items <collection-mint> --limit 100
```

### Options

| Option | Description |
|--------|-------------|
| `--limit <limit>` | Maximum items to list (default: `50`) |

## `tokens collection:update <address>`

Update collection metadata.

```bash
tokens collection:update <collection-mint> --name "New Name" --uri https://arweave.net/new...
```

### Options

| Option | Description |
|--------|-------------|
| `--name <name>` | New collection name |
| `--symbol <symbol>` | New symbol |
| `--uri <uri>` | New metadata URI |

## Related

- [CLI Overview](./index.md)
- [Token Commands](./tokens.md)
- [Candy Machine Commands](./candy-machine.md)
