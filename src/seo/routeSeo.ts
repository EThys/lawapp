import type { RouteLocationNormalized } from 'vue-router'
import { applySeo, HOME_DESCRIPTION, type PageSeo } from '@/seo/site'

export function applyRouteSeo(to: RouteLocationNormalized) {
  const custom = to.meta.seo as PageSeo | undefined
  if (custom) {
    applySeo({ ...custom, path: to.path })
    return
  }

  applySeo({
    title: 'LawApp50',
    description: HOME_DESCRIPTION,
    index: false,
    path: to.path,
  })
}
