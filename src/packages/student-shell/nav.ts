import type { Component } from 'vue'
import {
  LayoutDashboard,
  History,
  CalendarCheck,
  UserPlus,
} from '@lucide/vue'

export const STUDENT_SIDEBAR_STORAGE_KEY = 'lawapp-student-sidebar'

export interface StudentMenuItem {
  id: string
  label: string
  to: string
  icon: { component: Component }
  activeMatch?: 'exact' | 'startsWith'
}

export interface StudentNavMeta {
  path: string
  title: string
  exact?: boolean
}

/** Titres affichés dans la navbar selon la route. */
export const STUDENT_PAGE_TITLES: StudentNavMeta[] = [
  { path: '/student', title: 'Tableau de bord', exact: true },
  { path: '/student/history', title: 'Mon historique' },
  { path: '/student/attendance', title: 'Présences' },
  { path: '/student/profile', title: 'Profil étudiant' },
  { path: '/join/group', title: 'Rejoindre une salle' },
  { path: '/account', title: 'Compte' },
]

export function studentPageTitle(path: string): string {
  const exact = STUDENT_PAGE_TITLES.find((t) => t.exact && t.path === path)
  if (exact) return exact.title
  const hit = STUDENT_PAGE_TITLES.find(
    (t) => !t.exact && (path === t.path || path.startsWith(`${t.path}/`)),
  )
  return hit?.title ?? 'Espace étudiant'
}

export function buildStudentMenuItems(): StudentMenuItem[] {
  return [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      to: '/student',
      icon: { component: LayoutDashboard },
      activeMatch: 'exact',
    },
    {
      id: 'history',
      label: 'Mon historique',
      to: '/student/history',
      icon: { component: History },
    },
    {
      id: 'attendance',
      label: 'Présences',
      to: '/student/attendance',
      icon: { component: CalendarCheck },
    },
    {
      id: 'join',
      label: 'Rejoindre une salle',
      to: '/join/group',
      icon: { component: UserPlus },
    },
  ]
}
