import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const routeLoading = ref(false)
  const routeProgress = ref(0)

  let showTimer: ReturnType<typeof setTimeout> | null = null
  let progressTimer: ReturnType<typeof setInterval> | null = null

  function startRouteLoading() {
    routeProgress.value = 0
    if (progressTimer) clearInterval(progressTimer)
    progressTimer = setInterval(() => {
      if (routeProgress.value < 88) {
        routeProgress.value += Math.random() * 12
      }
    }, 180)

    if (showTimer) clearTimeout(showTimer)
    showTimer = setTimeout(() => {
      routeLoading.value = true
    }, 60)
  }

  function finishRouteLoading() {
    if (showTimer) {
      clearTimeout(showTimer)
      showTimer = null
    }
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
    routeProgress.value = 100
    setTimeout(() => {
      routeLoading.value = false
      routeProgress.value = 0
    }, 280)
  }

  return {
    routeLoading,
    routeProgress,
    startRouteLoading,
    finishRouteLoading,
  }
})
