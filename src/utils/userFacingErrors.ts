const isProd = import.meta.env.PROD

/** Échec réseau / serveur injoignable (API). */
export function networkUnreachableMessage(): string {
  if (isProd) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez dans quelques instants.'
  }
  return 'Connexion au serveur impossible. Vérifiez votre réseau et que LawApp tourne bien (npm run dev).'
}

export function bootLoadInterruptedMessage(): string {
  if (isProd) {
    return 'Chargement interrompu. Rechargez la page ou réessayez plus tard.'
  }
  return 'Chargement interrompu. Vérifiez le port du serveur (npm run dev → 5173) et la console F12.'
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
