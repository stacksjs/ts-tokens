# Metadata Standards

Best practices for NFT and token metadata on Solana.

## Token Metadata Standard

### On-Chain Data

Stored directly on Solana:

- **Name** - Up to 32 characters
- **Symbol** - Up to 10 characters
- **URI** - Link to off-chain metadata
- **Seller Fee Basis Points** - Royalty percentage
- **Creators** - List of creator addresses and shares

### Off-Chain Metadata

JSON file hosted on Arweave, IPFS, or other storage:

```json
{
  "name": "My NFT #1",
  "symbol": "MNFT",
  "description": "A unique digital collectible",
  "image": "https://arweave.net/image.png",
  "animation_url": "https://arweave.net/video.mp4",
  "external_url": "https://myproject.com/nft/1",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Power",
      "value": 100,
      "display_type": "number"
    }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/image.png",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

## Required Fields

| Field    | Type   | Description       |
| -------- | ------ | ----------------- |
| `name`   | string | NFT name          |
| `symbol` | string | Collection symbol |
| `image`  | string | Primary image URL |

## Optional Fields

| Field           | Type   | Description         |
| --------------- | ------ | ------------------- |
| `description`   | string | NFT description     |
| `animation_url` | string | Video/audio/3D file |
| `external_url`  | string | Project website     |
| `attributes`    | array  | Trait list          |
| `properties`    | object | Additional files    |

## Attributes

### Text Attributes

```json
{
  "trait_type": "Background",
  "value": "Blue"
}
```

### Numeric Attributes

```json
{
  "trait_type": "Power",
  "value": 100,
  "display_type": "number"
}
```

### Percentage Attributes

```json
{
  "trait_type": "Stamina",
  "value": 75,
  "display_type": "percentage"
}
```

### Date Attributes

```json
{
  "trait_type": "Birthday",
  "value": 1672531200,
  "display_type": "date"
}
```

## File Types

### Images

Supported formats:

- PNG (recommended)
- JPG/JPEG
- GIF
- SVG
- WebP

```json
{
  "image": "https://arweave.net/image.png",
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/image.png",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

### Video

```json
{
  "image": "https://arweave.net/thumbnail.png",
  "animation_url": "https://arweave.net/video.mp4",
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/video.mp4",
        "type": "video/mp4"
      }
    ],
    "category": "video"
  }
}
```

### Audio

```json
{
  "image": "https://arweave.net/cover.png",
  "animation_url": "https://arweave.net/audio.mp3",
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/audio.mp3",
        "type": "audio/mpeg"
      }
    ],
    "category": "audio"
  }
}
```

### 3D Models

```json
{
  "image": "https://arweave.net/preview.png",
  "animation_url": "https://arweave.net/model.glb",
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/model.glb",
        "type": "model/gltf-binary"
      }
    ],
    "category": "vr"
  }
}
```

## Collection Metadata

```json
{
  "name": "My Collection",
  "symbol": "MCOL",
  "description": "A collection of unique NFTs",
  "image": "https://arweave.net/collection.png",
  "external_url": "https://myproject.com",
  "seller_fee_basis_points": 500,
  "fee_recipient": "CreatorAddress..."
}
```

## Fungible Token Metadata

```json
{
  "name": "My Token",
  "symbol": "MTK",
  "description": "A utility token",
  "image": "https://arweave.net/logo.png"
}
```

## Best Practices

### Image Guidelines

- **Resolution**: 1000x1000 minimum
- **Format**: PNG for quality, JPG for photos
- **Size**: Under 5MB for fast loading
- **Aspect Ratio**: 1:1 recommended

### Metadata Guidelines

1. **Use permanent storage** - Arweave or IPFS with pinning
2. **Include all files** - List in properties.files
3. **Validate JSON** - Ensure valid JSON format
4. **Test display** - Check on major marketplaces
5. **Keep it consistent** - Same format across collection

### Attribute Guidelines

1. **Use consistent naming** - "Background" not "background" or "bg"
2. **Limit trait types** - 10-15 max for readability
3. **Include rarity** - Helps with marketplace filtering
4. **Avoid special characters** - Stick to alphanumeric

## Validation

```typescript
import { validateMetadata } from 'ts-tokens'

const metadata = {
  name: 'My NFT',
  symbol: 'MNFT',
  image: 'https://arweave.net/image.png',
  // ...
}

const { valid, errors } = validateMetadata(metadata)

if (!valid) {
  console.error('Metadata errors:', errors)
}
```

## Next Steps

- [Storage Options](./storage-options.md)
- [Upload Metadata](/api/storage/upload.md)
