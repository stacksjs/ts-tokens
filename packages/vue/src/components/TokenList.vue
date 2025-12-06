<script setup lang="ts">
import { useTokenAccounts } from '../composables'

const props = defineProps<{
  owner: string
}>()

const { accounts, loading, error } = useTokenAccounts(props.owner)
</script>

<template>
  <div v-if="loading">
    Loading tokens...
  </div>
  <div v-else-if="error">
    Error: {{ error.message }}
  </div>
  <div v-else-if="accounts.length === 0">
    No tokens found
  </div>
  <div v-else>
    <div v-for="token in accounts" :key="token.mint" style="padding: 8px; border-bottom: 1px solid #eee;">
      <div><strong>{{ token.symbol || token.mint.slice(0, 8) }}...</strong></div>
      <div>Balance: {{ token.uiBalance }}</div>
    </div>
  </div>
</template>
