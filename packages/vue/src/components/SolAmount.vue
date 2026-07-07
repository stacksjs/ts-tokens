<script setup lang="ts">
import { computed } from 'vue'
import { formatUnits } from '../utils/format'

const props = withDefaults(defineProps<{
  amount: number | bigint
  decimals?: number
  showSymbol?: boolean
}>(), {
  decimals: 4,
  showSymbol: true,
})

const LAMPORTS_DECIMALS = 9

const value = computed(() => {
  // bigint amounts are lamports — convert without floating-point precision loss.
  if (typeof props.amount === 'bigint') {
    return formatUnits(props.amount, LAMPORTS_DECIMALS, props.decimals)
  }
  return props.amount.toFixed(props.decimals)
})
</script>

<template>
  <span>{{ value }} <template v-if="showSymbol">SOL</template></span>
</template>
