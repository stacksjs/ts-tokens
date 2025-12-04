# Multi-Signature Support

Secure token operations with multi-sig authorities.

## Overview

Multi-sig allows multiple parties to control token authorities:

- **M-of-N Signing** - Require M signatures from N signers
- **Token Authorities** - Protect mint, freeze, update authorities
- **Transaction Proposals** - Create and sign transactions collaboratively
- **Team Security** - Prevent single points of failure

## Create a Multi-Sig

```typescript
import { createMultisig, getConfig } from 'ts-tokens'

const config = await getConfig()

const { address } = await createMultisig({
  signers: [signer1, signer2, signer3],
  threshold: 2, // 2-of-3 required
}, config)

console.log('Multi-sig address:', address)
```

## Set Multi-Sig as Token Authority

```typescript
import { setMintAuthority, getConfig } from 'ts-tokens'

const config = await getConfig()

// Transfer mint authority to multi-sig
await setMintAuthority(
  tokenMint,
  multisigAddress,
  config
)
```

## Create a Multi-Sig Transaction

```typescript
import { createMultisigTransaction, getConfig } from 'ts-tokens'

const config = await getConfig()

const { transaction } = await createMultisigTransaction({
  multisig: multisigAddress,
  instruction: mintInstruction,
  description: 'Mint 1000 tokens to treasury',
}, config)

console.log('Transaction ID:', transaction.id)
```

## Sign a Transaction

```typescript
import { signMultisigTransaction, getConfig } from 'ts-tokens'

const config = await getConfig()

const { signed, remainingSignatures } = await signMultisigTransaction({
  transactionId: txId,
  signer: myKeypair,
}, config)

console.log('Remaining signatures needed:', remainingSignatures)
```

## Execute a Transaction

```typescript
import { executeMultisigTransaction, canExecute, getConfig } from 'ts-tokens'

const config = await getConfig()

// Check if ready to execute
const { canExecute: ready, reason } = await canExecute(txId, config)

if (ready) {
  await executeMultisigTransaction({
    transactionId: txId,
  }, config)
}
```

## Get Pending Transactions

```typescript
import { getPendingSignatures, getConfig } from 'ts-tokens'

const config = await getConfig()

const pending = await getPendingSignatures(multisigAddress, config)

for (const tx of pending) {
  console.log(`${tx.transactionId}: ${tx.currentSignatures}/${tx.requiredSignatures} signatures`)
}
```

## Get Multi-Sig Info

```typescript
import { getMultisig, getConfig } from 'ts-tokens'

const config = await getConfig()

const multisig = await getMultisig(multisigAddress, config)

console.log('Threshold:', multisig.m, 'of', multisig.n)
console.log('Signers:', multisig.signers)
```

## CLI Usage

```bash
# Create multi-sig
tokens multisig:create \
  --signers <addr1>,<addr2>,<addr3> \
  --threshold 2

# Set as mint authority
tokens token:authority <mint> --mint-authority <multisig>

# Create transaction
tokens multisig:propose <multisig> \
  --instruction mint \
  --mint <token> \
  --amount 1000 \
  --to <recipient>

# Sign transaction
tokens multisig:sign <tx-id>

# Execute transaction
tokens multisig:execute <tx-id>

# List pending
tokens multisig:pending <multisig>

# Get info
tokens multisig:info <multisig>
```

## Best Practices

1. **Use 2-of-3 or 3-of-5** for most use cases
2. **Distribute keys** across different devices/locations
3. **Use hardware wallets** for signers
4. **Test on devnet** before mainnet
5. **Document signers** and their responsibilities

## Security Considerations

- Multi-sig addresses are deterministic from signers
- Order of signers matters for the address
- Lost keys can lock funds if threshold not met
- Consider time-locks for additional security

## Related

- [Authority Management](/api/tokens/authority.md)
- [Governance](/api/governance/index.md)
- [Security Best Practices](/guides/security.md)
