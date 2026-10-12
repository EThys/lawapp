import { TEACHER_SIDEBAR_STORAGE_KEY } from './nav'
import { useShellDrawer } from '@/composables/useShellDrawer'

export function useTeacherShell(storageKey = TEACHER_SIDEBAR_STORAGE_KEY) {
  return useShellDrawer(storageKey)
}
