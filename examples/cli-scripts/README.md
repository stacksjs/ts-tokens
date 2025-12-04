# CLI Scripts

Useful shell scripts for common token operations.

## Scripts

### batch-mint.sh

Batch mint NFTs to a collection.

```bash
chmod +x batch-mint.sh
./batch-mint.sh <collection-mint> [count]
```

### setup-candy-machine.sh

Interactive script to set up a Candy Machine with common guards.

```bash
chmod +x setup-candy-machine.sh
./setup-candy-machine.sh
```

## Requirements

- `tokens` CLI installed and configured
- `jq` for JSON parsing (optional, for some scripts)
- Wallet with SOL for transactions

## Customization

These scripts are starting points. Modify them for your specific needs:

- Change default values
- Add additional guards
- Modify error handling
- Add logging to files
