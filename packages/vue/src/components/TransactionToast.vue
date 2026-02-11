<script setup lang="ts">
const props = defineProps<{
  signature: string
  status: 'pending' | 'confirmed' | 'error'
  message?: string
  explorerUrl?: string
}>()

const statusColors = { pending: '#FFA500', confirmed: '#4CAF50', error: '#F44336' }
const statusText = { pending: 'Pending...', confirmed: 'Confirmed!', error: 'Failed' }
</script>

<template>
  <div style="padding: 12px; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" role="alert" aria-live="assertive">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span :style="{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[status] }" aria-hidden="true" />
      <span>{{ message || statusText[status] }}</span>
    </div>
    <a v-if="explorerUrl" :href="explorerUrl" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #666;">
      View on Explorer
    </a>
  </div>
</template>
