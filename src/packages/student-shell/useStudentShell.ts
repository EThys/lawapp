import { STUDENT_SIDEBAR_STORAGE_KEY } from './nav'
import { useShellDrawer } from '@/composables/useShellDrawer'

export function useStudentShell() {
  return useShellDrawer(STUDENT_SIDEBAR_STORAGE_KEY)
}
