<script setup lang="ts">
import { useWallet } from '../composables'

const props = withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Disconnect',
})

const emit = defineEmits<{
  disconnect: []
}>()

const { connected, disconnect } = useWallet()

const handleClick = async () => {
  await disconnect()
  emit('disconnect')
}
</script>

<template>
  <button v-if="connected" @click="handleClick">
    {{ label }}
  </button>
</template>
