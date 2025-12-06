# Storage Commands

Upload and manage files on decentralized storage.

## `tokens storage:upload`

Upload files to decentralized storage.

```bash
tokens storage:upload ./image.png
tokens storage:upload ./metadata.json --provider arweave
tokens storage:upload ./assets/ --provider ipfs
```

### Options

| Option             | Description                                    |
| ------------------ | ---------------------------------------------- |
| `--provider`, `-p` | Storage provider (arweave, ipfs, shadow-drive) |
| `--batch-size`     | Files per batch (default: 10)                  |
| `--concurrent`     | Concurrent uploads (default: 5)                |

### Example Output

```text
Uploading image.png...
✅ Uploaded successfully!
   URI: https://arweave.net/abc123xyz
   Size: 245 KB
   Cost: 0.0001 SOL
```

## `tokens storage:upload-dir`

Upload an entire directory.

```bash
tokens storage:upload-dir ./assets/ --provider arweave
```

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

## `tokens storage:info`

Get information about an uploaded file.

```bash
tokens storage:info https://arweave.net/abc123
```

### Example Output

```text
Storage Info:
  Provider: Arweave
  Transaction ID: abc123xyz
  Size: 245 KB
  Content-Type: image/png
  Status: Confirmed
  Uploaded: 2024-01-15 10:30:00 UTC
```

## `tokens storage:download`

Download a file from storage.

```bash
tokens storage:download https://arweave.net/abc123 --output ./downloaded.png
```

## `tokens storage:pin`

Pin content on IPFS.

```bash
tokens storage:pin QmXyz... --provider pinata
```

## `tokens storage:unpin`

Unpin content from IPFS.

```bash
tokens storage:unpin QmXyz... --provider pinata
```

## `tokens storage:estimate`

Estimate upload cost.

```bash
tokens storage:estimate ./image.png --provider arweave
tokens storage:estimate ./assets/ --provider arweave
```

### Example Output

```text
Cost Estimate:
  Files: 100
  Total size: 24.5 MB
  Provider: Arweave
  Estimated cost: 0.01 SOL (~$2.50)
```

## `tokens storage:config`

Configure storage providers.

```bash
# Set default provider
tokens storage:config --default arweave

# Configure Pinata
tokens storage:config --pinata-key YOUR_API_KEY --pinata-secret YOUR_SECRET

# Configure NFT.Storage
tokens storage:config --nft-storage-key YOUR_KEY
```

## Provider Comparison

| Provider           | Permanence       | Cost     | Speed  |
| ------------------ | ---------------- | -------- | ------ |
| Arweave            | Permanent        | One-time | Medium |
| IPFS (Pinata)      | Requires pinning | Monthly  | Fast   |
| IPFS (NFT.Storage) | Free tier        | Free     | Fast   |
| Shadow Drive       | Permanent        | One-time | Fast   |

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
tokens storage:upload-dir ./images/ --provider arweave

# 2. Generate metadata with image URIs
tokens metadata:generate ./images/ --output ./metadata/

# 3. Upload metadata
tokens storage:upload-dir ./metadata/ --provider arweave

# 4. Use metadata URIs for minting
tokens nft:create --uri https://arweave.net/metadata/0.json
```

## Related

- [Storage Options Guide](/guides/storage-options.md)
- [Metadata Standards](/guides/metadata-standards.md)
