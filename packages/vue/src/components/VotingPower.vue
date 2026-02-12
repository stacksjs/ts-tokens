<script setup lang="ts">
import { useVotingPower } from '../composables/useVotingPower'

const props = defineProps<{
  daoAddress: string
  voterAddress: string
}>()

const { ownPower, delegatedPower, totalPower, loading, error } = useVotingPower(props.daoAddress, props.voterAddress)
</script>

<template>
  <span v-if="loading" aria-busy="true">...</span>
  <span v-else-if="error" role="alert">Error</span>
  <div v-else :aria-label="`Voting power: ${totalPower.toString()}`">
    <div>Own: {{ ownPower.toString() }}</div>
    <div>Delegated: {{ delegatedPower.toString() }}</div>
    <div style="font-weight: bold;">Total: {{ totalPower.toString() }}</div>
  </div>
</template>
