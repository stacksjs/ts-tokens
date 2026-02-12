<script setup lang="ts">
import { useDAO } from '../composables/useDAO'

const props = defineProps<{ daoAddress: string }>()
const { name, proposalCount, totalVotingPower, config, loading, error } = useDAO(props.daoAddress)
</script>

<template>
  <div v-if="loading" aria-busy="true">Loading...</div>
  <div v-else-if="error" role="alert">Error</div>
  <div v-else style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;" aria-label="Governance statistics">
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <div style="font-size: 12px; color: #666;">DAO</div>
      <div style="font-size: 18px; font-weight: bold;">{{ name ?? 'Unknown' }}</div>
    </div>
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <div style="font-size: 12px; color: #666;">Proposals</div>
      <div style="font-size: 18px; font-weight: bold;">{{ proposalCount }}</div>
    </div>
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <div style="font-size: 12px; color: #666;">Voting Power</div>
      <div style="font-size: 18px; font-weight: bold;">{{ totalVotingPower.toString() }}</div>
    </div>
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <div style="font-size: 12px; color: #666;">Quorum</div>
      <div style="font-size: 18px; font-weight: bold;">{{ config?.quorum ?? 0 }}%</div>
    </div>
  </div>
</template>
