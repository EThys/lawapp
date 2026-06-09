import { ref, computed, onUnmounted } from 'vue'
import type { AntiCheatConfig, Violation, ViolationType } from '@/types'

export interface AntiCheatCallbacks {
  onViolation: (violation: Violation) => void
  onFail: (reason: string) => void
  onWarning: (message: string) => void
}

export function useAntiCheat(config: AntiCheatConfig, callbacks: AntiCheatCallbacks) {
  const violationCount = ref(0)
  const isFullscreen = ref(false)
  const isActive = ref(false)
  const warnings = ref<string[]>([])
  const fullscreenSupported = typeof document.documentElement.requestFullscreen === 'function'

  const isCritical = computed(() => violationCount.value >= config.maxViolations)

  function recordViolation(type: ViolationType, message: string) {
    violationCount.value++
    const violation: Violation = {
      type,
      timestamp: new Date().toISOString(),
      message,
    }
    callbacks.onViolation(violation)

    if (config.failOnTabSwitch && type === 'tab_switch') {
      callbacks.onFail('Changement d\'onglet détecté. Évaluation terminée.')
      return
    }

    if (config.failOnWindowBlur && type === 'window_blur') {
      callbacks.onFail('Fenêtre perdue. Évaluation terminée.')
      return
    }

    if (config.requireFullscreen && fullscreenSupported && type === 'fullscreen_exit') {
      callbacks.onFail('Mode plein écran quitté. Évaluation terminée.')
      return
    }

    if (violationCount.value >= config.maxViolations) {
      callbacks.onFail(`Nombre maximum de violations atteint (${config.maxViolations}).`)
      return
    }

    callbacks.onWarning(message)
    warnings.value.push(message)
  }

  function handleVisibilityChange() {
    if (!isActive.value) return
    if (document.hidden) {
      recordViolation('tab_switch', 'Vous avez quitté l\'onglet de l\'évaluation.')
    }
  }

  function handleBlur() {
    if (!isActive.value) return
    if (document.hidden) return
    recordViolation('window_blur', 'La fenêtre a perdu le focus.')
  }

  function handleCopy(e: ClipboardEvent) {
    if (!isActive.value || !config.blockCopyPaste) return
    e.preventDefault()
    recordViolation('copy_attempt', 'Tentative de copie bloquée.')
  }

  function handlePaste(e: ClipboardEvent) {
    if (!isActive.value || !config.blockCopyPaste) return
    e.preventDefault()
    recordViolation('paste_attempt', 'Tentative de collage bloquée.')
  }

  function handleContextMenu(e: MouseEvent) {
    if (!isActive.value || !config.blockContextMenu) return
    e.preventDefault()
    recordViolation('context_menu', 'Menu contextuel bloqué.')
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isActive.value) return

    const blocked = [
      (e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p', 'u', 's'].includes(e.key.toLowerCase()),
      e.key === 'F12',
      (e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()),
      e.altKey && e.key === 'Tab',
    ]

    if (blocked.some(Boolean)) {
      e.preventDefault()
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey)) {
        recordViolation('devtools', 'Raccourci développeur bloqué.')
      } else if (config.blockCopyPaste) {
        recordViolation('copy_attempt', 'Raccourci clavier bloqué.')
      }
    }
  }

  function handleFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
    if (
      isActive.value &&
      config.requireFullscreen &&
      fullscreenSupported &&
      !document.fullscreenElement
    ) {
      recordViolation('fullscreen_exit', 'Mode plein écran quitté.')
    }
  }

  let devToolsInterval: ReturnType<typeof setInterval> | null = null

  function startDevToolsDetection() {
    if (!config.detectDevTools) return
    const threshold = 160
    devToolsInterval = setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold
      const heightDiff = window.outerHeight - window.innerHeight > threshold
      if (widthDiff || heightDiff) {
        recordViolation('devtools', 'Outils de développement détectés.')
      }
    }, 1000)
  }

  function stopDevToolsDetection() {
    if (devToolsInterval) {
      clearInterval(devToolsInterval)
      devToolsInterval = null
    }
  }

  async function enterFullscreen() {
    if (!fullscreenSupported) {
      callbacks.onWarning('Plein écran non disponible sur cet appareil. Restez dans cet onglet.')
      return
    }
    try {
      await document.documentElement.requestFullscreen()
      isFullscreen.value = true
    } catch {
      callbacks.onWarning('Impossible d\'activer le plein écran. Restez dans cet onglet.')
    }
  }

  function start() {
    isActive.value = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    startDevToolsDetection()

    if (config.requireFullscreen && fullscreenSupported) {
      enterFullscreen()
    }
  }

  function stop() {
    isActive.value = false
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('blur', handleBlur)
    document.removeEventListener('copy', handleCopy)
    document.removeEventListener('paste', handlePaste)
    document.removeEventListener('contextmenu', handleContextMenu)
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    stopDevToolsDetection()

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  onUnmounted(stop)

  return {
    violationCount,
    isFullscreen,
    isActive,
    warnings,
    isCritical,
    start,
    stop,
    enterFullscreen,
    fullscreenSupported,
  }
}
