import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { vReveal } from './directives/reveal'
import { seedDemoData, refreshDemoLiveData } from './data/demoSeed'
import 'vue-sonner/style.css'
import './style.css'
import '@/components/layout/dashboard.css'
import { isApiEnabled } from '@/config/features'
import { resolveApiBase, resolveAuthBase } from '@/config/api'
import { bootLoadInterruptedMessage, bootStartFailedMessage } from '@/utils/userFacingErrors'
import { redirectWwwHostToApex } from '@/utils/canonicalHost'

/** Filet de sécurité si le script inline d’index.html n’a pas tourné. */
if (redirectWwwHostToApex()) {
  // Navigation vers lawapp50.com (sans www) — ne pas monter Vue.
} else {
  bootApp()
}

function hideBootSplash() {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  splash.classList.add('boot-splash--hide')
  window.setTimeout(() => splash.remove(), 520)
}

function showBootError(message: string) {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  splash.classList.remove('boot-splash--hide')
  splash.setAttribute('aria-busy', 'false')
  const subtitle = splash.querySelector('.boot-splash__subtitle')
  if (subtitle) {
    subtitle.textContent = message
    subtitle.classList.add('text-red-700')
  }
}

async function bootstrap() {
  if (import.meta.env.DEV && isApiEnabled()) {
    window.lawappNetwork = () => {
      const rows = window.__lawappHttpLog ?? []
      console.table(rows)
      return rows
    }
    console.info(
      `[LawApp] Mode API · base ${resolveApiBase()} · auth ${resolveAuthBase() || '(same-origin /auth)'}`,
    )
    console.info(
      '[LawApp] DevTools Network : filtrez par « /api » ou « Fetch/XHR », pas « lawapp » (les URLs sont en localhost via proxy Vite). Console : lawappNetwork()',
    )
  }
  if (import.meta.env.DEV && !isApiEnabled()) {
    console.warn('[LawApp] VITE_USE_API=false — aucun appel HTTP backend (données démo locales).')
  }
  if (!isApiEnabled()) {
    await seedDemoData()
    refreshDemoLiveData()
  }

  const app = createApp(App)
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[LawApp] Erreur Vue:', err, info)
    hideBootSplash()
  }
  app.directive('reveal', vReveal)
  app.use(createPinia())
  app.use(router)
  await router.isReady()
  app.mount('#app')
  requestAnimationFrame(hideBootSplash)
}

function bootApp() {
  const bootTimeout = window.setTimeout(() => {
    if (!document.getElementById('app')?.childElementCount) {
      showBootError(bootLoadInterruptedMessage())
    }
  }, 12000)

  bootstrap()
    .catch((err) => {
      console.error('[LawApp] Échec au démarrage:', err)
      showBootError(bootStartFailedMessage())
    })
    .finally(() => window.clearTimeout(bootTimeout))
}
