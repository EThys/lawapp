import { ref, computed, onUnmounted, type MaybeRefOrGetter, toValue } from 'vue'
import type { AntiCheatConfig, Violation, ViolationType } from '@/types'

export interface AntiCheatCallbacks {
  onViolation: (violation: Violation) => void
  onFail: (reason: string) => void
  onWarning: (message: string) => void
}

export interface AntiCheatOptions {
  /**
   * Si true : quitter l’onglet / perdre le focus / sortir du plein écran
   * est autorisé (ex. dépôt de document). Aucun échec pour ces événements.
   */
  allowScreenLeave?: MaybeRefOrGetter<boolean>
}

/** En `npm run dev` : inspecteur (F12 / Network) autorisé pour les tests. */
const DEV_ALLOW_INSPECTOR = import.meta.env.DEV

export function isFullscreenSupported(): boolean {
  return typeof document.documentElement.requestFullscreen === 'function'
}

/** Plein écran navigateur (à appeler depuis un clic utilisateur si possible). */
export async function requestExamFullscreen(): Promise<boolean> {
  if (!isFullscreenSupported()) return false
  if (document.fullscreenElement) return true
  try {
    await document.documentElement.requestFullscreen()
    return !!document.fullscreenElement
  } catch {
    return false
  }
}

export function useAntiCheat(
  config: AntiCheatConfig,
  callbacks: AntiCheatCallbacks,
  options: AntiCheatOptions = {},
) {
  const violationCount = ref(0)
  const isFullscreen = ref(false)
  const isActive = ref(false)
  const warnings = ref<string[]>([])
  const fullscreenSupported = isFullscreenSupported()

  const isCritical = computed(() => violationCount.value >= config.maxViolations)

  function screenLeaveAllowed(): boolean {
    return !!toValue(options.allowScreenLeave) || DEV_ALLOW_INSPECTOR
  }

  function recordViolation(type: ViolationType, message: string) {
    const leaveTypes: ViolationType[] = ['tab_switch', 'window_blur', 'fullscreen_exit']
    if (leaveTypes.includes(type) && screenLeaveAllowed()) {
      return
    }

    // En dev : jamais d’échec / compteur pour « outils développeur ».
    if (type === 'devtools' && DEV_ALLOW_INSPECTOR) {
      return
    }

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
    if (!isActive.value || !config.failOnTabSwitch) return
    if (document.hidden) {
      recordViolation('tab_switch', 'Vous avez quitté l\'onglet de l\'évaluation.')
    }
  }

  function handleBlur() {
    if (!isActive.value || !config.failOnWindowBlur) return
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
    // Clic droit utile dans l’inspecteur en mode test.
    if (DEV_ALLOW_INSPECTOR) return
    e.preventDefault()
    recordViolation('context_menu', 'Menu contextuel bloqué.')
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isActive.value) return

    const isDevtoolsShortcut =
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))

    // Tests locaux : F12 / Ctrl+Shift+I autorisés pour voir Network.
    if (isDevtoolsShortcut && DEV_ALLOW_INSPECTOR) {
      return
    }

    const blocked = [
      (e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p', 'u', 's'].includes(e.key.toLowerCase()),
      isDevtoolsShortcut,
      e.altKey && e.key === 'Tab',
    ]

    // Alt+Tab autorisé si dépôt document (ou mode test).
    if (e.altKey && e.key === 'Tab' && screenLeaveAllowed()) {
      return
    }

    if (blocked.some(Boolean)) {
      e.preventDefault()
      if (isDevtoolsShortcut) {
        recordViolation('devtools', 'Raccourci développeur bloqué.')
      } else if (config.blockCopyPaste) {
        recordViolation('copy_attempt', 'Raccourci clavier bloqué.')
      }
    }
  }

  function handleFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
    if (
      !isActive.value ||
      !config.requireFullscreen ||
      !fullscreenSupported ||
      document.fullscreenElement
    ) {
      return
    }
    if (screenLeaveAllowed()) {
      return
    }
    void enterFullscreen().then((entered) => {
      if (!entered && document.fullscreenElement == null) {
        recordViolation('fullscreen_exit', 'Mode plein écran quitté.')
      }
    })
  }

  async function enterFullscreen(): Promise<boolean> {
    if (!fullscreenSupported) {
      if (config.requireFullscreen) {
        callbacks.onWarning('Plein écran non disponible sur cet appareil.')
      }
      return false
    }
    try {
      await document.documentElement.requestFullscreen()
      isFullscreen.value = !!document.fullscreenElement
      return !!document.fullscreenElement
    } catch {
      if (config.requireFullscreen) {
        callbacks.onWarning('Activez le plein écran pour continuer l’épreuve.')
      }
      return false
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

    if (config.requireFullscreen && fullscreenSupported) {
      void enterFullscreen()
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
