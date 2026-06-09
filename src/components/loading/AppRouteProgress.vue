<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

const { routeLoading, routeProgress } = storeToRefs(useUiStore())
</script>

<template>
  <div
    class="route-progress"
    :class="{ 'route-progress--active': routeLoading }"
    aria-hidden="true"
  >
    <div
      class="route-progress__bar"
      :style="{ transform: `scaleX(${routeProgress / 100})` }"
    />
  </div>
</template>
