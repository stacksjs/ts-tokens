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
  <span v-if="loading">...</span>
  <span v-else-if="error">Error</span>
  <span v-else>{{ uiBalance.toLocaleString() }} <template v-if="showSymbol">{{ symbol }}</template></span>
</template>
