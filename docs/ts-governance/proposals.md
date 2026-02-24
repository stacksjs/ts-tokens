# Proposals

## Creating Proposals

Proposals use PDA-derived addresses based on DAO address and proposal index.

```typescript
import { proposals } from 'ts-governance'

const { proposal } = await proposals.createProposal(connection, proposer, {
  dao: daoAddress,
  title: 'Transfer Funds',
  description: 'Transfer 10 SOL to developer wallet',
  actions: [proposals.treasuryActions.transferSOL(recipient, 10_000_000_000n)],
})
```

## Action Builders

### Treasury Actions

- `treasuryActions.transferSOL(recipient, amount)` - Transfer SOL
- `treasuryActions.transferToken(mint, recipient, amount)` - Transfer tokens
- `treasuryActions.transferNFT(mint, recipient)` - Transfer NFT

### Governance Actions

- `governanceActions.updateConfig(newConfig)` - Update DAO config
- `governanceActions.addVetoAuthority(authority)` - Add veto authority
- `governanceActions.removeVetoAuthority()` - Remove veto authority

### Token Actions

- `tokenActions.mint(mint, recipient, amount)` - Mint tokens
- `tokenActions.burn(mint, amount)` - Burn tokens
- `tokenActions.transferAuthority(mint, newAuthority)` - Transfer authority

## Lifecycle

1. **Create** - Proposal is created with 'active' status
2. **Vote** - Token holders vote during voting period
3. **Queue** - Successful proposals are queued for execution
4. **Execute** - After execution delay, proposal can be executed
