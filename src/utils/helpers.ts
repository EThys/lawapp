/** UUID-compatible id. `crypto.randomUUID` is missing on HTTP over LAN IPs (non-secure context). */
export function generateId(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

export function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Affiche les minutes en heures dès que la durée dépasse 60 min (5400 min → 90 h). */
export function formatMinutes(minutes: number | string | null | undefined): string {
  const n = Math.round(Number(minutes))
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 60) return `${n} min`
  const hours = Math.floor(n / 60)
  const rest = n % 60
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function calculateScore(
  questions: { id: string; points: number; type: string; correctAnswer?: string | boolean; options?: { id: string; isCorrect?: boolean }[] }[],
  answers: { questionId: string; value: string | boolean | string[] }[]
): { score: number; maxScore: number } {
  let score = 0
  let maxScore = 0

  for (const q of questions) {
    if (q.type === 'document') continue
    maxScore += q.points
    const answer = answers.find((a) => a.questionId === q.id)
    if (!answer) continue

    if (q.type === 'qcm' && typeof answer.value === 'string') {
      const correct = q.options?.find((o) => o.isCorrect)
      if (correct && answer.value === correct.id) score += q.points
    } else if (q.type === 'truefalse' && typeof answer.value === 'boolean') {
      if (answer.value === q.correctAnswer) score += q.points
    } else if (q.type === 'short' && typeof answer.value === 'string' && q.correctAnswer) {
      if (answer.value.trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
        score += q.points
      }
    }
    // document : corrigé manuellement, pas de score auto
  }

  return { score, maxScore }
}

export function getShareUrl(code: string): string {
  return `${window.location.origin}/join/${code}`
}

export function getEvalShareUrl(code: string): string {
  return `${window.location.origin}/join/eval/${code}`
}

export function exportToCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function isEvaluationAvailable(evaluation: {
  availableFrom: string | null
  availableUntil?: string | null
  status: string
}): boolean {
  if (evaluation.status === 'draft' || evaluation.status === 'closed') return false
  const now = new Date()
  if (evaluation.availableFrom && new Date(evaluation.availableFrom) > now) return false
  if (evaluation.availableUntil && new Date(evaluation.availableUntil) < now) return false
  return true
}

export function getEvaluationAvailabilityMessage(evaluation: {
  availableFrom: string | null
  availableUntil?: string | null
  title: string
}): string | null {
  const now = new Date()
  if (evaluation.availableFrom && new Date(evaluation.availableFrom) > now) {
    const until = evaluation.availableUntil
      ? ` et se clôture le ${formatDate(evaluation.availableUntil)}`
      : ''
    return `L'évaluation « ${evaluation.title} » sera disponible le ${formatDate(evaluation.availableFrom)}${until}.`
  }
  if (evaluation.availableUntil && new Date(evaluation.availableUntil) < now) {
    return `L'évaluation « ${evaluation.title} » n'est plus accessible (date limite dépassée le ${formatDate(evaluation.availableUntil)}).`
  }
  return null
}

export function formatEvaluationPeriod(evaluation: {
  availableFrom: string | null
  availableUntil?: string | null
}): string {
  if (!evaluation.availableFrom && !evaluation.availableUntil) return 'Ouverte sans limite de dates'
  if (evaluation.availableFrom && evaluation.availableUntil) {
    return `Du ${formatDateOnly(evaluation.availableFrom)} au ${formatDateOnly(evaluation.availableUntil)}`
  }
  if (evaluation.availableFrom) return `À partir du ${formatDateOnly(evaluation.availableFrom)}`
  return `Jusqu'au ${formatDateOnly(evaluation.availableUntil!)}`
}

export function formatDateOnly(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso))
}

/** Convertit une date ISO en valeur pour input datetime-local */
export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convertit datetime-local en ISO */
export function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null
  return new Date(value).toISOString()
}

/** Convertit une date ISO en valeur pour input type="date" */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

/** Convertit input date en ISO (début ou fin de journée) — garde aussi la date calendrier. */
export function fromDateInputValue(value: string, endOfDay = false): string | null {
  if (!value.trim()) return null
  // Garder YYYY-MM-DD pour le métier ; ne pas passer par toISOString (décalage UTC).
  const day = value.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return endOfDay ? `${day}T23:59:59.000` : `${day}T00:00:00.000`
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  a.click()
}

export type ResolvedFileContent = {
  src: string
  mime: string
  isPdf: boolean
  isImage: boolean
  canPreview: boolean
  downloadName: string
}

/** Normalise base64, data URL ou lien HTTP pour affichage / téléchargement. */
export function resolveFileContent(
  raw: string | undefined | null,
  defaultName = 'document.pdf',
): ResolvedFileContent | null {
  const c = raw?.trim()
  if (!c) return null

  if (c.startsWith('data:')) {
    const mime = /^data:([^;,]+)/.exec(c)?.[1] ?? 'application/octet-stream'
    return {
      src: c,
      mime,
      isPdf: mime === 'application/pdf',
      isImage: mime.startsWith('image/'),
      canPreview: mime === 'application/pdf' || mime.startsWith('image/'),
      downloadName: defaultName,
    }
  }

  if (/^https?:\/\//i.test(c)) {
    const isPdf = /\.pdf(\?|#|$)/i.test(c)
    const isImage = /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(c)
    return {
      src: c,
      mime: isPdf ? 'application/pdf' : isImage ? 'image/png' : 'application/octet-stream',
      isPdf,
      isImage,
      canPreview: isPdf || isImage,
      downloadName: defaultName,
    }
  }

  const compact = c.replace(/\s/g, '')
  if (compact.length > 80 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
    const src = `data:application/pdf;base64,${compact}`
    return {
      src,
      mime: 'application/pdf',
      isPdf: true,
      isImage: false,
      canPreview: true,
      downloadName: defaultName,
    }
  }

  return null
}

export function downloadResolvedFile(file: ResolvedFileContent): void {
  if (file.src.startsWith('data:')) {
    downloadDataUrl(file.src, file.downloadName)
    return
  }
  window.open(file.src, '_blank', 'noopener')
}

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

export function readFileAsDataUrl(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<{ dataUrl: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`Fichier trop volumineux (max. ${Math.round(maxBytes / 1024 / 1024)} Mo).`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve({ dataUrl: reader.result as string, fileName: file.name })
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'))
    reader.readAsDataURL(file)
  })
}
