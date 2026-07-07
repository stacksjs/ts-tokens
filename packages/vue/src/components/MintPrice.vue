<script setup lang="ts">
import { computed } from 'vue'
import { useCandyMachine } from '../composables'
import { formatUnits } from '../utils/format'

const props = withDefaults(defineProps<{
  candyMachine: string
  showSymbol?: boolean
  decimals?: number
}>(), {
  showSymbol: true,
  decimals: 4,
})

const LAMPORTS_DECIMALS = 9

const { candyMachine: cm, loading } = useCandyMachine(() => props.candyMachine)

const price = computed(() => {
  if (!cm.value) return null
  // price is in lamports — convert without floating-point precision loss.
  return formatUnits(cm.value.price, LAMPORTS_DECIMALS, props.decimals)
})
</script>

<template>
  <span v-if="loading">...</span>
  <span v-else-if="!cm">--</span>
  <span v-else>{{ price }} <template v-if="showSymbol">SOL</template></span>
</template>
