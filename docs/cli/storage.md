# Storage Commands

Upload files to decentralized storage.

## `tokens upload <path>`

Upload a file to decentralized storage.

```bash
tokens upload ./image.png
tokens upload ./metadata.json --provider arweave
tokens upload ./image.png --provider ipfs --type image/png
```

### Options

| Option | Description |
|--------|-------------|
| `--provider <provider>` | Storage provider (arweave, ipfs, shadow) (default: `arweave`) |
| `--type <type>` | Content type (image, json, etc.) |

### Example Output

```text
Uploading image.png...
✅ Uploaded successfully!
   URI: https://arweave.net/abc123xyz
   Size: 245 KB
   Cost: 0.0001 SOL
```

## `tokens upload-assets <directory>`

Bulk upload an entire directory of assets.

```bash
tokens upload-assets ./assets/ --provider arweave
tokens upload-assets ./assets/ --provider arweave --output ./manifest.json
```

### Options

| Option | Description |
|--------|-------------|
| `--provider <provider>` | Storage provider (default: `arweave`) |
| `--output <path>` | Output manifest path |

### Example Output

```text
Uploading 100 files...
[████████████████████████████████████████] 100%

✅ Upload complete!
   Files: 100
   Total size: 24.5 MB
   Total cost: 0.01 SOL
   Base URI: https://arweave.net/folder123/
```

## `tokens upload-metadata <path>`

Upload a metadata JSON file.

```bash
tokens upload-metadata ./metadata/0.json --provider arweave
```

### Options

| Option | Description |
|--------|-------------|
| `--provider <provider>` | Storage provider (default: `arweave`) |

## Provider Comparison

| Provider | Permanence | Cost | Speed |
|----------|------------|------|-------|
| Arweave | Permanent | One-time | Medium |
| IPFS (Pinata) | Requires pinning | Monthly | Fast |
| IPFS (NFT.Storage) | Free tier | Free | Fast |
| Shadow Drive | Permanent | One-time | Fast |

## Environment Variables

```bash
export ARWEAVE_WALLET=./arweave-wallet.json
export PINATA_API_KEY=your_key
export PINATA_SECRET_KEY=your_secret
export NFT_STORAGE_KEY=your_key
export SHADOW_DRIVE_KEYPAIR=./keypair.json
```

## Metadata Upload Workflow

```bash
# 1. Upload images
tokens upload-assets ./images/ --provider arweave

# 2. Upload metadata JSON files
tokens upload-assets ./metadata/ --provider arweave

# 3. Mint an NFT from an uploaded metadata URI
tokens nft:mint https://arweave.net/metadata/0.json --name "My NFT" --symbol MNFT
```

## Related

- [Storage Options Guide](/guides/storage-options.md)
- [Metadata Standards](/guides/metadata-standards.md)
