<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConnection } from '../composables'

const props = defineProps<{
  mint: string
}>()

const info = ref<any>(null)
const loading = ref(true)
const error = ref<Error | null>(null)
const connection = useConnection()

onMounted(async () => {
  try {
    loading.value = true
    error.value = null
    const { getMintInfo } = await import('ts-tokens')
    info.value = await getMintInfo(connection, props.mint)
  } catch (err) {
    error.value = err as Error
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error" role="alert">Error loading mint: {{ error.message }}</div>
  <div v-else-if="!info">Mint not found</div>
  <div v-else>
    <div><strong>Mint:</strong> {{ mint }}</div>
    <div><strong>Supply:</strong> {{ info.supply?.toString() }}</div>
    <div><strong>Decimals:</strong> {{ info.decimals }}</div>
    <div><strong>Mint Authority:</strong> {{ info.mintAuthority || 'None' }}</div>
    <div><strong>Freeze Authority:</strong> {{ info.freezeAuthority || 'None' }}</div>
  </div>
</template>
