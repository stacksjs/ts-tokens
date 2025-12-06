<script setup lang="ts">
import { ref } from 'vue'
import { useCandyMachine } from '../composables'

const props = withDefaults(defineProps<{
  candyMachine: string
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  mint: []
}>()

const { candyMachine: cm, loading } = useCandyMachine(props.candyMachine)
const minting = ref(false)

async function handleMint() {
  if (props.disabled || minting.value || !cm.value || cm.value.isSoldOut)
    return
  minting.value = true
  try {
    emit('mint')
  }
  finally {
    minting.value = false
  }
}

const isDisabled = () => props.disabled || loading.value || minting.value || cm.value?.isSoldOut
function buttonText() {
  if (loading.value)
    return 'Loading...'
  if (minting.value)
    return 'Minting...'
  if (cm.value?.isSoldOut)
    return 'Sold Out'
  return 'Mint'
}
</script>

<template>
  <button :disabled="isDisabled()" @click="handleMint">
    {{ buttonText() }}
  </button>
</template>
