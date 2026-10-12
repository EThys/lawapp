import { generateCode } from '@/utils/helpers'

/** Token mock local — remplacé par JWT signé côté API. */
export function buildPresenceToken(
  sessionId: string,
  slotIndex: number,
  slotExpiresAtMs: number,
  sessionSecret: string,
): string {
  const payload = `${sessionId}:${slotIndex}:${slotExpiresAtMs}:${sessionSecret}`
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function parsePresenceToken(token: string): {
  sessionId: string
  slotIndex: number
  slotExpiresAtMs: number
  sessionSecret: string
} | null {
  try {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/')
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const raw = atob(normalized + pad)
    const parts = raw.split(':')
    if (parts.length !== 4) return null
    const slotExpiresAtMs = Number(parts[2])
    if (!Number.isFinite(slotExpiresAtMs)) return null
    return {
      sessionId: parts[0]!,
      slotIndex: Number(parts[1]),
      slotExpiresAtMs,
      sessionSecret: parts[3]!,
    }
  } catch {
    return null
  }
}

export function numericCodeForSlot(sessionSecret: string, slotIndex: number): string {
  let hash = 0
  const s = `${sessionSecret}:${slotIndex}`
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  }
  return String(100000 + (hash % 900000))
}

export function getPresenceCheckInUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/presence/check-in?token=${encodeURIComponent(token)}`
}

export function newSessionSecret(): string {
  return generateCode(12)
}
