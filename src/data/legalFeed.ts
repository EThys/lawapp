export interface LegalComment {
  id: string
  author: string
  text: string
  createdAt: string
}

export interface LegalFeedItem {
  id: string
  category: string
  title: string
  hook: string
  content: string
  quiz?: { question: string; answer: string }
  audience: 'Étudiants' | 'Professionnels' | 'Tous publics'
  likes: number
  comments: LegalComment[]
}

/** Capsules courtes et explicites pour le fil Droit Ludique */
export const LEGAL_FEED: LegalFeedItem[] = [
  {
    id: '1',
    category: 'Constitution',
    title: 'Séparation des pouvoirs',
    hook: 'Le juge ne vote pas les lois.',
    content: 'Trois rôles distincts : le Parlement vote, le Gouvernement applique, les tribunaux jugent. Cette règle empêche qu\'un seul pouvoir décide de tout.',
    quiz: { question: 'Qui vote les lois en RDC ?', answer: 'Le Parlement.' },
    audience: 'Tous publics',
    likes: 124,
    comments: [
      { id: '1a', author: 'Patrick K.', text: 'Clair pour le cours de constitution.', createdAt: '2026-06-05T10:20:00Z' },
      { id: '1b', author: 'Grace M.', text: 'Même logique au niveau provincial ?', createdAt: '2026-06-06T14:05:00Z' },
    ],
  },
  {
    id: '2',
    category: 'Droit pénal',
    title: 'Présomption d\'innocence',
    hook: 'Suspect, pas encore coupable.',
    content: 'Tant qu\'un jugement n\'est pas rendu, tu es présumé innocent. L\'accusation doit prouver les faits, pas l\'inverse.',
    quiz: { question: 'Qui doit prouver la culpabilité ?', answer: 'L\'accusation (ministère public).' },
    audience: 'Étudiants',
    likes: 89,
    comments: [
      { id: '2a', author: 'Emy M.', text: 'Parfait pour réviser l\'interro.', createdAt: '2026-06-04T18:30:00Z' },
    ],
  },
  {
    id: '3',
    category: 'Droit civil',
    title: 'Consentement libre',
    hook: 'Contrat signé sous pression ?',
    content: 'Sans consentement libre et éclairé, le contrat peut être annulé. Menace, fraude ou erreur grave suffisent.',
    audience: 'Professionnels',
    likes: 56,
    comments: [
      { id: '3a', author: 'Me Kabongo', text: 'Très fréquent en contentieux commercial.', createdAt: '2026-06-03T09:15:00Z' },
      { id: '3b', author: 'Sarah T.', text: 'Et si c\'est une erreur sur le prix ?', createdAt: '2026-06-07T11:40:00Z' },
    ],
  },
  {
    id: '4',
    category: 'Procédure',
    title: 'Droit à la défense',
    hook: 'Interpellé ? Tu peux te défendre.',
    content: 'Dès la garde à vue, tu as droit à un avocat et à un procès équitable. Ce droit protège contre les abus en enquête.',
    audience: 'Tous publics',
    likes: 201,
    comments: [
      { id: '4a', author: 'Junior B.', text: 'À partager autour de soi.', createdAt: '2026-06-06T08:00:00Z' },
    ],
  },
  {
    id: '5',
    category: 'Droit du travail',
    title: 'Licenciement abusif',
    hook: 'Viré sans motif valable ?',
    content: 'Le licenciement exige une cause réelle ou un motif prévu par la loi. Sans cela, le salarié peut réclamer des dommages.',
    quiz: { question: 'Licenciement sans cause : conséquence ?', answer: 'Dommages-intérêts possibles pour le salarié.' },
    audience: 'Étudiants',
    likes: 73,
    comments: [],
  },
  {
    id: '6',
    category: 'Droit international',
    title: 'Traités ratifiés',
    hook: 'Traité ou loi interne : lequel prime ?',
    content: 'Un traité ratifié et publié au Journal Officiel prime en principe sur la loi ordinaire. Vérifiez toujours sa date d\'entrée en vigueur.',
    audience: 'Professionnels',
    likes: 41,
    comments: [
      { id: '6a', author: 'Me Ilunga', text: 'Toujours contrôler la publication officielle.', createdAt: '2026-06-02T16:50:00Z' },
    ],
  },
  {
    id: '7',
    category: 'Droit pénal',
    title: 'L\'aveu sous contrainte',
    hook: 'Aveu obtenu par force : valable ?',
    content: 'Une déclaration arrachée par violence ou menace n\'a pas de valeur juridique. Seules comptent les preuves obtenues légalement.',
    audience: 'Étudiants',
    likes: 62,
    comments: [
      { id: '7a', author: 'Chris N.', text: 'Point clé en procédure pénale.', createdAt: '2026-06-01T12:00:00Z' },
    ],
  },
  {
    id: '8',
    category: 'Droit civil',
    title: 'Responsabilité civile',
    hook: 'Tu causes un dommage : tu répares.',
    content: 'Celui qui blesse, casse ou prive autrui d\'un bien doit indemniser. Faute, préjudice et lien de causalité doivent être établis.',
    quiz: { question: 'Trois éléments à prouver ?', answer: 'Faute, préjudice et causalité.' },
    audience: 'Tous publics',
    likes: 98,
    comments: [],
  },
]

export const DISCOVER_COMMENTS_KEY = 'lawapp_discover_comments'

export function formatCommentDate(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days} j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
