# React & Vue Components

## React Components

```tsx
import {
  DAOProvider,
  ProposalList,
  ProposalCard,
  VoteButton,
  VotingPower,
  DelegateForm,
  TreasuryBalance,
  CreateProposalForm,
  GovernanceStats,
} from 'react-tokens'

function App() {
  return (
    <DAOProvider daoAddress="...">
      <GovernanceStats daoAddress="..." />
      <TreasuryBalance daoAddress="..." />
      <ProposalList daoAddress="..." />
      <VotingPower daoAddress="..." voterAddress="..." />
    </DAOProvider>
  )
}
```

## React Hooks

```tsx
import { useDAO, useProposals, useVotingPower, useTreasury } from 'react-tokens'

const { name, proposalCount, config, loading } = useDAO(daoAddress)
const { proposals, loading } = useProposals(daoAddress)
const { ownPower, delegatedPower, totalPower } = useVotingPower(daoAddress, voterAddress)
const { solBalance, tokens } = useTreasury(daoAddress)
```

## Vue Components

```vue
<template>
  <DAOProvider :dao-address="daoAddress">
    <GovernanceStats :dao-address="daoAddress" />
    <TreasuryBalance :dao-address="daoAddress" />
    <ProposalList :dao-address="daoAddress" />
    <VotingPower :dao-address="daoAddress" :voter-address="voterAddress" />
  </DAOProvider>
</template>
```

## Vue Composables

```typescript
import { useDAO, useProposals, useVotingPower, useTreasury } from 'vue-tokens'

const { name, proposalCount, config, loading } = useDAO(daoAddress)
const { proposals, loading } = useProposals(daoAddress)
const { ownPower, delegatedPower, totalPower } = useVotingPower(daoAddress, voterAddress)
const { solBalance, tokens } = useTreasury(daoAddress)
```
