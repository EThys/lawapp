/**
 * Publie l'évaluation libre (jusqu'au 15/07/2026) sur le backend.
 *
 * Usage :
 *   $env:LAWAPP_EMAIL="votre@email.cd"
 *   $env:LAWAPP_PASSWORD="votreMotDePasse"
 *   node scripts/publish-libre-evaluation.mjs
 */
const ORIGIN = process.env.LAWAPP_API_ORIGIN || 'https://backend.lawapp50.com'
const EMAIL = process.env.LAWAPP_EMAIL || process.env.LAWAPP_IDENTIFIANT
const PASSWORD = process.env.LAWAPP_PASSWORD

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildPayload() {
  const startDate = todayStr()
  const endDate = '2026-07-15'

  return {
    title: 'Évaluation libre - Introduction au droit',
    description:
      "Évaluation ouverte à tous les étudiants. Répondez aux QCM dans le temps imparti. Disponible jusqu'au 15 juillet 2026.",
    compteur: 0,
    fileContent: 'string',
    startDate,
    endDate,
    option: [
      {
        question: {
          title:
            'Quelle branche du droit régit les relations entre personnes privées (contrats, responsabilité) ?',
          point: 2,
        },
        questionOption: [
          { option: 'Le droit civil', goal: true },
          { option: 'Le droit pénal', goal: false },
          { option: 'Le droit constitutionnel', goal: false },
          { option: 'Le droit administratif', goal: false },
        ],
      },
      {
        question: {
          title: 'En droit congolais, une personne physique majeure est généralement âgée de :',
          point: 2,
        },
        questionOption: [
          { option: '16 ans', goal: false },
          { option: '18 ans', goal: true },
          { option: '21 ans', goal: false },
          { option: '25 ans', goal: false },
        ],
      },
      {
        question: {
          title: 'Un contrat valide suppose le consentement libre des parties.',
          point: 1,
        },
        questionOption: [
          { option: 'Vrai', goal: true },
          { option: 'Faux', goal: false },
        ],
      },
    ],
  }
}

async function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Définissez LAWAPP_EMAIL et LAWAPP_PASSWORD (compte enseignant vérifié).',
    )
  }
  const res = await fetch(`${ORIGIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identifiant: EMAIL, password: PASSWORD }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Connexion échouée (${res.status})`)
  }
  const token = data.token
  if (!token) throw new Error('Token absent dans la réponse de connexion.')
  return token
}

async function ensureTeacherProfile(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const listRes = await fetch(`${ORIGIN}/v1/protected/teachers`, { headers })
  if (listRes.ok) {
    const list = await listRes.json()
    const teachers = Array.isArray(list) ? list : list.data ?? list.teachers ?? []
    if (teachers.length > 0) return
  }
  const createRes = await fetch(`${ORIGIN}/v1/private/teachers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      departement: 'Faculté de Droit - UCC',
      gender: 'N/A',
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    throw new Error(err.message || `Profil enseignant requis (${createRes.status})`)
  }
}

async function createEvaluation(token, payload) {
  const res = await fetch(`${ORIGIN}/api/v1/private/evaluations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || JSON.stringify(data) || `Création échouée (${res.status})`)
  }
  return data
}

async function main() {
  const payload = buildPayload()
  console.log('[LawApp] Connexion…', EMAIL)
  const token = await login()
  console.log('[LawApp] Vérification profil enseignant…')
  await ensureTeacherProfile(token)
  console.log('[LawApp] POST évaluation libre', payload.startDate, '→', payload.endDate)
  const result = await createEvaluation(token, payload)
  console.log('[LawApp] Succès:', JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error('[LawApp] Erreur:', err.message || err)
  process.exit(1)
})
