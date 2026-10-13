import type { User } from '@/types/auth'

/** L’enseignant connecté peut-il gérer cette salle (présence, tunnel, etc.) ? */
export function isCourseTeacher(
  course: { teacherId: string } | null | undefined,
  user: Pick<User, 'id' | 'apiUserId'> | null | undefined,
): boolean {
  if (!course?.teacherId?.trim() || !user?.id) return false
  const owner = course.teacherId.trim()
  const ids = new Set<string>([user.id.trim()])
  if (user.apiUserId != null) ids.add(String(user.apiUserId))
  return ids.has(owner)
}
