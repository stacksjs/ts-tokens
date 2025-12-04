<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  amount: number | bigint
  decimals?: number
  showSymbol?: boolean
}>(), {
  decimals: 4,
  showSymbol: true,
})

const value = computed(() => {
  const num = typeof props.amount === 'bigint' ? Number(props.amount) / 1e9 : props.amount
  return num.toFixed(props.decimals)
})
</script>

<template>
  <span>{{ value }} <template v-if="showSymbol">SOL</template></span>
</template>
