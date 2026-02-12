<script setup lang="ts">
import { provide } from 'vue'
import { useDAO } from '../composables/useDAO'

const props = defineProps<{ daoAddress: string }>()
const daoState = useDAO(props.daoAddress)
provide('dao', daoState)
</script>

<template>
  <slot />
</template>
