import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { vReveal } from './directives/reveal'
import { seedDemoData, refreshDemoLiveData } from './data/demoSeed'
import './style.css'

function hideBootSplash() {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  splash.classList.add('boot-splash--hide')
  window.setTimeout(() => splash.remove(), 520)
}

async function bootstrap() {
  await seedDemoData()
  refreshDemoLiveData()

  const app = createApp(App)
  app.directive('reveal', vReveal)
  app.use(createPinia())
  app.use(router)
  await router.isReady()
  app.mount('#app')
  requestAnimationFrame(hideBootSplash)
}

bootstrap()
