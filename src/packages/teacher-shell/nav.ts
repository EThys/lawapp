import type { Component } from 'vue'
import {
  LayoutDashboard,
  History,
  CalendarCheck,
  Users,
  UserCog,
  Layers,
  ClipboardList,
} from '@lucide/vue'

export const TEACHER_SIDEBAR_STORAGE_KEY = 'lawapp-teacher-sidebar'

export interface TeacherMenuChild {
  id: string
  label: string
  to: string
}

export interface TeacherMenuItem {
  id: string
  label: string
  to?: string
  icon: { component: Component }
  activeMatch?: 'exact' | 'startsWith'
  children?: TeacherMenuChild[]
}

export interface TeacherNavMeta {
  path: string
  title: string
  exact?: boolean
}

/** Titres affichés dans la navbar selon la route. */
export const TEACHER_PAGE_TITLES: TeacherNavMeta[] = [
  { path: '/teacher', title: 'Tableau de bord', exact: true },
  { path: '/teacher/evaluations', title: 'Évaluations', exact: true },
  { path: '/teacher/submissions', title: 'Soumissions', exact: true },
  { path: '/teacher/create', title: 'Publier une évaluation' },
  { path: '/quiz/create', title: 'Créer un quiz' },
  { path: '/teacher/history', title: 'Suivi & historique' },
  { path: '/teacher/attendance', title: 'Présences' },
  { path: '/teacher/courses', title: 'Salles' },
  { path: '/teacher/profile', title: 'Profil enseignant' },
  { path: '/teacher/session', title: 'Correction de soumission' },
  { path: '/teacher/evaluation', title: 'Détail évaluation' },
  { path: '/account', title: 'Compte' },
]

export function teacherPageTitle(path: string): string {
  const exact = TEACHER_PAGE_TITLES.find((t) => t.exact && t.path === path)
  if (exact) return exact.title
  const hit = TEACHER_PAGE_TITLES.find(
    (t) => !t.exact && (path === t.path || path.startsWith(`${t.path}/`)),
  )
  return hit?.title ?? 'Espace enseignant'
}

export function buildTeacherMenuItems(): TeacherMenuItem[] {
  return [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      to: '/teacher',
      icon: { component: LayoutDashboard },
      activeMatch: 'exact',
    },
    {
      id: 'evaluations-group',
      label: 'Évaluations',
      icon: { component: ClipboardList },
      children: [
        { id: 'evaluations', label: 'Évaluations', to: '/teacher/evaluations' },
        { id: 'submissions', label: 'Soumissions', to: '/teacher/submissions' },
      ],
    },
    {
      id: 'quiz',
      label: 'Créer un quiz',
      to: '/quiz/create',
      icon: { component: Layers },
    },
    {
      id: 'history',
      label: 'Suivi & historique',
      to: '/teacher/history',
      icon: { component: History },
    },
    {
      id: 'attendance',
      label: 'Présences',
      to: '/teacher/attendance',
      icon: { component: CalendarCheck },
    },
    {
      id: 'courses',
      label: 'Salles',
      to: '/teacher/courses',
      icon: { component: Users },
    },
    {
      id: 'profile',
      label: 'Profil enseignant',
      to: '/teacher/profile',
      icon: { component: UserCog },
    },
  ]
}
