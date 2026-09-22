import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir des lettres et des chiffres.'
  }
  return null
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function formatUserName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

/** Retire les 0 de tête (indicatif national / trunk). */
export function stripLeadingTrunkZero(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '')
}

/** Chiffres locaux RDC : retire 243/0 en tête si l'utilisateur les a collés. */
export function normalizeCdLocalDigits(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('243')) d = d.slice(3)
  d = d.replace(/^0+/, '')
  return d
}

/**
 * Convertit un numéro national ou international en E.164.
 * Ex. `0854434602` / `854434602` + CD → `+243854434602`
 */
export function toE164Phone(raw: string, defaultCountry: CountryCode | string = 'CD'): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const iso = (defaultCountry || 'CD').toString().toUpperCase() as CountryCode

  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed)
    if (parsed) return parsed.format('E.164')
    const digits = stripLeadingTrunkZero(trimmed)
    return digits ? `+${digits}` : null
  }

  const national = stripLeadingTrunkZero(trimmed)
  if (!national) return null

  const parsed = parsePhoneNumberFromString(national, iso)
  if (parsed) return parsed.format('E.164')

  if (iso === 'CD') return `+243${national}`
  return null
}

export function fullCdE164Phone(localRaw: string): string {
  return toE164Phone(localRaw, 'CD') || `+243${normalizeCdLocalDigits(localRaw)}`
}

/** Valide un mobile (E.164 ou national). RDC : 9 chiffres, commence par 8 ou 9. */
export function validateCdPhone(localRaw: string, defaultCountry: CountryCode | string = 'CD'): string | null {
  const trimmed = localRaw.trim()
  if (!trimmed) return 'Le numéro de téléphone est requis.'

  const iso = (defaultCountry || 'CD').toString().toUpperCase() as CountryCode
  const e164 = toE164Phone(trimmed, iso)
  const parsed = e164 ? parsePhoneNumberFromString(e164) : undefined

  if (parsed?.isValid()) return null

  if (iso === 'CD' || e164?.startsWith('+243')) {
    const digits = normalizeCdLocalDigits(e164 || trimmed)
    if (!digits) return 'Le numéro de téléphone est requis.'
    if (digits.length !== 9) return 'Saisissez 9 chiffres (numéro mobile RDC).'
    if (!/^[89]/.test(digits)) return 'Le numéro doit commencer par 8 ou 9 (mobile RDC).'
    return null
  }

  if (e164 && /^\+[1-9]\d{7,14}$/.test(e164)) return null
  return 'Numéro de téléphone invalide.'
}

/** Pour l’API : toujours E.164 (`+243854434602`). */
export function phoneForApi(raw: string, defaultCountry: CountryCode | string = 'CD'): string {
  return toE164Phone(raw, defaultCountry) || fullCdE164Phone(raw)
}
