/** Messages UI alignés sur docs/backend-user-journeys-api.md §9. */
const JOIN_CODE_MESSAGES: Record<string, string> = {
  PARCOURS_PENDING: 'Votre parcours n’est pas encore validé par l’établissement.',
  AUDIENCE_MISMATCH: 'Cette épreuve ne correspond pas à votre faculté ou promotion.',
  INSTITUTION_NOT_VERIFIED: 'Publication institution en attente de validation.',
  CODE_EXPIRED: 'Ce code n’est plus valide (délai dépassé).',
  EVALUATION_CLOSED: 'Cette épreuve est terminée ou fermée.',
  MAX_ATTEMPTS: 'Nombre maximum de tentatives atteint.',
  SESSION_EXPIRED: 'Session expirée. Recommencez depuis le dashboard.',
  PRESENCE_REQUIRED: 'Présence requise : scannez le QR en salle avant de commencer.',
  PRESENCE_SESSION_CLOSED: 'La session de présence est terminée.',
  PRESENCE_SLOT_EXPIRED: 'QR expiré — rescannez l’écran du professeur.',
  PRESENCE_INVALID_TOKEN: 'QR invalide.',
  PRESENCE_RELAY_REVOKED: 'Affichage relais révoqué.',
  PRESENCE_NOT_ENROLLED: 'Vous n’êtes pas inscrit à cette salle.',
}

export function messageForJoinBlockCode(code: string | undefined | null): string | null {
  if (!code?.trim()) return null
  const key = code.trim().toUpperCase()
  return JOIN_CODE_MESSAGES[key] ?? null
}
