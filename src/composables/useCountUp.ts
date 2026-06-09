import { ref, watch, onMounted } from 'vue'

export function useCountUp(target: () => number, duration = 900) {
  const display = ref(0)
  let frame = 0

  function animate(to: number) {
    cancelAnimationFrame(frame)
    const from = display.value
    const start = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      display.value = Math.round(from + (to - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
  }

  onMounted(() => animate(target()))
  watch(target, (val) => animate(val))

  return display
}
