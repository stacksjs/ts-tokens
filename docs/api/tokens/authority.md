# Token Authority Management

Manage mint and freeze authorities for tokens.

## Authority Types

| Authority | Description |
|-----------|-------------|
| Mint Authority | Can mint new tokens |
| Freeze Authority | Can freeze/thaw token accounts |

## Get Current Authorities

```typescript
import { getTokenInfo, getConfig } from 'ts-tokens'

const config = await getConfig()

const info = await getTokenInfo('TOKEN_MINT_ADDRESS', config)

console.log('Mint Authority:', info.mintAuthority || 'None')
console.log('Freeze Authority:', info.freezeAuthority || 'None')
```

## Transfer Mint Authority

```typescript
import { setMintAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

await setMintAuthority(
  'TOKEN_MINT_ADDRESS',
  'NEW_AUTHORITY_ADDRESS',
  config
)
```

## Revoke Mint Authority

Permanently disable minting:

```typescript
import { revokeMintAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

await revokeMintAuthority('TOKEN_MINT_ADDRESS', config)
```

**Warning**: This is irreversible. No more tokens can ever be minted.

## Transfer Freeze Authority

```typescript
import { setFreezeAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

await setFreezeAuthority(
  'TOKEN_MINT_ADDRESS',
  'NEW_AUTHORITY_ADDRESS',
  config
)
```

## Revoke Freeze Authority

Permanently disable freezing:

```typescript
import { revokeFreezeAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

await revokeFreezeAuthority('TOKEN_MINT_ADDRESS', config)
```

## Freeze Account

Freeze a token account (prevent transfers):

```typescript
import { freezeAccount, getConfig } from 'ts-tokens'

const config = await getConfig()

await freezeAccount(
  'TOKEN_ACCOUNT_ADDRESS',
  'TOKEN_MINT_ADDRESS',
  config
)
```

## Thaw Account

Unfreeze a token account:

```typescript
import { thawAccount, getConfig } from 'ts-tokens'

const config = await getConfig()

await thawAccount(
  'TOKEN_ACCOUNT_ADDRESS',
  'TOKEN_MINT_ADDRESS',
  config
)
```

## CLI Usage

```bash
# View authorities
tokens token:info <mint>

# Transfer mint authority
tokens token:authority <mint> --mint-authority <new-address>

# Revoke mint authority
tokens token:authority <mint> --revoke-mint

# Transfer freeze authority
tokens token:authority <mint> --freeze-authority <new-address>

# Revoke freeze authority
tokens token:authority <mint> --revoke-freeze

# Freeze account
tokens token:freeze <token-account> --mint <mint>

# Thaw account
tokens token:thaw <token-account> --mint <mint>
```

## Best Practices

1. **Revoke mint authority** for fixed-supply tokens
2. **Revoke freeze authority** if you don't need to freeze accounts
3. **Use multisig** for high-value tokens
4. **Document authority changes** for transparency

## Multisig Authority

For enhanced security, use a multisig as authority:

```typescript
import { createMultisig, setMintAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

// Create 2-of-3 multisig
const multisig = await createMultisig(
  [signer1, signer2, signer3],
  2, // Required signatures
  config
)

// Set multisig as mint authority
await setMintAuthority(mint, multisig.address, config)
```

## Related

- [Creating Tokens](./create.md)
- [Minting Tokens](./mint.md)
- [Token-2022 Extensions](/api/token-2022/extensions.md)
