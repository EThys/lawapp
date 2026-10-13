import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..', 'src')
const TS_UI = [
  'utils/helpers.ts',
  'utils/presenceCheckInProfile.ts',
  'utils/apiJoinMessages.ts',
  'utils/studentExamCalendar.ts',
  'utils/exportReports.ts',
]

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (ent.name.endsWith('.vue')) out.push(p)
  }
  return out
}

function transform(content) {
  let s = content
  s = s.replace(/ — /g, '. ')
  s = s.replace(/'—'/g, "'n/d'")
  s = s.replace(/"—"/g, '"n/d"')
  s = s.replace(/\? '—' :/g, "? 'n/d' :")
  s = s.replace(/: '—'/g, ": 'n/d'")
  s = s.replace(/\u2014/g, '·')
  return s
}

const files = [...walk(ROOT), ...TS_UI.map((f) => path.join(ROOT, f))]
for (const file of files) {
  if (!fs.existsSync(file)) continue
  const raw = fs.readFileSync(file, 'utf8')
  if (!raw.includes('\u2014')) continue
  fs.writeFileSync(file, transform(raw), 'utf8')
  console.log('updated', path.relative(ROOT, file))
}
