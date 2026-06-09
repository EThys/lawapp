export function generateId(): string {
  return crypto.randomUUID()
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

/** Convertit input date en ISO (début ou fin de journée) */
export function fromDateInputValue(value: string, endOfDay = false): string | null {
  if (!value.trim()) return null
  return endOfDay
    ? new Date(`${value}T23:59:59`).toISOString()
    : new Date(`${value}T00:00:00`).toISOString()
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  a.click()
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
