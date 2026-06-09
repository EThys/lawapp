export interface Course {
  id: string
  teacherId: string
  teacherName: string
  name: string
  subject: string
  /** Code pour rejoindre le groupe (membres autorisés aux évaluations) */
  enrollmentCode: string
  /** Date de génération du lien classe par l'enseignant */
  enrollmentPublishedAt: string | null
  /** Date de partage du lien classe aux étudiants inscrits */
  enrollmentSharedAt: string | null
  studentUserIds: string[]
  createdAt: string
  updatedAt: string
}

/** Session réseau local ouverte par l'enseignant en salle */
export interface PresenceTunnel {
  id: string
  courseId: string
  teacherId: string
  /** Code stable pour le lien partagé aux étudiants */
  shareCode: string
  /** Nom du réseau WiFi de la salle (ex. UCC-L2-DROIT) */
  wifiLabel: string
  /** Empreinte réseau capturée à l'ouverture par le prof */
  networkFingerprint: {
    publicIp: string
    localIpPrefix: string | null
  }
  /** Code tableau optionnel, renouvelé toutes les 45 s */
  code: string
  startedAt: string
  expiresAt: string
  codeExpiresAt: string
  isActive: boolean
  /** Date de partage aux étudiants de la salle */
  sharedToClassAt: string | null
}

export interface AttendanceRecord {
  id: string
  courseId: string
  studentUserId: string
  tunnelId: string
  /** Date locale YYYY-MM-DD */
  date: string
  markedAt: string
}

export const TUNNEL_DURATION_MINUTES = 20
export const TUNNEL_CODE_ROTATION_SECONDS = 45
