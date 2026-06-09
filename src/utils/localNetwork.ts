export interface NetworkFingerprint {
  publicIp: string
  /** Ex. 192.168.1 pour le sous-réseau local */
  localIpPrefix: string | null
}

export async function captureNetworkFingerprint(): Promise<NetworkFingerprint> {
  let publicIp = ''
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = (await res.json()) as { ip: string }
    publicIp = data.ip
  } catch {
    publicIp = ''
  }

  const localIp = await detectLocalIp()
  const localIpPrefix = localIp ? localIp.split('.').slice(0, 3).join('.') : null

  return { publicIp, localIpPrefix }
}

function detectLocalIp(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof RTCPeerConnection === 'undefined') {
      resolve(null)
      return
    }

    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('lawapp')
    pc.onicecandidate = (event) => {
      if (!event.candidate?.candidate) return
      const match = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(event.candidate.candidate)
      const ip = match?.[1]
      if (ip && !ip.startsWith('127.')) {
        pc.close()
        resolve(ip)
      }
    }
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => resolve(null))

    setTimeout(() => {
      pc.close()
      resolve(null)
    }, 3000)
  })
}

export function fingerprintsMatch(
  required: NetworkFingerprint,
  current: NetworkFingerprint
): boolean {
  if (!required.publicIp || !current.publicIp) return false
  if (required.publicIp !== current.publicIp) return false
  if (
    required.localIpPrefix &&
    current.localIpPrefix &&
    required.localIpPrefix !== current.localIpPrefix
  ) {
    return false
  }
  return true
}

export function verifyLocalNetwork(
  required: NetworkFingerprint,
  current: NetworkFingerprint,
  requiredWifiLabel?: string,
  currentWifiSsid?: string | null
): { ok: true } | { ok: false; error: string } {
  if (
    requiredWifiLabel &&
    currentWifiSsid &&
    requiredWifiLabel.trim().toLowerCase() !== currentWifiSsid.trim().toLowerCase()
  ) {
    return {
      ok: false,
      error: `Connectez-vous au WiFi « ${requiredWifiLabel} » (réseau actuel : « ${currentWifiSsid} »).`,
    }
  }

  if (!fingerprintsMatch(required, current)) {
    return {
      ok: false,
      error: requiredWifiLabel
        ? `Vous n'êtes pas sur le réseau local « ${requiredWifiLabel} ». Connectez-vous au WiFi de la salle (app mobile ou même réseau que l'enseignant).`
        : 'Vous n\'êtes pas sur le réseau local de la salle. Un absent à distance ne peut pas pointer sa présence.',
    }
  }
  return { ok: true }
}

export function getPresenceShareUrl(shareCode: string): string {
  return `${window.location.origin}/join/presence/${shareCode}`
}
