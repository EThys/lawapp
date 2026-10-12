import type { ClassroomKind } from '@/types/course'

const STORAGE_KEY = 'lawapp_classroom_kinds'

type KindMap = Record<string, ClassroomKind>

function readMap(): KindMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as KindMap) : {}
  } catch {
    return {}
  }
}

function writeMap(map: KindMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

/** Métadonnée UI (backend à brancher : `kind` sur Classroom). */
export function getClassroomKind(classroomId: string | number): ClassroomKind {
  const map = readMap()
  return map[String(classroomId)] ?? 'university_class'
}

export function setClassroomKind(classroomId: string | number, kind: ClassroomKind) {
  const map = readMap()
  map[String(classroomId)] = kind
  writeMap(map)
}

export function classroomKindLabel(kind: ClassroomKind): string {
  return kind === 'training_cohort' ? 'Formation / cohorte' : 'Salle universitaire'
}

export function classroomKindHint(kind: ClassroomKind): string {
  if (kind === 'training_cohort') {
    return 'Lien d’invitation · évaluations hors catalogue public'
  }
  return 'Cours officiel · présence · promo faculté'
}
