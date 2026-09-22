/** Version API backend (Spring `/api/{version}/…`). */
export const API_VERSION = 'v1'

/** Concatène une base (`/api`) et un chemin (`v1/private/evaluations`). */
export function joinApi(base: string, path: string): string {
  const b = base.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  if (!b) return `/${p}`
  return `${b}/${p}`
}

export function resolveApiBase(): string {
  const env =
    (import.meta.env.VITE_API_BASE as string | undefined)?.trim() ||
    (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (import.meta.env.PROD) {
    if (env?.startsWith('https://')) return env.replace(/\/+$/, '')
    if (env?.startsWith('/')) return env.replace(/\/+$/, '')
    return '/api'
  }
  if (env?.startsWith('http')) return env.replace(/\/+$/, '')
  return env?.replace(/\/+$/, '') || '/api'
}

/** Auth à la racine (`/auth/login`), pas sous `/api`. */
export function resolveAuthBase(): string {
  const env = (import.meta.env.VITE_AUTH_BASE as string | undefined)?.trim()
  if (import.meta.env.PROD) {
    if (env?.startsWith('https://')) return env.replace(/\/+$/, '')
    return env ?? ''
  }
  return env ?? ''
}

/** Quiz et enseignants : chemins `/{version}/…` sans préfixe `/api`. */
export function resolveV1Base(): string {
  return '/v1'
}

/**
 * Chemins racine OpenAPI sans `/api` ni version
 * (ex. `/private/document`, `/protected/document`).
 */
export function rootPath(relativePath: string): string {
  const p = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return p
}

export function apiPath(relativePath: string): string {
  const p = relativePath.replace(/^\/+/, '')
  if (p.startsWith(`${API_VERSION}/`)) {
    return joinApi(resolveApiBase(), p)
  }
  return joinApi(resolveApiBase(), `${API_VERSION}/${p}`)
}

export function v1Path(relativePath: string): string {
  return joinApi(resolveV1Base(), relativePath.replace(/^\/+/, ''))
}

export function authPath(relativePath: string): string {
  const p = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  const base = resolveAuthBase()
  return base ? joinApi(base, p) : p
}
