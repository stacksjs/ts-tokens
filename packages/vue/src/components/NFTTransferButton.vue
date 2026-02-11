<script setup lang="ts">
import { ref } from 'vue'
import { useTransaction } from '../composables'

defineProps<{
  mint: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  transfer: [signature: string]
}>()

const { pending, error, send, reset } = useTransaction()
const showInput = ref(false)
const recipient = ref('')

const handleTransfer = async () => {
  if (!recipient.value.trim()) return
  reset()

  try {
    const sig = await send(new Uint8Array())
    emit('transfer', sig)
    showInput.value = false
    recipient.value = ''
  } catch {
    // Error captured in composable
  }
}
</script>

<template>
  <button v-if="!showInput" @click="showInput = true" :disabled="disabled || pending">
    Transfer NFT
  </button>
  <div v-else>
    <input
      v-model="recipient"
      type="text"
      placeholder="Recipient address"
      style="padding: 6px 8px; margin-right: 8px"
    />
    <button @click="handleTransfer" :disabled="pending || !recipient.trim()">
      {{ pending ? 'Sending...' : 'Send' }}
    </button>
    <button @click="showInput = false; recipient = ''" style="margin-left: 4px">
      Cancel
    </button>
    <div v-if="error" style="color: #e74c3c; font-size: 13px; margin-top: 4px">{{ error.message }}</div>
  </div>
</template>
