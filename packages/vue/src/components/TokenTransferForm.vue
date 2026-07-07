<script setup lang="ts">
import { ref } from 'vue'
import { useTokenBalance } from '../composables'

const props = defineProps<{
  mint: string
  owner: string
  /**
   * Caller-supplied handler that performs the real transfer transaction and
   * resolves with its signature. Required — this component does not build or
   * send transactions itself.
   */
  onTransfer: (params: { mint: string, recipient: string, amount: number }) => Promise<string>
}>()

const emit = defineEmits<{
  transfer: [signature: string]
}>()

const { uiBalance, decimals, loading: balanceLoading } = useTokenBalance(props.mint, props.owner)
const pending = ref(false)
const error = ref<Error | null>(null)
const recipient = ref('')
const amount = ref('')
const validationError = ref<string | null>(null)

const handleSubmit = async () => {
  validationError.value = null
  error.value = null

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

  pending.value = true
  try {
    const sig = await props.onTransfer({
      mint: props.mint,
      recipient: recipient.value.trim(),
      amount: numAmount,
    })
    emit('transfer', sig)
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
