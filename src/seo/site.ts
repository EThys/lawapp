export const SITE_ORIGIN = 'https://lawapp50.com'
export const SITE_NAME = 'LawApp50'

export const HOME_TITLE = 'LawApp50 | Créer des évaluations en ligne'
export const HOME_DESCRIPTION =
  'Créez des évaluations en ligne avec LawApp50 : QCM, devoirs, chrono et anti-triche. Partagez un code, suivez les résultats. Inscription enseignant gratuite.'

export interface PageSeo {
  title: string
  description: string
  index?: boolean
  path?: string
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  const found = document.head.querySelector(`link[rel="${rel}"]`)
  const el = found instanceof HTMLLinkElement ? found : document.createElement('link')
  if (!el.isConnected) {
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export function applySeo(seo: PageSeo) {
  const title = seo.title.includes(SITE_NAME) ? seo.title : `${seo.title} | ${SITE_NAME}`
  const index = seo.index !== false
  const path = seo.path && seo.path.startsWith('/') ? seo.path : '/'
  const url = new URL(path, SITE_ORIGIN).href
  const image = `${SITE_ORIGIN}/logo.png`

  document.title = title
  document.documentElement.lang = 'fr'
  upsertMeta('name', 'description', seo.description)
  upsertMeta('name', 'robots', index ? 'index, follow' : 'noindex, follow')
  upsertMeta('name', 'application-name', SITE_NAME)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', seo.description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:locale', 'fr_FR')
  upsertMeta('property', 'og:image', image)
  upsertMeta('property', 'og:image:alt', 'LawApp50, évaluations et formation')
  upsertMeta('name', 'twitter:card', 'summary')
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', seo.description)
  upsertMeta('name', 'twitter:image', image)
  upsertLink('canonical', url)
}
