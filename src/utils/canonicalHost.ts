/**
 * Le backend n’autorise CORS que pour https://lawapp50.com (sans www).
 * Toute visite sur www doit être redirigée vers l’apex avant tout appel API.
 */
export function isWwwHost(hostname = typeof location !== 'undefined' ? location.hostname : ''): boolean {
  return /^www\./i.test(hostname)
}

/** @returns true si une redirection a été déclenchée */
export function redirectWwwHostToApex(): boolean {
  if (typeof location === 'undefined') return false
  if (!isWwwHost(location.hostname)) return false
  const apex = location.hostname.replace(/^www\./i, '')
  location.replace(
    `${location.protocol}//${apex}${location.pathname}${location.search}${location.hash}`,
  )
  return true
}
