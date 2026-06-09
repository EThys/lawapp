import type { RouteLocationNormalized } from 'vue-router'

export type SkeletonVariant = 'dashboard' | 'list' | 'detail' | 'form' | 'exam' | 'auth' | 'home'

export function getRouteSkeletonVariant(route: RouteLocationNormalized): SkeletonVariant {
  const meta = route.meta.skeleton as SkeletonVariant | undefined
  if (meta) return meta

  const name = String(route.name ?? '')

  if (name === 'home') return 'home'
  if (name === 'discover') return 'home'
  if (name.includes('dashboard')) return 'dashboard'
  if (name.includes('history')) return 'list'
  if (name.includes('evaluation') || name.includes('course')) return 'detail'
  if (name.includes('exam')) return 'exam'
  if (name.includes('create') || name.includes('edit')) return 'form'
  if (name === 'login' || name === 'register') return 'auth'
  if (name.startsWith('join')) return 'form'

  return 'list'
}
