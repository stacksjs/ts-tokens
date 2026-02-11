<script setup lang="ts">
import { ref } from 'vue'
import { useTransaction } from '../composables'

const props = defineProps<{
  mint: string
}>()

const emit = defineEmits<{
  mint: [signature: string]
}>()

const { pending, error, send, reset } = useTransaction()
const amount = ref('')
const destination = ref('')
const validationError = ref<string | null>(null)

const handleSubmit = async () => {
  validationError.value = null
  reset()

  const numAmount = Number(amount.value)
  if (!amount.value || isNaN(numAmount) || numAmount <= 0) {
    validationError.value = 'Please enter a valid amount'
    return
  }

  try {
    const sig = await send(new Uint8Array())
    emit('mint', sig)
  } catch {
    // Error captured in composable
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div style="margin-bottom: 8px">
      <label style="display: block; margin-bottom: 4px; font-size: 14px">Amount to Mint</label>
      <input
        v-model="amount"
        type="number"
        placeholder="0"
        min="0"
        style="width: 100%; padding: 6px 8px; box-sizing: border-box"
      />
    </div>
    <div style="margin-bottom: 8px">
      <label style="display: block; margin-bottom: 4px; font-size: 14px">Destination (optional)</label>
      <input
        v-model="destination"
        type="text"
        placeholder="Wallet address (defaults to your wallet)"
        style="width: 100%; padding: 6px 8px; box-sizing: border-box"
      />
    </div>
    <div v-if="validationError" style="color: #e74c3c; font-size: 13px; margin-bottom: 8px">{{ validationError }}</div>
    <div v-if="error" style="color: #e74c3c; font-size: 13px; margin-bottom: 8px">{{ error.message }}</div>
    <button type="submit" :disabled="pending">
      {{ pending ? 'Minting...' : 'Mint Tokens' }}
    </button>
  </form>
</template>
