import { captureNetworkFingerprint } from '@/utils/localNetwork'

export interface WifiNetwork {
  ssid: string
  signalLevel: number
  isConnected: boolean
  secured: boolean
}

type CapacitorWifiPlugin = {
  scan?: () => Promise<{ ssid: string; level?: number; secure?: boolean; connected?: boolean }[]>
  getSSID?: () => Promise<{ ssid: string }>
}

type WifiScanResponse = { ok: true; networks: WifiNetwork[] } | { ok: false; error: string }
type WifiCurrentResponse = { ok: true; ssid: string | null } | { ok: false; error: string }

async function scanWifiViaNodeApi(): Promise<WifiNetwork[] | null> {
  try {
    const res = await fetch('/api/wifi/scan')
    const data = (await res.json()) as WifiScanResponse
    if (!res.ok || !data.ok) {
      throw new Error('error' in data ? data.error : 'Scan WiFi indisponible.')
    }
    if (!data.networks.length) return null
    return data.networks
  } catch {
    return null
  }
}

async function getCurrentWifiViaNodeApi(): Promise<string | null> {
  try {
    const res = await fetch('/api/wifi/current')
    const data = (await res.json()) as WifiCurrentResponse
    if (!res.ok || !data.ok) return null
    return data.ssid?.trim() || null
  } catch {
    return null
  }
}

async function tryNativeScan(): Promise<WifiNetwork[] | null> {
  const cap = (window as unknown as { Capacitor?: { Plugins?: { Wifi?: CapacitorWifiPlugin } } }).Capacitor
  const wifi = cap?.Plugins?.Wifi
  if (!wifi?.scan) return null

  try {
    const results = await wifi.scan()
    if (!results?.length) return null
    return results
      .map((r) => ({
        ssid: r.ssid,
        signalLevel: Math.min(100, Math.max(0, r.level ?? 50)),
        isConnected: !!r.connected,
        secured: r.secure !== false,
      }))
      .filter((n) => n.ssid.trim().length > 0)
      .sort((a, b) => b.signalLevel - a.signalLevel)
  } catch {
    return null
  }
}

export async function getCurrentWifiSsid(): Promise<string | null> {
  const fromNode = await getCurrentWifiViaNodeApi()
  if (fromNode) return fromNode

  const cap = (window as unknown as { Capacitor?: { Plugins?: { Wifi?: CapacitorWifiPlugin } } }).Capacitor
  const wifi = cap?.Plugins?.Wifi
  if (wifi?.getSSID) {
    try {
      const result = await wifi.getSSID()
      return result?.ssid?.trim() || null
    } catch {
      return null
    }
  }
  return null
}

async function scanWifiWebFallback(): Promise<WifiNetwork[]> {
  const fingerprint = await captureNetworkFingerprint()
  const connectedSsid = await getCurrentWifiSsid()

  if (!fingerprint.publicIp && !fingerprint.localIpPrefix && !connectedSsid) {
    throw new Error(
      'Scan WiFi indisponible. Lancez « npm run dev » sur votre PC (service Node requis) ou utilisez l\'app mobile.'
    )
  }

  if (connectedSsid) {
    return [
      {
        ssid: connectedSsid,
        signalLevel: 100,
        isConnected: true,
        secured: true,
      },
    ]
  }

  throw new Error(
    'Impossible de lister les réseaux WiFi. Vérifiez que npm run dev tourne sur le même PC que le professeur.'
  )
}

export async function scanWifiNetworks(): Promise<WifiNetwork[]> {
  const fromNode = await scanWifiViaNodeApi()
  if (fromNode?.length) return fromNode

  const native = await tryNativeScan()
  if (native?.length) return native

  return scanWifiWebFallback()
}

export function signalBars(level: number): number {
  if (level >= 75) return 4
  if (level >= 50) return 3
  if (level >= 25) return 2
  return 1
}
