<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useConnection } from '../composables'

const props = withDefaults(defineProps<{
  address: string
  showSymbol?: boolean
}>(), {
  showSymbol: true,
})

const balance = ref<number>(0)
const connection = useConnection()

onMounted(async () => {
  const { PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
  const pubkey = new PublicKey(props.address)
  const lamports = await connection.getBalance(pubkey)
  balance.value = lamports / LAMPORTS_PER_SOL
})
</script>

<template>
  <span>{{ balance.toFixed(4) }} <template v-if="showSymbol">SOL</template></span>
</template>
