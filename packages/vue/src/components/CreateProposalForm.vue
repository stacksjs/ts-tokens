<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ daoAddress: string }>()
const emit = defineEmits<{ submit: [title: string, description: string] }>()

const title = ref('')
const description = ref('')

const handleSubmit = () => {
  if (title.value) emit('submit', title.value, description.value)
}
</script>

<template>
  <form @submit.prevent="handleSubmit" aria-label="Create proposal">
    <div style="margin-bottom: 8px;">
      <label for="proposal-title" style="display: block; margin-bottom: 4px; font-size: 14px;">Title</label>
      <input id="proposal-title" v-model="title" type="text" required maxlength="100" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" />
    </div>
    <div style="margin-bottom: 8px;">
      <label for="proposal-description" style="display: block; margin-bottom: 4px; font-size: 14px;">Description</label>
      <textarea id="proposal-description" v-model="description" rows="4" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" />
    </div>
    <button type="submit" style="padding: 8px 16px; border-radius: 6px; border: none; background: #3b82f6; color: white; cursor: pointer;">Create Proposal</button>
  </form>
</template>
