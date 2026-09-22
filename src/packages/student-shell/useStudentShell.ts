import { useLocalStorage } from '@vueuse/core'
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { STUDENT_SIDEBAR_STORAGE_KEY } from './nav'

export function useStudentShell() {
  const route = useRoute()
  const collapsed = useLocalStorage(`${STUDENT_SIDEBAR_STORAGE_KEY}:collapsed`, false)
  const mobileOpen = ref(false)

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function openMobile() {
    mobileOpen.value = true
  }

  function closeMobile() {
    mobileOpen.value = false
  }

  function toggleMobile() {
    mobileOpen.value = !mobileOpen.value
  }

  watch(
    () => route.fullPath,
    () => closeMobile(),
  )

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeMobile()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile,
    toggleMobile,
  }
}
