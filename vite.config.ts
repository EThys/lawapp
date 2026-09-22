import { defineConfig, type Plugin, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { scanWifiNetworks, getCurrentWifiSsid } from './server/wifi.mjs'
import { BACKEND_ORIGIN } from './config/backend-origin'

/** Spring renvoie « Invalid CORS request » si Origin = localhost alors que Host = backend. */
function backendProxy(target: string, opts?: { spaGetBypass?: boolean }): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq, req) => {
        proxyReq.removeHeader('origin')
        proxyReq.removeHeader('referer')
        console.info(`[LawApp proxy] ${req.method} ${req.url} → ${BACKEND_ORIGIN}`)
      })
      proxy.on('error', (err, req) => {
        console.error(`[LawApp proxy error] ${req.method} ${req.url}`, err.message)
      })
    },
    ...(opts?.spaGetBypass
      ? {
          bypass(req) {
            if (req.method === 'GET') return '/index.html'
          },
        }
      : {}),
  }
}

function wifiApiPlugin(): Plugin {
  return {
    name: 'lawapp-wifi-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/wifi/') && req.url !== '/api/health') {
          next()
          return
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end()
          return
        }

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Méthode non autorisée.' }))
          return
        }

        try {
          let payload: Record<string, unknown>
          if (req.url === '/api/wifi/scan') {
            payload = { ok: true, networks: await scanWifiNetworks() }
          } else if (req.url === '/api/wifi/current') {
            payload = { ok: true, ssid: await getCurrentWifiSsid() }
          } else if (req.url === '/api/health') {
            payload = { ok: true, service: 'lawapp-wifi' }
          } else {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Route introuvable.' }))
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur scan WiFi.'
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), wifiApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    /** Évite qu'un autre projet (ex. sftCaisse) occupe 5173 sans que vous le voyiez. */
    strictPort: true,
    proxy: {
      '/api': backendProxy(BACKEND_ORIGIN),
      '/auth': backendProxy(BACKEND_ORIGIN, { spaGetBypass: true }),
      '/v1': backendProxy(BACKEND_ORIGIN),
      /** document-controller OpenAPI : `/private/document`, `/protected/document` */
      '/private': backendProxy(BACKEND_ORIGIN),
      '/protected': backendProxy(BACKEND_ORIGIN),
    },
  },
  preview: {
    host: true,
    proxy: {
      '/api': backendProxy(BACKEND_ORIGIN),
      '/auth': backendProxy(BACKEND_ORIGIN, { spaGetBypass: true }),
      '/v1': backendProxy(BACKEND_ORIGIN),
      '/private': backendProxy(BACKEND_ORIGIN),
      '/protected': backendProxy(BACKEND_ORIGIN),
      '/api/wifi': 'http://localhost:3001',
      '/api/health': 'http://localhost:3001',
    },
  },
})
