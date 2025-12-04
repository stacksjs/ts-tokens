<script setup lang="ts">
import { useCandyMachine } from '../composables'

const props = defineProps<{
  candyMachine: string
}>()

const { candyMachine: cm, loading } = useCandyMachine(props.candyMachine)
</script>

<template>
  <span v-if="loading">...</span>
  <span v-else-if="!cm">-</span>
  <span v-else>{{ cm.itemsMinted }} / {{ cm.itemsAvailable }}</span>
</template>
