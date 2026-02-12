<script setup lang="ts">
const props = defineProps<{
  address: string
  title: string
  description: string
  status: string
  proposer: string
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  startTime: bigint
  endTime: bigint
}>()

const totalVotes = props.forVotes + props.againstVotes + props.abstainVotes
</script>

<template>
  <div style="padding: 16px;" role="article" :aria-label="`Proposal details: ${title}`">
    <h2 style="margin: 0 0 4px;">{{ title }}</h2>
    <span style="padding: 2px 8px; border-radius: 4px; background: #f0f0f0; font-size: 12px;">{{ status }}</span>
    <p style="color: #666; font-size: 12px; margin-top: 8px;">Proposed by: {{ proposer.slice(0, 8) }}...</p>
    <p style="margin-top: 12px;">{{ description }}</p>
    <div style="margin-top: 16px;">
      <h4 style="margin: 0 0 8px;">Votes</h4>
      <div style="font-size: 14px;">
        <div>For: {{ forVotes.toString() }}</div>
        <div>Against: {{ againstVotes.toString() }}</div>
        <div>Abstain: {{ abstainVotes.toString() }}</div>
        <div style="margin-top: 4px; font-weight: bold;">Total: {{ totalVotes.toString() }}</div>
      </div>
    </div>
  </div>
</template>
