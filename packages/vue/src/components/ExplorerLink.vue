<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  signature?: string
  address?: string
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet'
}>(), {
  cluster: 'devnet',
})

const url = computed(() => {
  const baseUrl = 'https://explorer.solana.com'
  const clusterParam = props.cluster === 'mainnet-beta' ? '' : `?cluster=${props.cluster}`

  if (props.signature) return `${baseUrl}/tx/${props.signature}${clusterParam}`
  if (props.address) return `${baseUrl}/address/${props.address}${clusterParam}`
  return '#'
})

const label = computed(() => {
  if (props.signature) return props.signature.slice(0, 8) + '...'
  if (props.address) return props.address.slice(0, 8) + '...'
  return 'View'
})
</script>

<template>
  <a :href="url" target="_blank" rel="noopener noreferrer" style="color: #1976D2; text-decoration: none;">
    {{ label }}
  </a>
</template>
