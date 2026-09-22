const ORIGIN = 'https://backend.lawapp50.com'

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const startDate = today()
const endDate = tomorrow()
console.log('dates', startDate, endDate)

const payloads = [
  {
    name: 'empty fileContent',
    body: {
      title: 'Test A',
      description: 'desc',
      compteur: 0,
      fileContent: '',
      startDate,
      endDate,
      option: [
        {
          question: { title: 'Q1', point: 1 },
          questionOption: [
            { option: 'A', goal: true },
            { option: 'B', goal: false },
          ],
        },
      ],
    },
  },
  {
    name: 'omit fileContent',
    body: {
      title: 'Test B',
      description: 'desc',
      compteur: 0,
      startDate,
      endDate,
      option: [
        {
          question: { title: 'Q1', point: 1 },
          questionOption: [
            { option: 'A', goal: true },
            { option: 'B', goal: false },
          ],
        },
      ],
    },
  },
  {
    name: 'literal string fileContent',
    body: {
      title: 'Test C',
      description: 'desc',
      compteur: 0,
      fileContent: 'string',
      startDate,
      endDate,
      option: [
        {
          question: { title: 'Q1', point: 1 },
          questionOption: [
            { option: 'A', goal: true },
            { option: 'B', goal: false },
          ],
        },
      ],
    },
  },
  {
    name: 'mixed types',
    body: {
      title: 'Test D',
      description: 'desc',
      compteur: 0,
      fileContent: 'string',
      startDate,
      endDate,
      option: [
        {
          question: { title: 'Q1', point: 1 },
          questionOption: [
            { option: 'A', goal: true },
            { option: 'B', goal: false },
          ],
        },
      ],
      ouverte: [
        {
          question: { title: 'Open', point: 2 },
          questionOuverte: [{ title: 'Open', fileContent: '' }],
        },
      ],
      caseStudy: [
        {
          question: { title: 'Case', point: 3 },
          questionCaseStudy: [{ title: 'Case', fileContent: '' }],
        },
      ],
    },
  },
]

async function main() {
  for (const p of payloads) {
    const res = await fetch(`${ORIGIN}/api/v1/private/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(p.body),
    })
    const text = await res.text()
    console.log('\n==', p.name, res.status)
    console.log(text.slice(0, 400))
  }
}

main().catch((e) => console.error(e))
