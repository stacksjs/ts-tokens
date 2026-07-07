<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  mint: string
  disabled?: boolean
  /**
   * Caller-supplied handler that performs the real burn transaction and
   * resolves with its signature. Required — this component does not build or
   * send transactions itself.
   */
  onBurn: (mint: string) => Promise<string>
}>()

const emit = defineEmits<{
  burn: [signature: string]
}>()

const pending = ref(false)
const error = ref<Error | null>(null)
const showConfirm = ref(false)

const handleBurn = async () => {
  error.value = null
  pending.value = true
  try {
    const sig = await props.onBurn(props.mint)
    emit('burn', sig)
    showConfirm.value = false
  } catch (err) {
    error.value = err as Error
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button v-if="!showConfirm" @click="showConfirm = true" :disabled="disabled || pending" style="color: #e74c3c">
    Burn NFT
  </button>
  <div v-else>
    <p style="margin: 0 0 8px; font-size: 14px">
      Are you sure you want to burn this NFT? This action cannot be undone.
    </p>
    <button
      @click="handleBurn"
      :disabled="pending"
      style="color: #fff; background: #e74c3c; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px"
    >
      {{ pending ? 'Burning...' : 'Confirm Burn' }}
    </button>
    <button @click="showConfirm = false" style="padding: 6px 12px">Cancel</button>
    <div v-if="error" style="color: #e74c3c; font-size: 13px; margin-top: 4px">{{ error.message }}</div>
  </div>
</template>
