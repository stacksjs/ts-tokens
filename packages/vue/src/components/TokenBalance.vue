<script setup lang="ts">
import { useTokenBalance } from '../composables'

const props = withDefaults(defineProps<{
  mint: string
  owner: string
  showSymbol?: boolean
  symbol?: string
}>(), {
  showSymbol: false,
  symbol: '',
})

const { uiBalance, loading, error } = useTokenBalance(props.mint, props.owner)
</script>

<template>
  <span v-if="loading" aria-busy="true" aria-label="Loading balance">...</span>
  <span v-else-if="error" role="alert">Error</span>
  <span v-else :aria-label="`Token balance: ${uiBalance.toLocaleString()}${showSymbol && symbol ? ` ${symbol}` : ''}`">{{ uiBalance.toLocaleString() }} <template v-if="showSymbol">{{ symbol }}</template></span>
</template>
