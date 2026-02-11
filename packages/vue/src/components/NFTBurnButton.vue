<script setup lang="ts">
import { ref } from 'vue'
import { useTransaction } from '../composables'

defineProps<{
  mint: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  burn: [signature: string]
}>()

const { pending, error, send, reset } = useTransaction()
const showConfirm = ref(false)

const handleBurn = async () => {
  reset()
  try {
    const sig = await send(new Uint8Array())
    emit('burn', sig)
    showConfirm.value = false
  } catch {
    // Error captured in composable
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
