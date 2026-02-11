<script setup lang="ts">
import { ref } from 'vue'
import { useWallet } from '../composables'

const props = withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Connect Wallet',
})

const emit = defineEmits<{
  connect: []
  disconnect: []
}>()

const { connected, connecting, publicKey, connect, disconnect } = useWallet()
const showDropdown = ref(false)

const handleConnect = async () => {
  await connect()
  emit('connect')
}

const handleDisconnect = async () => {
  await disconnect()
  showDropdown.value = false
  emit('disconnect')
}

const truncatedAddress = () => {
  const addr = publicKey.value?.toBase58() ?? ''
  return addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : ''
}
</script>

<template>
  <button v-if="!connected" @click="handleConnect" :disabled="connecting">
    {{ connecting ? 'Connecting...' : label }}
  </button>
  <div v-else style="position: relative; display: inline-block">
    <button @click="showDropdown = !showDropdown">
      {{ truncatedAddress() }}
    </button>
    <div v-if="showDropdown" style="position: absolute; top: 100%; right: 0; margin-top: 4px; background: #fff; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10; min-width: 160px">
      <div style="padding: 8px 12px; font-size: 12px; color: #666; border-bottom: 1px solid #eee">
        {{ publicKey?.toBase58() }}
      </div>
      <button @click="handleDisconnect" style="display: block; width: 100%; padding: 8px 12px; border: none; background: none; cursor: pointer; text-align: left">
        Disconnect
      </button>
    </div>
  </div>
</template>
