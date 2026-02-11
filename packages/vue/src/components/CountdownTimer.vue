<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  targetDate: Date
}>()

const emit = defineEmits<{
  complete: []
}>()

const remaining = ref(props.targetDate.getTime() - Date.now())
let intervalId: ReturnType<typeof setInterval> | null = null

const pad = (n: number) => n.toString().padStart(2, '0')

const formatTime = (ms: number): string => {
  if (ms <= 0) return '00:00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

onMounted(() => {
  intervalId = setInterval(() => {
    remaining.value = props.targetDate.getTime() - Date.now()
    if (remaining.value <= 0) {
      if (intervalId) clearInterval(intervalId)
      emit('complete')
    }
  }, 1000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <span style="font-variant-numeric: tabular-nums">
    {{ remaining <= 0 ? 'Live!' : formatTime(remaining) }}
  </span>
</template>
