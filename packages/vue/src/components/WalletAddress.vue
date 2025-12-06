<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  address: string
  truncate?: boolean
  chars?: number
}>(), {
  truncate: true,
  chars: 4,
})

const displayAddress = computed(() => {
  if (!props.truncate)
    return props.address
  return `${props.address.slice(0, props.chars)}...${props.address.slice(-props.chars)}`
})
</script>

<template>
  <span :title="address">{{ displayAddress }}</span>
</template>
