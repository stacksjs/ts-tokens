<script setup lang="ts">
import { computed } from 'vue'
import { useCandyMachine } from '../composables'

const props = defineProps<{
  candyMachine: string
}>()

const { candyMachine: cm, loading } = useCandyMachine(props.candyMachine)

const progress = computed(() => {
  if (!cm.value) return 0
  return (cm.value.itemsMinted / cm.value.itemsAvailable) * 100
})
</script>

<template>
  <div v-if="!loading && cm" style="background: #eee; border-radius: 4px; overflow: hidden;">
    <div :style="{ width: `${progress}%`, height: '8px', background: '#4CAF50', transition: 'width 0.3s' }" />
  </div>
</template>
