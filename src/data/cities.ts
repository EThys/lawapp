import { City } from 'country-state-city'

/** Villes RDC via `country-state-city` (suggestions ; saisie libre toujours possible). */
export const CITIES_CONGO: string[] = (() => {
  const list = City.getCitiesOfCountry('CD') ?? []
  const names = [...new Set(list.map((c) => c.name).filter(Boolean))]
  names.sort((a, b) => a.localeCompare(b, 'fr'))
  return names
})()

export const DEFAULT_CITY = CITIES_CONGO.includes('Kinshasa') ? 'Kinshasa' : CITIES_CONGO[0] ?? ''

export function filterCities(query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return CITIES_CONGO.slice(0, limit)
  return CITIES_CONGO.filter((c) => c.toLowerCase().includes(q)).slice(0, limit)
}
