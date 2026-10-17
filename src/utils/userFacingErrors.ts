const isProd = import.meta.env.PROD

/** Action impossible (fallback neutre). */
export function genericActionFailedMessage(): string {
  return 'Cette action n’a pas abouti. Réessayez dans un instant.'
}

/** Service indisponible / erreur 5xx. */
export function serviceBusyMessage(): string {
  return 'Le service est momentanément indisponible. Réessayez dans quelques instants.'
}

/** Ressource introuvable (404). */
export function resourceNotFoundMessage(): string {
  return 'Élément introuvable. Vérifiez vos accès ou actualisez la page.'
}

/** Réponse incomplète après création. */
export function incompleteResponseMessage(context?: string): string {
  const base = 'Enregistrement effectué, mais la confirmation est incomplète.'
  if (context?.trim()) return `${base} ${context.trim()}`
  return `${base} Actualisez la page pour vérifier.`
}

/** Échec réseau / API injoignable. */
export function networkUnreachableMessage(): string {
  if (isProd) {
    return 'Connexion impossible. Vérifiez votre connexion internet et réessayez.'
  }
  return 'Connexion impossible. Vérifiez votre réseau et que LawApp est bien lancée (npm run dev).'
}

export function bootLoadInterruptedMessage(): string {
  if (isProd) {
    return 'Chargement interrompu. Rechargez la page ou réessayez plus tard.'
  }
  return 'Chargement interrompu. Rechargez la page (Ctrl+F5) ou ouvrez la console du navigateur (F12).'
}

export function bootStartFailedMessage(): string {
  if (isProd) {
    return 'Impossible de démarrer LawApp. Rechargez la page.'
  }
  return 'Impossible de démarrer LawApp. Rechargez la page ou relancez npm run dev.'
}

export function wifiScanUnavailableMessage(): string {
  if (isProd) {
    return 'Scan WiFi indisponible sur cet appareil. Vérifiez que vous êtes sur le réseau du campus ou utilisez l’application mobile.'
  }
  return 'Scan WiFi indisponible. Lancez « npm run dev » sur votre PC (service Node requis) ou utilisez l’app mobile.'
}

export function wifiListFailedMessage(): string {
  if (isProd) {
    return 'Impossible de lister les réseaux WiFi. Vérifiez votre connexion au réseau de l’établissement.'
  }
  return 'Impossible de lister les réseaux WiFi. Vérifiez que npm run dev tourne sur le même PC que le professeur.'
}

const TECHNICAL_RAW =
  /^(HTTP error|NetworkError|TypeError|SyntaxError|Failed to fetch|Load failed|Network request failed)$/i

const SERVER_OR_TECH_JARGON =
  /\b(serveur|server|backend|internal server error|bad gateway|gateway timeout|service unavailable|unexpected error|sql|exception|nullpointer|stack trace)\b/i

const STATUS_IN_TEXT = /\b(40[0-9]|50[0-9])\b/

/** Nettoie un message brut (API ou Error) pour l’affichage utilisateur. */
export function sanitizeUserFacingError(message: string | undefined | null): string {
  if (!message?.trim()) return genericActionFailedMessage()

  const trimmed = message.trim()

  if (TECHNICAL_RAW.test(trimmed)) return genericActionFailedMessage()
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(trimmed)) {
    return networkUnreachableMessage()
  }
  if (/internal server error/i.test(trimmed)) return serviceBusyMessage()

  if (SERVER_OR_TECH_JARGON.test(trimmed) || STATUS_IN_TEXT.test(trimmed)) {
    const lowered = trimmed.toLowerCase()
    if (lowered.includes('404') || lowered.includes('introuvable')) return resourceNotFoundMessage()
    if (lowered.includes('401') || lowered.includes('403') || lowered.includes('session')) {
      return 'Session expirée ou accès refusé. Reconnectez-vous.'
    }
    if (lowered.includes('500') || lowered.includes('502') || lowered.includes('503')) {
      return serviceBusyMessage()
    }
    if (/serveur|server|backend/i.test(trimmed)) {
      return genericActionFailedMessage()
    }
  }

  return trimmed
}
