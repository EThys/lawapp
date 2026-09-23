/**
 * Principales villes RDC (suggestions combobox — saisie libre toujours possible).
 * Liste statique pour éviter d’embarquer la base mondiale `country-state-city` (~8 Mo).
 */
export const CITIES_CONGO: string[] = [
  'Bandundu',
  'Beni',
  'Boende',
  'Boma',
  'Bukavu',
  'Bunia',
  'Butembo',
  'Gbadolite',
  'Gemena',
  'Goma',
  'Ilebo',
  'Inongo',
  'Isiro',
  'Kabinda',
  'Kalemie',
  'Kamina',
  'Kananga',
  'Kikwit',
  'Kindu',
  'Kinshasa',
  'Kisangani',
  'Kolwezi',
  'Likasi',
  'Lisala',
  'Lubumbashi',
  'Lusambo',
  'Matadi',
  'Mbandaka',
  'Mbuji-Mayi',
  'Mweka',
  'Tshikapa',
  'Uvira',
  'Zongo',
]

export const DEFAULT_CITY = CITIES_CONGO.includes('Kinshasa') ? 'Kinshasa' : CITIES_CONGO[0] ?? ''

export function filterCities(query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return CITIES_CONGO.slice(0, limit)
  return CITIES_CONGO.filter((c) => c.toLowerCase().includes(q)).slice(0, limit)
}
