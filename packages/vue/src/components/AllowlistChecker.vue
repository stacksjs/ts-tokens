<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWallet, useCandyMachine } from '../composables'

const props = defineProps<{
  candyMachine: string
  allowlist?: string[]
}>()

const emit = defineEmits<{
  result: [eligible: boolean]
}>()

const { publicKey } = useWallet()
const { loading } = useCandyMachine(props.candyMachine)
const eligible = ref<boolean | null>(null)

watch([publicKey, loading], () => {
  if (!publicKey.value || loading.value) {
    eligible.value = null
    return
  }

  const address = publicKey.value.toBase58()
  const isEligible = props.allowlist ? props.allowlist.includes(address) : true

  eligible.value = isEligible
  emit('result', isEligible)
}, { immediate: true })
</script>

<template>
  <div v-if="!publicKey">Connect your wallet to check eligibility</div>
  <div v-else-if="loading">Checking eligibility...</div>
  <div v-else-if="eligible === null">...</div>
  <div
    v-else
    :style="{
      padding: '8px 12px',
      borderRadius: '4px',
      background: eligible ? '#d4edda' : '#f8d7da',
      color: eligible ? '#155724' : '#721c24',
    }"
  >
    {{ eligible ? 'You are eligible to mint!' : 'Your wallet is not on the allowlist' }}
  </div>
</template>
