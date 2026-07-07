<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  mint: string
  disabled?: boolean
  /**
   * Caller-supplied handler that performs the real transfer transaction and
   * resolves with its signature. Required — this component does not build or
   * send transactions itself.
   */
  onTransfer: (mint: string, recipient: string) => Promise<string>
}>()

const emit = defineEmits<{
  transfer: [signature: string]
}>()

const pending = ref(false)
const error = ref<Error | null>(null)
const showInput = ref(false)
const recipient = ref('')

const handleTransfer = async () => {
  if (!recipient.value.trim()) return
  error.value = null
  pending.value = true

  try {
    const sig = await props.onTransfer(props.mint, recipient.value.trim())
    emit('transfer', sig)
    showInput.value = false
    recipient.value = ''
  } catch (err) {
    error.value = err as Error
  } finally {
    pending.value = false
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
