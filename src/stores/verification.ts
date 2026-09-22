import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateOtp, validateOtp } from '@/api/otp'
import { extractApiError } from '@/api/client'
import {
  clearPendingVerification,
  persistPendingVerification,
  readPendingVerification,
} from '@/utils/verificationSession'

function normalizeOtpError(raw: string | undefined): string {
  if (!raw) return 'Une erreur est survenue.'
  const s = raw.trim()
  if (/indentifiant invalide/i.test(s)) return 'Identifiant invalide.'
  if (/code invalide/i.test(s)) return 'Code invalide.'
  return s
}

export const useVerificationStore = defineStore('verification', () => {
  const identifier = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastInfoMessage = ref<string | null>(null)

  const maskedIdentifier = computed(() => {
    const e = identifier.value
    if (!e.includes('@')) return e
    const [user, domain] = e.split('@')
    if (!user || !domain) return e
    const u = user.length <= 2 ? `${user[0] ?? ''}•` : `${user.slice(0, 2)}•••`
    return `${u}@${domain}`
  })

  function setIdentifier(value: string) {
    identifier.value = value.trim()
    if (identifier.value) persistPendingVerification(identifier.value)
  }

  function hydrateFromRouteOrStorage(queryEmail?: string | null) {
    const q = queryEmail?.trim()
    if (q) {
      setIdentifier(q)
      return
    }
    const stored = readPendingVerification()
    if (stored) identifier.value = stored
  }

  function clearFeedback() {
    error.value = null
    lastInfoMessage.value = null
  }

  async function sendCode() {
    if (!identifier.value) {
      error.value = 'Adresse e-mail manquante.'
      throw new Error('missing-identifier')
    }
    loading.value = true
    error.value = null
    lastInfoMessage.value = null
    try {
      const res = await generateOtp(identifier.value)
      return res
    } catch (e) {
      error.value = normalizeOtpError(extractApiError(e))
      throw e
    } finally {
      loading.value = false
    }
  }

  async function confirmCode(code: string, opts?: { keepIdentifier?: boolean }) {
    if (!identifier.value) {
      error.value = 'Adresse e-mail manquante.'
      throw new Error('missing-identifier')
    }
    loading.value = true
    error.value = null
    lastInfoMessage.value = null
    try {
      const res = await validateOtp(identifier.value, code)
      if (!opts?.keepIdentifier) {
        clearPendingVerification()
        identifier.value = ''
      }
      return res
    } catch (e) {
      error.value = normalizeOtpError(extractApiError(e))
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    identifier,
    loading,
    error,
    lastInfoMessage,
    maskedIdentifier,
    setIdentifier,
    hydrateFromRouteOrStorage,
    clearFeedback,
    sendCode,
    confirmCode,
  }
})
