/** Valeurs alignées avec l’API profils (M / F / N/A). */
export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
  { value: 'N/A', label: 'Non précisé' },
] as const

export type GenderValue = (typeof GENDER_OPTIONS)[number]['value']
