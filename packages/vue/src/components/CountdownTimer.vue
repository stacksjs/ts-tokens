<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

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

const stopTimer = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

const startTimer = () => {
  stopTimer()
  remaining.value = props.targetDate.getTime() - Date.now()
  if (remaining.value <= 0) {
    emit('complete')
    return
  }
  intervalId = setInterval(() => {
    remaining.value = props.targetDate.getTime() - Date.now()
    if (remaining.value <= 0) {
      stopTimer()
      emit('complete')
    }
  }, 1000)
}

onMounted(startTimer)

// Reset the countdown whenever the target date changes so it never keeps
// counting toward a stale target.
watch(() => props.targetDate, startTimer)

onUnmounted(stopTimer)
</script>

<template>
  <span style="font-variant-numeric: tabular-nums" role="timer" aria-live="polite" :aria-label="remaining <= 0 ? 'Countdown complete, now live' : `Time remaining: ${formatTime(remaining)}`">
    {{ remaining <= 0 ? 'Live!' : formatTime(remaining) }}
  </span>
</template>
