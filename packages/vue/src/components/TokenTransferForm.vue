<script setup lang="ts">
import { ref } from 'vue'
import { useTokenBalance, useTransaction } from '../composables'

const props = defineProps<{
  mint: string
  owner: string
}>()

const emit = defineEmits<{
  transfer: [signature: string]
}>()

const { uiBalance, decimals, loading: balanceLoading } = useTokenBalance(props.mint, props.owner)
const { pending, error, send, reset } = useTransaction()
const recipient = ref('')
const amount = ref('')
const validationError = ref<string | null>(null)

const handleSubmit = async () => {
  validationError.value = null
  reset()

  if (!recipient.value.trim()) {
    validationError.value = 'Recipient address is required'
    return
  }

  const numAmount = Number(amount.value)
  if (!amount.value || isNaN(numAmount) || numAmount <= 0) {
    validationError.value = 'Please enter a valid amount'
    return
  }

  if (numAmount > uiBalance.value) {
    validationError.value = `Insufficient balance: ${uiBalance.value} available`
    return
  }

  try {
    const sig = await send(new Uint8Array())
    emit('transfer', sig)
  } catch {
    // Error captured in composable
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div style="margin-bottom: 8px">
      <label style="display: block; margin-bottom: 4px; font-size: 14px">Recipient</label>
      <input
        v-model="recipient"
        type="text"
        placeholder="Wallet address"
        style="width: 100%; padding: 6px 8px; box-sizing: border-box"
      />
    </div>
    <div style="margin-bottom: 8px">
      <label style="display: block; margin-bottom: 4px; font-size: 14px">
        Amount <span v-if="!balanceLoading" style="color: #666">(Balance: {{ uiBalance }})</span>
      </label>
      <input
        v-model="amount"
        type="number"
        placeholder="0.00"
        :step="Math.pow(10, -decimals)"
        min="0"
        style="width: 100%; padding: 6px 8px; box-sizing: border-box"
      />
    </div>
    <div v-if="validationError" style="color: #e74c3c; font-size: 13px; margin-bottom: 8px">{{ validationError }}</div>
    <div v-if="error" style="color: #e74c3c; font-size: 13px; margin-bottom: 8px">{{ error.message }}</div>
    <button type="submit" :disabled="pending || balanceLoading">
      {{ pending ? 'Sending...' : 'Transfer' }}
    </button>
  </form>
</template>
