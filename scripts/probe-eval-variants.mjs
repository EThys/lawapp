/**
 * Probe POST /api/v1/private/evaluations — variantes de payload (Swagger).
 *
 * Usage:
 *   $env:LAWAPP_EMAIL="email"
 *   $env:LAWAPP_PASSWORD="motdepasse"
 *   node scripts/probe-eval-variants.mjs
 *
 * Ou avec token:
 *   $env:LAWAPP_TOKEN="eyJ..."
 *   node scripts/probe-eval-variants.mjs
 */
const ORIGIN = process.env.LAWAPP_API_ORIGIN || 'https://backend.lawapp50.com'
const EMAIL = process.env.LAWAPP_EMAIL
const PASSWORD = process.env.LAWAPP_PASSWORD
const TOKEN_ENV = process.env.LAWAPP_TOKEN

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function plusDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function login() {
  if (TOKEN_ENV) return TOKEN_ENV
  if (!EMAIL || !PASSWORD) {
    throw new Error('Définir LAWAPP_EMAIL + LAWAPP_PASSWORD, ou LAWAPP_TOKEN')
  }
  const res = await fetch(`${ORIGIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identifiant: EMAIL, password: PASSWORD }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Login ${res.status}: ${data.message || JSON.stringify(data)}`)
  const token = data.token || data.accessToken
  if (!token) throw new Error('Pas de token dans la réponse login')
  return token
}

async function post(token, name, body) {
  const res = await fetch(`${ORIGIN}/api/v1/private/evaluations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  console.log(`\n== ${name} → ${res.status}`)
  console.log(text.slice(0, 500))
  return { status: res.status, text }
}

const startDate = today()
const endDate = plusDays(1)

const baseMeta = {
  title: 'Probe Devoir n3',
  description: '[Droit civil] test',
  compteur: 0,
  startDate,
  endDate,
}

const qcmGoal = {
  question: { title: "fally c'est qui", point: 10 },
  questionOption: [
    { option: 'bandi', goal: false },
    { option: 'musicien', goal: true },
    { option: 'muyibi', goal: false },
  ],
}

const qcmIsValid = {
  question: { title: "fally c'est qui", point: 10 },
  questionOption: [
    { option: 'bandi', isValid: false },
    { option: 'musicien', isValid: true },
    { option: 'muyibi', isValid: false },
  ],
}

const qcmBoth = {
  question: { title: "fally c'est qui", point: 10 },
  questionOption: [
    { option: 'bandi', goal: false, isValid: false },
    { option: 'musicien', goal: true, isValid: true },
    { option: 'muyibi', goal: false, isValid: false },
  ],
}

const qcmOptionOnly = {
  question: { title: "fally c'est qui", point: 10 },
  questionOption: [{ option: 'bandi' }, { option: 'musicien' }, { option: 'muyibi' }],
}

const qcmTrueFalse = {
  question: { title: 'test', point: 10 },
  questionOption: [
    { option: 'Vrai', goal: true },
    { option: 'Faux', goal: false },
  ],
}

async function main() {
  const token = await login()
  console.log('token ok', token.slice(0, 20) + '…')
  console.log('dates', startDate, endDate)

  const variants = [
    [
      'swagger: goal + fileContent string',
      { ...baseMeta, fileContent: 'string', option: [qcmGoal, qcmTrueFalse] },
    ],
    [
      'swagger: goal + fileContent=description',
      { ...baseMeta, fileContent: baseMeta.description, option: [qcmGoal, qcmTrueFalse] },
    ],
    [
      'isValid + fileContent description',
      { ...baseMeta, fileContent: baseMeta.description, option: [qcmIsValid] },
    ],
    [
      'both goal+isValid',
      { ...baseMeta, fileContent: baseMeta.description, option: [qcmBoth] },
    ],
    [
      'option text only (no goal/isValid)',
      { ...baseMeta, fileContent: baseMeta.description, option: [qcmOptionOnly] },
    ],
    [
      'omit fileContent',
      { ...baseMeta, option: [qcmGoal] },
    ],
    [
      'fileContent empty string',
      { ...baseMeta, fileContent: '', option: [qcmGoal] },
    ],
    [
      'minimal one qcm goal',
      {
        title: 'Probe mini',
        description: 'd',
        compteur: 0,
        fileContent: 'string',
        startDate,
        endDate,
        option: [qcmGoal],
      },
    ],
    [
      'point as 10.0',
      {
        ...baseMeta,
        fileContent: 'string',
        option: [
          {
            question: { title: 'Q', point: 10.0 },
            questionOption: [
              { option: 'A', goal: true },
              { option: 'B', goal: false },
            ],
          },
        ],
      },
    ],
    [
      'dates as datetime',
      {
        ...baseMeta,
        fileContent: 'string',
        startDate: `${startDate}T00:00:00`,
        endDate: `${endDate}T23:59:59`,
        option: [qcmGoal],
      },
    ],
    [
      'with ouverte fileContent empty',
      {
        ...baseMeta,
        fileContent: 'string',
        option: [qcmGoal],
        ouverte: [
          {
            question: { title: 'ici', point: 2 },
            questionOuverte: [{ title: 'ici', fileContent: '' }],
          },
        ],
      },
    ],
    [
      'with ouverte fileContent string',
      {
        ...baseMeta,
        fileContent: 'string',
        option: [qcmGoal],
        ouverte: [
          {
            question: { title: 'ici', point: 2 },
            questionOuverte: [{ title: 'ici', fileContent: 'string' }],
          },
        ],
      },
    ],
  ]

  const results = []
  for (const [name, body] of variants) {
    const r = await post(token, name, body)
    results.push({ name, status: r.status, ok: r.status >= 200 && r.status < 300 })
  }

  console.log('\n=== SUMMARY ===')
  for (const r of results) {
    console.log(r.ok ? 'OK ' : 'NO ', r.status, r.name)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
