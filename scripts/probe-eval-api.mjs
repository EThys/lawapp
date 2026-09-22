/** Probe evaluation API payload requirements */
const BASE = 'https://backend.lawapp50.com'

async function req(method, path, body, token) {
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, data }
}

const publicList = await req('GET', '/api/v1/public/evaluations')
console.log('Public list status:', publicList.status)
if (publicList.data?.session?.[0]) {
  console.log('Sample eval keys:', Object.keys(publicList.data.session[0]))
  console.log('Sample option block:', JSON.stringify(publicList.data.session[0].option?.[0], null, 2))
}

const payloads = [
  {
    name: 'goal field',
    body: {
      title: 'Probe LawApp',
      description: 'string',
      compteur: 0,
      fileContent: 'string',
      startDate: '2026-07-10',
      endDate: '2026-08-10',
      option: [
        {
          question: { title: 'Q1', point: 1.0 },
          questionOption: [
            { option: 'A', goal: true },
            { option: 'B', goal: false },
          ],
        },
      ],
    },
  },
  {
    name: 'isValid field',
    body: {
      title: 'Probe LawApp 2',
      description: 'string',
      compteur: 0,
      fileContent: 'string',
      startDate: '2026-07-10',
      endDate: '2026-08-10',
      option: [
        {
          question: { title: 'Q1', point: 1.0 },
          questionOption: [
            { option: 'A', isValid: true },
            { option: 'B', isValid: false },
          ],
        },
      ],
    },
  },
  {
    name: 'empty ouverte+caseStudy',
    body: {
      title: 'Probe LawApp 3',
      description: 'string',
      compteur: 0,
      fileContent: 'string',
      startDate: '2026-07-10',
      endDate: '2026-08-10',
      option: [
        {
          question: { title: 'Q1', point: 1.0 },
          questionOption: [
            { option: 'A', goal: true },
            { option: 'B', goal: false },
          ],
        },
      ],
      ouverte: [],
      caseStudy: [],
    },
  },
]

for (const p of payloads) {
  const r = await req('POST', '/api/v1/private/evaluations', p.body)
  console.log(`\n${p.name}: ${r.status}`, JSON.stringify(r.data))
}
