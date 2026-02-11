<script setup lang="ts">
import { useWallet } from '../composables'

const props = withDefaults(defineProps<{
  label?: string
  disabled?: boolean
}>(), {
  label: 'Connect Wallet',
  disabled: false,
})

const emit = defineEmits<{
  connect: []
}>()

const { connected, connecting, connect } = useWallet()

const handleClick = async () => {
  if (props.disabled || connecting.value || connected.value) return
  await connect()
  emit('connect')
}

const buttonText = () => {
  if (connecting.value) return 'Connecting...'
  if (connected.value) return 'Connected'
  return props.label
}
</script>

<template>
  <button
    @click="handleClick"
    :disabled="disabled || connecting || connected"
    :aria-label="connecting ? 'Connecting to wallet' : connected ? 'Wallet connected' : 'Connect wallet'"
    :aria-busy="connecting"
  >
    {{ buttonText() }}
  </button>
</template>
