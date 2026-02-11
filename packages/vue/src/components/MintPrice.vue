<script setup lang="ts">
import { computed } from 'vue'
import { useCandyMachine } from '../composables'

const props = withDefaults(defineProps<{
  candyMachine: string
  showSymbol?: boolean
  decimals?: number
}>(), {
  showSymbol: true,
  decimals: 4,
})

const { candyMachine: cm, loading } = useCandyMachine(props.candyMachine)

const price = computed(() => {
  if (!cm.value) return null
  return (Number(cm.value.price) / 1e9).toFixed(props.decimals)
})
</script>

<template>
  <span v-if="loading">...</span>
  <span v-else-if="!cm">--</span>
  <span v-else>{{ price }} <template v-if="showSymbol">SOL</template></span>
</template>
