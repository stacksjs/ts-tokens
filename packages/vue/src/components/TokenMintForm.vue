<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  mint: string
  /**
   * Caller-supplied handler that performs the real mint transaction and
   * resolves with its signature. Required — this component does not build or
   * send transactions itself.
   */
  onMint: (params: { mint: string, amount: number, destination: string | null }) => Promise<string>
}>()

const emit = defineEmits<{
  mint: [signature: string]
}>()

const pending = ref(false)
const error = ref<Error | null>(null)
const amount = ref('')
const destination = ref('')
const validationError = ref<string | null>(null)

const handleSubmit = async () => {
  validationError.value = null
  error.value = null

  const numAmount = Number(amount.value)
  if (!amount.value || isNaN(numAmount) || numAmount <= 0) {
    validationError.value = 'Please enter a valid amount'
    return
  }

  pending.value = true
  try {
    const sig = await props.onMint({
      mint: props.mint,
      amount: numAmount,
      destination: destination.value.trim() || null,
    })
    emit('mint', sig)
  } catch (err) {
    error.value = err as Error
  } finally {
    pending.value = false
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
