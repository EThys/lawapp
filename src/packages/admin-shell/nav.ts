import type { Component } from 'vue'
import { LayoutDashboard, ClipboardList } from '@lucide/vue'

export const ADMIN_SIDEBAR_STORAGE_KEY = 'lawapp-admin-sidebar'

export interface AdminMenuChild {
  id: string
  label: string
  to: string
}

export interface AdminMenuItem {
  id: string
  label: string
  to?: string
  icon: { component: Component }
  activeMatch?: 'exact' | 'startsWith'
  children?: AdminMenuChild[]
}

export interface AdminNavMeta {
  path: string
  title: string
  exact?: boolean
}

export const ADMIN_PAGE_TITLES: AdminNavMeta[] = [
  { path: '/admin', title: 'Tableau de bord', exact: true },
  { path: '/admin/evaluations', title: 'Évaluations', exact: true },
  { path: '/admin/submissions', title: 'Soumissions', exact: true },
]

export function adminPageTitle(path: string): string {
  const exact = ADMIN_PAGE_TITLES.find((t) => t.exact && t.path === path)
  if (exact) return exact.title
  const hit = ADMIN_PAGE_TITLES.find(
    (t) => !t.exact && (path === t.path || path.startsWith(`${t.path}/`)),
  )
  return hit?.title ?? 'Administration'
}

export function buildAdminMenuItems(): AdminMenuItem[] {
  return [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      to: '/admin',
      icon: { component: LayoutDashboard },
      activeMatch: 'exact',
    },
    {
      id: 'evaluations-group',
      label: 'Évaluations',
      icon: { component: ClipboardList },
      children: [
        { id: 'evaluations', label: 'Évaluations', to: '/admin/evaluations' },
        { id: 'submissions', label: 'Soumissions', to: '/admin/submissions' },
      ],
    },
  ]
}
