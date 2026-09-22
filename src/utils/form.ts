/** Ferme le clavier mobile en retirant le focus du champ actif. */
export function dismissKeyboard(): void {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

/** Formate une liste de champs manquants pour un message d'erreur en bas de formulaire. */
export function missingFieldsMessage(fields: string[]): string {
  if (fields.length === 0) return ''
  if (fields.length === 1) return `Le champ « ${fields[0]} » est requis.`
  const last = fields[fields.length - 1]
  const rest = fields.slice(0, -1).join(', ')
  return `Champs requis manquants : ${rest} et ${last}.`
}
