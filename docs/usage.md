# Usage

There are two ways of using ts-tokens: _as a library or as a CLI._

## Library

Given the npm package is installed:

### Create a Token

```ts
import { createToken } from 'ts-tokens'

const token = await createToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000,
})
```

### Mint Tokens

```ts
import { mintTokens } from 'ts-tokens'

await mintTokens({
  mint: 'TOKEN_MINT_ADDRESS',
  amount: 1_000,
  recipient: 'RECIPIENT_ADDRESS',
})
```

### Transfer Tokens

```ts
import { transferTokens } from 'ts-tokens'

await transferTokens({
  mint: 'TOKEN_MINT_ADDRESS',
  amount: 500,
  from: 'SENDER_ADDRESS',
  to: 'RECIPIENT_ADDRESS',
})
```

### Create an NFT

```ts
import { createNFT } from 'ts-tokens'

const nft = await createNFT({
  name: 'My NFT',
  symbol: 'MNFT',
  uri: 'https://example.com/metadata.json',
})
```

### Create an NFT Collection

```ts
import { createCollection } from 'ts-tokens'

const collection = await createCollection({
  name: 'My Collection',
  symbol: 'MCOL',
  uri: 'https://example.com/collection-metadata.json',
})
```

For more details, see the [API documentation](/api/tokens/create).

## CLI

```bash
tokens create-token --name "My Token" --symbol MTK --decimals 9
tokens mint --mint TOKEN_MINT_ADDRESS --amount 1000
tokens transfer --mint TOKEN_MINT_ADDRESS --amount 500 --to RECIPIENT_ADDRESS
tokens --help
tokens --version
```

## Testing

```bash
bun test
```
