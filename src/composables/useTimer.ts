import { ref, computed, onUnmounted } from 'vue'
import { formatDuration } from '@/utils/helpers'

export function useTimer(expiresAt: string, startedAt: string, onExpire: () => void) {
  const now = ref(Date.now())
  let interval: ReturnType<typeof setInterval> | null = null

  const expiresAtMs = new Date(expiresAt).getTime()
  const startedAtMs = new Date(startedAt).getTime()
  const totalMs = Math.max(expiresAtMs - startedAtMs, 1)

  const remainingSeconds = computed(() => {
    return Math.max(0, Math.floor((expiresAtMs - now.value) / 1000))
  })

  const formattedTime = computed(() => formatDuration(remainingSeconds.value))

  const isExpired = computed(() => remainingSeconds.value <= 0)

  const progress = computed(() => {
    const remaining = Math.max(0, expiresAtMs - now.value)
    return Math.min(100, Math.max(0, (remaining / totalMs) * 100))
  })

  const urgency = computed(() => {
    if (remainingSeconds.value <= 60) return 'critical'
    if (remainingSeconds.value <= 300) return 'warning'
    return 'normal'
  })

  function start() {
    interval = setInterval(() => {
      now.value = Date.now()
      if (isExpired.value) {
        stop()
        onExpire()
      }
    }, 1000)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  onUnmounted(stop)

  return {
    remainingSeconds,
    formattedTime,
    isExpired,
    progress,
    urgency,
    start,
    stop,
  }
}
