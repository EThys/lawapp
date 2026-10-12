import { useLocalStorage } from '@vueuse/core'
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const BODY_LOCK_CLASS = 'lawapp-drawer-open'

/** Drawer latéral mobile + état collapsed desktop (shells étudiant / enseignant / admin). */
export function useShellDrawer(collapsedStorageKey: string) {
  const route = useRoute()
  const collapsed = useLocalStorage(`${collapsedStorageKey}:collapsed`, false)
  const mobileOpen = ref(false)

  function closeMobile() {
    mobileOpen.value = false
  }

  function openMobile() {
    mobileOpen.value = true
  }

  function toggleMobile() {
    mobileOpen.value = !mobileOpen.value
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  watch(
    () => route.fullPath,
    () => closeMobile(),
  )

  watch(mobileOpen, async (open, wasOpen) => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle(BODY_LOCK_CLASS, open)
    await nextTick()
    if (open) {
      document.getElementById('shell-drawer-close')?.focus()
    } else if (wasOpen) {
      document.getElementById('shell-menu-toggle')?.focus()
    }
  })

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && mobileOpen.value) {
      e.preventDefault()
      closeMobile()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    document.body.classList.remove(BODY_LOCK_CLASS)
  })

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile,
    toggleMobile,
  }
}
