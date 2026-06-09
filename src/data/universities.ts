export interface InstitutionOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

/** Établissement partenaire, seul choix autorisé pour l'inscription */
export const PARTNER_INSTITUTION = 'Université Catholique du Congo'

export const DEFAULT_UNIVERSITY = PARTNER_INSTITUTION

/** Principales universités, hautes écoles et instituts en RDC (partenariat UCC actif) */
export const INSTITUTIONS_CONGO: InstitutionOption[] = [
  // Universités
  { value: PARTNER_INSTITUTION, label: 'Université Catholique du Congo (UCC)', group: 'Universités' },
  { value: 'Université de Kinshasa', label: 'Université de Kinshasa (UNIKIN)', disabled: true, group: 'Universités' },
  { value: 'Université Loyola du Congo', label: 'Université Loyola du Congo (ULC)', disabled: true, group: 'Universités' },
  { value: 'Université Pédagogique Nationale', label: 'Université Pédagogique Nationale (UPN)', disabled: true, group: 'Universités' },
  { value: 'Université de Lubumbashi', label: 'Université de Lubumbashi (UNILU)', disabled: true, group: 'Universités' },
  { value: 'Université Officielle de Bukavu', label: 'Université Officielle de Bukavu (UOB)', disabled: true, group: 'Universités' },
  { value: 'Université de Kisangani', label: 'Université de Kisangani (UNIKIS)', disabled: true, group: 'Universités' },
  { value: 'Université Protestante au Congo', label: 'Université Protestante au Congo (UPC)', disabled: true, group: 'Universités' },
  { value: 'Université Kongo', label: 'Université Kongo (UK)', disabled: true, group: 'Universités' },
  { value: 'Université Simon Kimbangu', label: 'Université Simon Kimbangu (USK)', disabled: true, group: 'Universités' },
  { value: 'Université William Booth', label: 'Université William Booth (UWB)', disabled: true, group: 'Universités' },
  { value: 'Université Notre Dame du Congo', label: 'Université Notre Dame du Congo (UND)', disabled: true, group: 'Universités' },
  { value: 'Université Shalom de Bunia', label: 'Université Shalom de Bunia', disabled: true, group: 'Universités' },
  { value: 'Université Libre des Pays des Grands Lacs', label: 'Université Libre des Pays des Grands Lacs (ULPGL)', disabled: true, group: 'Universités' },
  { value: 'Université Evangélique en Afrique', label: 'Université Evangélique en Afrique (UEA)', disabled: true, group: 'Universités' },
  { value: 'Université Bilingue du Congo', label: 'Université Bilingue du Congo (UBC)', disabled: true, group: 'Universités' },
  { value: 'Université de Goma', label: 'Université de Goma (UNIGOM)', disabled: true, group: 'Universités' },
  { value: 'Université Catholique du Graben', label: 'Université Catholique du Graben (UCG)', disabled: true, group: 'Universités' },

  // Hautes écoles
  { value: 'Haute École de Commerce', label: 'Haute École de Commerce (HEC)', disabled: true, group: 'Hautes écoles' },
  { value: 'Haute École des Sciences Commerciales', label: 'Haute École des Sciences Commerciales (HESC)', disabled: true, group: 'Hautes écoles' },
  { value: 'Haute École de Développement Rural', label: 'Haute École de Développement Rural (HECR)', disabled: true, group: 'Hautes écoles' },
  { value: 'Haute École de Kuujwa', label: 'Haute École de Kuujwa', disabled: true, group: 'Hautes écoles' },
  { value: 'Haute École Marco Polo', label: 'Haute École Marco Polo', disabled: true, group: 'Hautes écoles' },
  { value: 'Haute École Leonard de Vinci', label: 'Haute École Leonard de Vinci', disabled: true, group: 'Hautes écoles' },

  // Instituts
  { value: 'Institut Supérieur de Commerce', label: 'Institut Supérieur de Commerce (ISC)', disabled: true, group: 'Instituts' },
  { value: 'Institut Supérieur Pédagogique', label: 'Institut Supérieur Pédagogique (ISP)', disabled: true, group: 'Instituts' },
  { value: 'Institut Supérieur des Techniques Appliquées', label: 'Institut Supérieur des Techniques Appliquées (ISTA)', disabled: true, group: 'Instituts' },
  { value: 'Institut Supérieur Pédagogique de Bukavu', label: 'Institut Supérieur Pédagogique de Bukavu (ISP Bukavu)', disabled: true, group: 'Instituts' },
  { value: 'Institut National des Beaux-Arts', label: 'Institut National des Beaux-Arts (INBA)', disabled: true, group: 'Instituts' },
  { value: 'Institut Supérieur d\'Architecture et Urbanisme', label: 'Institut Supérieur d\'Architecture et Urbanisme (ISAU)', disabled: true, group: 'Instituts' },
  { value: 'Institut Supérieur de Développement Rural', label: 'Institut Supérieur de Développement Rural (ISDR)', disabled: true, group: 'Instituts' },
  { value: 'Institut Supérieur de Technologie Médicale', label: 'Institut Supérieur de Technologie Médicale (ISTM)', disabled: true, group: 'Instituts' },
  { value: 'Académie des Beaux-Arts de Kinshasa', label: 'Académie des Beaux-Arts de Kinshasa', disabled: true, group: 'Instituts' },
  { value: 'Institut Supérieur de Gestion et d\'Informatique', label: 'Institut Supérieur de Gestion et d\'Informatique (ISGI)', disabled: true, group: 'Instituts' },
]

/** @deprecated Utiliser INSTITUTIONS_CONGO */
export const UNIVERSITIES_CONGO = INSTITUTIONS_CONGO

export function isInstitutionSelectable(value: string): boolean {
  const option = INSTITUTIONS_CONGO.find((i) => i.value === value)
  return !!option && !option.disabled
}

export function getInstitutionGroups(): { label: string; options: InstitutionOption[] }[] {
  const groups = new Map<string, InstitutionOption[]>()
  for (const inst of INSTITUTIONS_CONGO) {
    const key = inst.group ?? 'Autres'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(inst)
  }
  return Array.from(groups.entries()).map(([label, options]) => ({ label, options }))
}
