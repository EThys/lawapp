import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function walkDir(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walkDir(full, out)
    } else if (/\.(ts|vue)$/.test(name)) out.push(fs.readFileSync(full, 'utf8'))
  }
  return out
}

const src = walkDir(path.join(root, 'src')).join('\n')
const spec = JSON.parse(fs.readFileSync(path.join(root, 'api-docs.json'), 'utf8'))

function srcMentions(fragment) {
  if (!fragment) return false
  return (
    src.includes(`'${fragment}'`) ||
    src.includes(`"${fragment}"`) ||
    src.includes(`\`${fragment}\``) ||
    src.includes(`\`${fragment}/`) ||
    src.includes(`${fragment}/\${`) ||
    src.includes(`${fragment}/\${`)
  )
}

const unused = []
const used = []

for (const [rawP, methods] of Object.entries(spec.paths ?? {})) {
  for (const [method, op] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
    const p = rawP.replace('{version}', 'v1')
    const rel = p.replace(/^\/api\/v1\//, '').replace(/^\//, '')

    const candidates = new Set([rel, p.replace(/^\//, ''), p])
    if (p.startsWith('/auth/')) candidates.add(p)
    if (p === '/api/auth/google') candidates.add('/api/auth/google')
    if (p.startsWith('/v1/')) candidates.add(p.replace(/^\//, ''))
    if (p.startsWith('/private/') || p.startsWith('/protected/')) {
      candidates.add(p.slice(1))
    }

    const prefix = rel.split('/{')[0]
    let hit = [...candidates].some((c) => srcMentions(c))
    if (!hit && prefix.length > 2) {
      hit =
        src.includes(`${prefix}/\${`) ||
        src.includes(`'${prefix}/'`) ||
        src.includes(`"${prefix}/"`) ||
        srcMentions(prefix)
    }

    const row = {
      method: method.toUpperCase(),
      path: p,
      summary: op.summary ?? '',
      tags: (op.tags ?? [])[0] ?? '',
    }
    if (hit) used.push(row)
    else unused.push(row)
  }
}

// Manual overrides (paths used but string form differs)
const forceUsed = [
  'POST /auth/login',
  'POST /auth/register',
  'GET /api/auth/google',
  'GET /v1/protected/teachers',
  'POST /v1/private/teachers',
  'GET /v1/protected/quiz',
  'GET /v1/private/quiz/{id}',
  'POST /v1/private/quiz',
]
for (const key of forceUsed) {
  const [method, ...rest] = key.split(' ')
  const p = rest.join(' ')
  const idx = unused.findIndex((u) => u.method === method && u.path === p)
  if (idx >= 0) {
    used.push(unused[idx])
    unused.splice(idx, 1)
  }
}

// Dead wrappers: exported async functions in src/api never referenced elsewhere
const apiDir = path.join(root, 'src/api')
const srcTexts = walkDir(path.join(root, 'src'))
const apiFiles = fs.readdirSync(apiDir).filter((f) => f.endsWith('.ts') && !['client.ts', 'authApi.ts', 'types.ts', 'http.ts'].includes(f))
const deadWrappers = []
for (const file of apiFiles) {
  const content = fs.readFileSync(path.join(apiDir, file), 'utf8')
  const fns = [...content.matchAll(/export async function (\w+)/g)].map((m) => m[1])
  for (const fn of fns) {
    let refs = 0
    for (const text of srcTexts) {
      if (text === content) continue
      if (new RegExp(`\\b${fn}\\b`).test(text)) refs++
    }
    if (refs === 0) deadWrappers.push({ file, fn })
  }
}

// Front calls NOT in OpenAPI snapshot
const frontOnly = []
const frontPaths = [
  ['GET', '/api/v1/protected/evaluations/{id}/ma-soumission'],
  ['GET', '/api/v1/public/matieres'],
  ['POST', '/api/v1/private/matieres'],
  ['GET', '/api/v1/public/payment/devises'],
  ['POST', '/api/v1/private/devises'],
  ['GET', '/v1/public/quiz/notion-types'],
  ['GET', '/api/v1/private/evaluations/{id}/submissions'],
  ['GET', '/api/v1/private/evaluations/{id}/submissions/{submissionId}'],
  ['POST', '/api/v1/private/evaluations/{id}/submissions/{submissionId}/notes'],
  ['GET', '/api/v1/public/teacher-types'],
  ['POST', '/api/v1/private/promotions'],
  ['POST', '/api/v1/private/etablissements'],
  ['GET', '/api/v1/protected/students/{id}'],
]
for (const [method, p] of frontPaths) {
  const inSpec = Object.entries(spec.paths ?? {}).some(([rp, ms]) => {
    const np = rp.replace('{version}', 'v1')
    return np === p && ms[method.toLowerCase()]
  })
  if (!inSpec) frontOnly.push({ method, path: p })
}

unused.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))

console.log(JSON.stringify({ used: used.length, unused, deadWrappers, frontOnlyNotInOpenApi: frontOnly }, null, 2))
