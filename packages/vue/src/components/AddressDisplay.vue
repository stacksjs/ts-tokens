<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  address: string
  truncate?: boolean
  chars?: number
  copyable?: boolean
}>(), {
  truncate: true,
  chars: 4,
  copyable: true,
})

const copied = ref(false)

const displayAddress = computed(() => {
  if (!props.truncate)
    return props.address
  return `${props.address.slice(0, props.chars)}...${props.address.slice(-props.chars)}`
})

async function handleCopy() {
  if (!props.copyable)
    return
  await navigator.clipboard.writeText(props.address)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <span
    :style="{ cursor: copyable ? 'pointer' : 'default', fontFamily: 'monospace' }"
    :title="address"
    @click="handleCopy"
  >
    {{ displayAddress }} <template v-if="copied">✓</template>
  </span>
</template>
