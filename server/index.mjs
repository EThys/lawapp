import http from 'node:http'
import { scanWifiNetworks, getCurrentWifiSsid } from './wifi.mjs'

const PORT = Number(process.env.LAWAPP_WIFI_PORT || 3001)

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Méthode non autorisée.' })
    return
  }

  try {
    if (req.url === '/api/wifi/scan') {
      const networks = await scanWifiNetworks()
      sendJson(res, 200, { ok: true, networks })
      return
    }

    if (req.url === '/api/wifi/current') {
      const ssid = await getCurrentWifiSsid()
      sendJson(res, 200, { ok: true, ssid })
      return
    }

    if (req.url === '/api/health') {
      sendJson(res, 200, { ok: true, service: 'lawapp-wifi' })
      return
    }

    sendJson(res, 404, { ok: false, error: 'Route introuvable.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur scan WiFi.'
    sendJson(res, 500, { ok: false, error: message })
  }
})

server.listen(PORT, () => {
  console.log(`[lawapp-wifi] http://localhost:${PORT}`)
  console.log('[lawapp-wifi] GET /api/wifi/scan · GET /api/wifi/current')
})
