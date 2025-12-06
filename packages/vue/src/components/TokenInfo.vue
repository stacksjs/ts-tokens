<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useConfig } from '../composables'

const props = defineProps<{
  mint: string
}>()

const info = ref<any>(null)
const config = useConfig()

onMounted(async () => {
  const { getMintInfo } = await import('ts-tokens')
  info.value = await getMintInfo(props.mint, config)
})
</script>

<template>
  <div v-if="!info">
    Loading...
  </div>
  <div v-else>
    <div><strong>Mint:</strong> {{ mint }}</div>
    <div><strong>Supply:</strong> {{ info.supply?.toString() }}</div>
    <div><strong>Decimals:</strong> {{ info.decimals }}</div>
    <div><strong>Mint Authority:</strong> {{ info.mintAuthority || 'None' }}</div>
    <div><strong>Freeze Authority:</strong> {{ info.freezeAuthority || 'None' }}</div>
  </div>
</template>
