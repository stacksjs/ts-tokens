<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  proposalAddress: string
  voteType: 'for' | 'against' | 'abstain'
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{ vote: [voteType: string] }>()
const submitting = ref(false)

const colors = { for: '#22c55e', against: '#ef4444', abstain: '#6b7280' }
const labels = { for: 'Vote For', against: 'Vote Against', abstain: 'Abstain' }

const handleClick = async () => {
  submitting.value = true
  try { emit('vote', props.voteType) } finally { submitting.value = false }
}
</script>

<template>
  <button
    :style="{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: colors[voteType], color: 'white', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }"
    :disabled="disabled || submitting"
    :aria-label="`${labels[voteType]} on proposal`"
    @click="handleClick"
  >
    {{ submitting ? 'Submitting...' : labels[voteType] }}
  </button>
</template>
