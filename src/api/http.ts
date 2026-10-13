import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/config/features'
import { apiPath, authPath, v1Path, rootPath } from '@/config/api'
import { networkUnreachableMessage } from '@/utils/userFacingErrors'

export interface HttpError extends Error {
  status?: number
  data?: unknown
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuth?: boolean
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export type LawAppHttpLogEntry = {
  at: string
  method: string
  url: string
  status?: number
}

declare global {
  interface Window {
    /** Dernières requêtes fetch LawApp (dev) — tapez `lawappNetwork()` dans la console. */
    __lawappHttpLog?: LawAppHttpLogEntry[]
    lawappNetwork?: () => LawAppHttpLogEntry[]
  }
}

function pushHttpLog(entry: LawAppHttpLogEntry) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return
  const log = window.__lawappHttpLog ?? []
  log.push(entry)
  if (log.length > 80) log.shift()
  window.__lawappHttpLog = log
}

function logRequest(method: string, url: string) {
  if (import.meta.env.DEV) {
    pushHttpLog({ at: new Date().toISOString(), method, url })
    console.info(`[LawApp HTTP] ${method} ${url}`)
  }
}

function logResponse(method: string, url: string, status: number, data?: unknown) {
  if (import.meta.env.DEV) {
    const log = window.__lawappHttpLog
    const last = log?.[log.length - 1]
    if (last && last.method === method && last.url === url && last.status == null) {
      last.status = status
    } else {
      pushHttpLog({ at: new Date().toISOString(), method, url, status })
    }
    if (status >= 400) {
      console.warn(`[LawApp HTTP] ${status} ${method} ${url}`, data)
    } else {
      console.info(`[LawApp HTTP] ${status} ${method} ${url}`)
    }
  }
}

function buildHeaders(options: FetchOptions): Headers {
  const headers = new Headers(options.headers)
  if (import.meta.env.DEV) {
    headers.set('X-LawApp-Client', '1')
  }
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!options.skipAuth) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refresh) return false
  try {
    const url = apiPath('protected/token/refresh')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    const data = (await parseBody(res)) as {
      accessToken?: string
      refreshToken?: string
      token?: string
    } | null
    if (!res.ok || !data) return false
    const accessToken = data.accessToken ?? data.token
    if (!accessToken) return false
    localStorage.setItem(TOKEN_KEY, accessToken)
    if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    return true
  } catch {
    return false
  }
}

export async function httpFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const { body, skipAuth, headers: _h, ...rest } = options

  const run = async (retry: boolean): Promise<T> => {
    logRequest(method, url)
    const res = await fetch(url, {
      ...rest,
      method,
      headers: buildHeaders(options),
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const data = await parseBody(res)
    logResponse(method, url, res.status, data)

    if (res.status === 401 && !skipAuth && !retry) {
      const refreshed = await tryRefreshToken()
      if (refreshed) return run(true)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem('lawapp_user')
    }

    if (!res.ok) {
      const err = new Error('HTTP error') as HttpError
      err.status = res.status
      err.data = data
      throw err
    }

    return data as T
  }

  return run(false)
}

export function extractApiError(e: unknown): string {
  const err = e as HttpError & {
    response?: { data?: { message?: string; error?: string }; status?: number }
    message?: string
  }
  const data = (err.data ?? err.response?.data) as
    | { message?: string; error?: string; errors?: string[] | Record<string, string> }
    | undefined
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.join(' ')
  }
  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const msgs = Object.values(data.errors).filter(Boolean)
    if (msgs.length) return msgs.join(' ')
  }
  const raw = data?.message ?? data?.error ?? err.message
  const networkFail =
    !raw ||
    raw === 'HTTP error' ||
    /failed to fetch/i.test(raw) ||
    /networkerror/i.test(raw) ||
    /load failed/i.test(raw) ||
    /network request failed/i.test(raw)

  if (networkFail) {
    if (err.status === 400) return 'Requête invalide (400). Vérifiez les champs du formulaire.'
    if (err.status === 401) return 'Session expirée ou non autorisée. Reconnectez-vous.'
    if (err.status === 403) return 'Accès refusé.'
    if (err.status === 404) return 'Ressource introuvable sur le serveur.'
    if (err.status === 409) return 'Ce compte existe déjà.'
    if (err.status && err.status >= 500) return 'Le serveur est temporairement indisponible. Réessayez.'
    return 'Connexion au serveur impossible. Vérifiez votre réseau et que LawApp tourne bien (npm run dev).'
  }
  if (/internal server error/i.test(raw) || (err.status && err.status >= 500 && /HTTP error/i.test(raw))) {
    return 'Le serveur a rencontré une erreur. Réessayez, ou continuez sans créer cette entrée au catalogue.'
  }
  if (/invalid credentials/i.test(raw)) return 'Identifiant ou mot de passe incorrect.'
  if (/invalid or missing jwt/i.test(raw)) return 'Session expirée. Reconnectez-vous.'
  if (/numero n.?est pas valide/i.test(raw)) return 'Numéro de téléphone invalide (9 chiffres, ex. 812345678).'
  if (/bad request/i.test(raw)) {
    return 'Publication refusée (400). Vérifiez dates, questions et bonne réponse QCM, puis réessayez.'
  }
  if (/format de requ.?te json invalide/i.test(raw)) {
    return 'Publication refusée : format des questions incorrect. Rechargez la page (Ctrl+F5) puis réessayez.'
  }
  return raw
}

export async function apiGet<T>(path: string, skipAuth = false): Promise<T> {
  return httpFetch<T>(apiPath(path), { method: 'GET', skipAuth })
}

export async function apiPost<T>(path: string, body?: unknown, skipAuth = false): Promise<T> {
  return httpFetch<T>(apiPath(path), { method: 'POST', body, skipAuth })
}

export async function apiPut<T>(path: string, body?: unknown, skipAuth = false): Promise<T> {
  return httpFetch<T>(apiPath(path), { method: 'PUT', body, skipAuth })
}

export async function apiDelete<T>(path: string, skipAuth = false): Promise<T> {
  return httpFetch<T>(apiPath(path), { method: 'DELETE', skipAuth })
}

export async function authGet<T>(path: string): Promise<T> {
  return httpFetch<T>(authPath(path), { method: 'GET', skipAuth: true })
}

export async function authPost<T>(path: string, body?: unknown): Promise<T> {
  return httpFetch<T>(authPath(path), { method: 'POST', body, skipAuth: true })
}

export async function v1Get<T>(path: string): Promise<T> {
  return httpFetch<T>(v1Path(path), { method: 'GET' })
}

export async function v1Post<T>(path: string, body?: unknown): Promise<T> {
  return httpFetch<T>(v1Path(path), { method: 'POST', body })
}

/** GET racine OpenAPI (`/protected/document`, …). */
export async function rootGet<T>(path: string, skipAuth = false): Promise<T> {
  return httpFetch<T>(rootPath(path), { method: 'GET', skipAuth })
}

/** POST racine OpenAPI (`/private/document`, …). */
export async function rootPost<T>(path: string, body?: unknown, skipAuth = false): Promise<T> {
  return httpFetch<T>(rootPath(path), { method: 'POST', body, skipAuth })
}
