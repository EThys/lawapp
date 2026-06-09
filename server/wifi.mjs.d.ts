export interface WifiNetwork {
  ssid: string
  signalLevel: number
  isConnected: boolean
  secured: boolean
}

export function scanWifiNetworks(): Promise<WifiNetwork[]>
export function getCurrentWifiSsid(): Promise<string | null>
