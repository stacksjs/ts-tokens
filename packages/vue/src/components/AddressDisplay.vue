<script setup lang="ts">
import { ref, computed } from 'vue'

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
  if (!props.truncate) return props.address
  return `${props.address.slice(0, props.chars)}...${props.address.slice(-props.chars)}`
})

const handleCopy = async () => {
  if (!props.copyable) return
  await navigator.clipboard.writeText(props.address)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <span
    :style="{ cursor: copyable ? 'pointer' : 'default', fontFamily: 'monospace' }"
    @click="handleCopy"
    @keydown.enter.prevent="handleCopy"
    @keydown.space.prevent="handleCopy"
    :title="address"
    :aria-label="`Address: ${address}${copyable ? '. Click to copy' : ''}`"
    :role="copyable ? 'button' : undefined"
    :tabindex="copyable ? 0 : undefined"
  >
    {{ displayAddress }} <span v-if="copied" aria-live="polite">✓ Copied</span>
  </span>
</template>
