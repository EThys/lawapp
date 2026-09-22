/**
 * Probe quiz create: goal vs isGoal field names.
 * Usage:
 *   $env:LAWAPP_EMAIL="..."
 *   $env:LAWAPP_PASSWORD="..."
 *   node scripts/probe-quiz-goal.mjs
 */
const ORIGIN = process.env.LAWAPP_API_ORIGIN || 'https://backend.lawapp50.com'
const EMAIL = process.env.LAWAPP_EMAIL || process.env.LAWAPP_IDENTIFIANT
const PASSWORD = process.env.LAWAPP_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('Set LAWAPP_EMAIL and LAWAPP_PASSWORD')
  process.exit(1)
}

async function login() {
  const res = await fetch(`${ORIGIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identifiant: EMAIL, password: PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`login ${res.status} ${JSON.stringify(data)}`)
  const token = data.accessToken ?? data.token ?? data.access_token
  if (!token) throw new Error(`no token ${JSON.stringify(data)}`)
  return token
}

function baseQuiz(options) {
  return {
    title: `Probe quiz ${Date.now()}`,
    description: 'probe',
    levels: [
      {
        title: 'Niveau 1',
        levelOrder: 1,
        questions: [
          {
            title: 'Q1',
            point: 1,
            options,
          },
        ],
      },
    ],
  }
}

const variants = [
  {
    name: 'goal only',
    options: [
      { option: 'A', goal: true },
      { option: 'B', goal: false },
      { option: 'C', goal: false },
    ],
  },
  {
    name: 'isGoal only',
    options: [
      { option: 'A', isGoal: true },
      { option: 'B', isGoal: false },
      { option: 'C', isGoal: false },
    ],
  },
  {
    name: 'both goal+isGoal',
    options: [
      { option: 'A', goal: true, isGoal: true },
      { option: 'B', goal: false, isGoal: false },
      { option: 'C', goal: false, isGoal: false },
    ],
  },
  {
    name: 'user sample with duplicate fef',
    options: [
      { option: 'fef', goal: true },
      { option: 'feffef', goal: false },
      { option: 'fe', goal: false },
      { option: 'fef', goal: false },
    ],
  },
]

const token = await login()
console.log('logged in')

for (const v of variants) {
  const body = baseQuiz(v.options)
  const res = await fetch(`${ORIGIN}/v1/private/quiz`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  console.log('\n===', v.name, res.status)
  console.log(text.slice(0, 500))
}
