import type { Question, StudentAnswer } from '@/types'

export function getCorrectAnswerText(question: Question): string | null {
  if (question.type === 'qcm') {
    const correct = question.options?.find((o) => o.isCorrect)
    return correct?.text ?? null
  }
  if (question.type === 'truefalse') {
    return question.correctAnswer === true ? 'Vrai' : question.correctAnswer === false ? 'Faux' : null
  }
  if (question.type === 'short' && question.correctAnswer) {
    return String(question.correctAnswer)
  }
  return null
}

export function getStudentAnswerText(question: Question, answer?: StudentAnswer): string {
  if (!answer) return '—'
  if (question.type === 'qcm' && typeof answer.value === 'string') {
    return question.options?.find((o) => o.id === answer.value)?.text ?? '—'
  }
  if (question.type === 'truefalse' && typeof answer.value === 'boolean') {
    return answer.value ? 'Vrai' : 'Faux'
  }
  if (question.type === 'document') {
    return answer.fileName ?? 'Document déposé'
  }
  if (typeof answer.value === 'string') return answer.value || '—'
  return '—'
}

export function isAnswerCorrect(question: Question, answer?: StudentAnswer): boolean | null {
  if (!answer || question.type === 'document') return null
  if (question.type === 'qcm' && typeof answer.value === 'string') {
    const correct = question.options?.find((o) => o.isCorrect)
    return correct ? answer.value === correct.id : null
  }
  if (question.type === 'truefalse' && typeof answer.value === 'boolean') {
    return answer.value === question.correctAnswer
  }
  if (question.type === 'short' && typeof answer.value === 'string' && question.correctAnswer) {
    return answer.value.trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
  }
  return null
}
