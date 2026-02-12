<script setup lang="ts">
const props = defineProps<{
  title: string
  status: string
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  endTime: bigint
}>()

const totalVotes = props.forVotes + props.againstVotes + props.abstainVotes
const forPct = totalVotes > 0n ? Number((props.forVotes * 100n) / totalVotes) : 0
</script>

<template>
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;" role="article" :aria-label="`Proposal: ${title}`">
    <h3 style="margin: 0 0 8px;">{{ title }}</h3>
    <span style="padding: 2px 8px; border-radius: 4px; background: #f0f0f0; font-size: 12px;">{{ status }}</span>
    <div style="margin-top: 12px;">
      <div style="display: flex; justify-content: space-between; font-size: 14px;">
        <span>For: {{ forPct }}%</span>
        <span>Total: {{ totalVotes.toString() }}</span>
      </div>
      <div style="height: 4px; background: #eee; border-radius: 2px; margin-top: 4px;">
        <div :style="{ height: '100%', width: forPct + '%', background: '#22c55e', borderRadius: '2px' }" />
      </div>
    </div>
  </div>
</template>
