<script setup lang="ts">
import { useTreasury } from '../composables/useTreasury'

const props = defineProps<{ daoAddress: string }>()
const { solBalance, tokens, loading, error } = useTreasury(props.daoAddress)
</script>

<template>
  <span v-if="loading" aria-busy="true">...</span>
  <span v-else-if="error" role="alert">Error</span>
  <div v-else aria-label="Treasury balance">
    <div style="font-size: 24px; font-weight: bold;">{{ solBalance.toFixed(4) }} SOL</div>
    <ul v-if="tokens.length > 0" style="list-style: none; padding: 0; margin-top: 8px;">
      <li v-for="t in tokens" :key="t.mint" style="font-size: 14px; color: #666;">{{ t.mint.slice(0, 8) }}...: {{ t.amount.toString() }}</li>
    </ul>
  </div>
</template>
