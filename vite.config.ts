import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { scanWifiNetworks, getCurrentWifiSsid } from './server/wifi.mjs'

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
  preview: {
    proxy: {
      '/api/wifi': 'http://localhost:3001',
      '/api/health': 'http://localhost:3001',
    },
  },
})
