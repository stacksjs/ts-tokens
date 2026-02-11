<script setup lang="ts">
import { provide } from 'vue'
import { useCandyMachine } from '../composables'

const props = defineProps<{
  candyMachine: string
}>()

const state = useCandyMachine(props.candyMachine)

provide('candy-machine', state)
</script>

<template>
  <slot
    :candy-machine="state.candyMachine.value"
    :loading="state.loading.value"
    :error="state.error.value"
    :refetch="state.refetch"
  />
</template>
