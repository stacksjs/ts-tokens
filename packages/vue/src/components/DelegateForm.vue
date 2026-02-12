<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ daoAddress: string }>()
const emit = defineEmits<{ delegate: [delegate: string, amount?: string] }>()

const delegate = ref('')
const amount = ref('')

const handleSubmit = () => {
  if (delegate.value) emit('delegate', delegate.value, amount.value || undefined)
}
</script>

<template>
  <form @submit.prevent="handleSubmit" aria-label="Delegate voting power">
    <div style="margin-bottom: 8px;">
      <label for="delegate-address" style="display: block; margin-bottom: 4px; font-size: 14px;">Delegate to</label>
      <input id="delegate-address" v-model="delegate" type="text" placeholder="Wallet address" required style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" />
    </div>
    <div style="margin-bottom: 8px;">
      <label for="delegate-amount" style="display: block; margin-bottom: 4px; font-size: 14px;">Amount (optional)</label>
      <input id="delegate-amount" v-model="amount" type="text" placeholder="All" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" />
    </div>
    <button type="submit" style="padding: 8px 16px; border-radius: 6px; border: none; background: #3b82f6; color: white; cursor: pointer;">Delegate</button>
  </form>
</template>
