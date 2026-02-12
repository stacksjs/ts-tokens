<script setup lang="ts">
import { useProposals } from '../composables/useProposals'

const props = withDefaults(defineProps<{
  daoAddress: string
  limit?: number
}>(), { limit: 10 })

const { proposals, loading, error } = useProposals(props.daoAddress)
</script>

<template>
  <div v-if="loading" aria-busy="true">Loading proposals...</div>
  <div v-else-if="error" role="alert">Error loading proposals</div>
  <div v-else-if="proposals.length === 0">No proposals found</div>
  <ul v-else style="list-style: none; padding: 0;" role="list" aria-label="Proposals">
    <li v-for="p in proposals.slice(0, limit)" :key="p.address" style="padding: 12px; border-bottom: 1px solid #eee;">
      <strong>{{ p.title }}</strong>
      <span style="margin-left: 8px; color: #666;">{{ p.status }}</span>
    </li>
  </ul>
</template>
