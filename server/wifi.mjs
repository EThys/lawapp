import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'

const execFileAsync = promisify(execFile)

/**
 * @typedef {{ ssid: string; signalLevel: number; isConnected: boolean; secured: boolean }} WifiNetwork
 */

function parseSignalPercent(raw) {
  const match = /(\d+)\s*%/.exec(raw)
  return match ? Math.min(100, parseInt(match[1], 10)) : 50
}

function parseSecurity(authentication) {
  const value = authentication.toLowerCase()
  if (!value || value.includes('open') || value.includes('ouvert')) return false
  return true
}

/** Windows: netsh wlan show networks mode=bssid */
async function scanWindows() {
  const { stdout } = await execFileAsync('netsh', ['wlan', 'show', 'networks', 'mode=bssid'], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  })

  /** @type {Map<string, WifiNetwork>} */
  const bySsid = new Map()
  let currentSsid = ''
  let currentSecure = true

  for (const line of stdout.split(/\r?\n/)) {
    const ssidMatch = /^\s*SSID\s*\d+\s*:\s*(.+)\s*$/i.exec(line)
    if (ssidMatch) {
      currentSsid = ssidMatch[1].trim()
      currentSecure = true
      continue
    }

    const authMatch = /^\s*Authentication\s*:\s*(.+)\s*$/i.exec(line)
    if (authMatch && currentSsid) {
      currentSecure = parseSecurity(authMatch[1])
      continue
    }

    const signalMatch =
      /^\s*(?:Signal|Niveau du signal)\s*:\s*(.+)\s*$/i.exec(line)
    if (signalMatch && currentSsid) {
      const signalLevel = parseSignalPercent(signalMatch[1])
      const existing = bySsid.get(currentSsid)
      if (!existing || signalLevel > existing.signalLevel) {
        bySsid.set(currentSsid, {
          ssid: currentSsid,
          signalLevel,
          isConnected: false,
          secured: currentSecure,
        })
      }
    }
  }

  return [...bySsid.values()]
}

async function getCurrentWindows() {
  const { stdout } = await execFileAsync('netsh', ['wlan', 'show', 'interfaces'], {
    encoding: 'utf8',
    windowsHide: true,
  })

  let ssid = ''
  for (const line of stdout.split(/\r?\n/)) {
    const stateMatch = /^\s*State\s*:\s*(.+)\s*$/i.exec(line)
    if (stateMatch && !/connected|connecté/i.test(stateMatch[1])) {
      ssid = ''
    }
    const ssidMatch = /^\s*SSID\s*:\s*(.+)\s*$/i.exec(line)
    if (ssidMatch) {
      const value = ssidMatch[1].trim()
      if (value) ssid = value
    }
  }
  return ssid || null
}

/** Linux: nmcli */
async function scanLinux() {
  try {
    const { stdout } = await execFileAsync(
      'nmcli',
      ['-t', '-f', 'SSID,SIGNAL,SECURITY,ACTIVE', 'dev', 'wifi', 'list'],
      { encoding: 'utf8', maxBuffer: 512 * 1024 }
    )
    /** @type {Map<string, WifiNetwork>} */
    const bySsid = new Map()
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue
      const [ssid, signal, security, active] = line.split(':')
      if (!ssid?.trim()) continue
      const name = ssid.trim()
      const signalLevel = Math.min(100, parseInt(signal || '50', 10))
      const isConnected = active === 'yes'
      const secured = security !== '--' && security !== ''
      const existing = bySsid.get(name)
      if (!existing || signalLevel > existing.signalLevel) {
        bySsid.set(name, { ssid: name, signalLevel, isConnected, secured })
      }
    }
    return [...bySsid.values()]
  } catch {
    return []
  }
}

async function getCurrentLinux() {
  try {
    const { stdout } = await execFileAsync(
      'nmcli',
      ['-t', '-f', 'ACTIVE,SSID', 'dev', 'wifi'],
      { encoding: 'utf8' }
    )
    for (const line of stdout.split('\n')) {
      const [active, ssid] = line.split(':')
      if (active === 'yes' && ssid?.trim()) return ssid.trim()
    }
  } catch {
    /* ignore */
  }
  return null
}

/** macOS: airport */
async function scanMac() {
  const airport =
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport'
  const { stdout } = await execFileAsync(airport, ['-s'], { encoding: 'utf8' })
  const lines = stdout.split('\n').slice(1)
  /** @type {WifiNetwork[]} */
  const networks = []
  for (const line of lines) {
    const match = /^\s*(.+?)\s+([0-9a-f:]{17})\s+(-?\d+)\s+(\[.+\]|\S+)/i.exec(line)
    if (!match) continue
    const ssid = match[1].trim()
    const rssi = parseInt(match[3], 10)
    const signalLevel = Math.min(100, Math.max(0, 2 * (rssi + 100)))
    networks.push({
      ssid,
      signalLevel,
      isConnected: false,
      secured: !match[4].includes('OPEN'),
    })
  }
  return networks
}

async function getCurrentMac() {
  const airport =
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport'
  try {
    const { stdout } = await execFileAsync(airport, ['-I'], { encoding: 'utf8' })
    const match = /\bSSID:\s*(.+)/i.exec(stdout)
    return match?.[1]?.trim() || null
  } catch {
    return null
  }
}

function sortNetworks(networks, connectedSsid) {
  for (const n of networks) {
    n.isConnected = connectedSsid ? n.ssid === connectedSsid : n.isConnected
  }
  return networks
    .filter((n) => n.ssid.length > 0)
    .sort((a, b) => {
      if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1
      return b.signalLevel - a.signalLevel
    })
}

/**
 * @returns {Promise<WifiNetwork[]>}
 */
export async function scanWifiNetworks() {
  const platform = os.platform()
  let networks = []

  if (platform === 'win32') {
    networks = await scanWindows()
  } else if (platform === 'linux') {
    networks = await scanLinux()
  } else if (platform === 'darwin') {
    networks = await scanMac()
  } else {
    throw new Error(`Scan WiFi non supporté sur ${platform}.`)
  }

  if (!networks.length) {
    throw new Error('Aucun réseau WiFi détecté. Vérifiez que le WiFi est activé.')
  }

  const connected = await getCurrentWifiSsid()
  return sortNetworks(networks, connected)
}

/**
 * @returns {Promise<string|null>}
 */
export async function getCurrentWifiSsid() {
  const platform = os.platform()
  if (platform === 'win32') return getCurrentWindows()
  if (platform === 'linux') return getCurrentLinux()
  if (platform === 'darwin') return getCurrentMac()
  return null
}
