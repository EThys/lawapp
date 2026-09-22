import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../api-docs.json'), 'utf8'))

const keys = [
  '/api/{version}/protected/reset/password',
  '/api/{version}/protected/recovery/user/{id}',
  '/api/{version}/protected/change/password',
  '/api/{version}/protected/certification/{userId}',
  '/auth/register',
  '/auth/login',
  '/api/{version}/public/otp/validate',
  '/api/{version}/public/otp/generate',
  '/api/{version}/protected/token/refresh',
  '/api/auth/google',
  '/api/{version}/protected/users/delete/user',
]

const out = []
for (const k of keys) {
  const p = docs.paths[k]
  if (!p) {
    out.push(`MISSING: ${k}`)
    continue
  }
  out.push(`\n=== ${k} ===`)
  for (const [method, op] of Object.entries(p)) {
    out.push(`-- ${method.toUpperCase()} ${op.summary || op.operationId || ''}`)
    if (op.requestBody) out.push(JSON.stringify(op.requestBody, null, 2))
    if (op.parameters) out.push('params: ' + JSON.stringify(op.parameters, null, 2))
  }
}

const schemas = docs.components?.schemas ?? {}
for (const name of Object.keys(schemas).filter((n) => /password|otp|reset|recovery|certif|delete|token|register|login/i.test(n))) {
  out.push(`\n=== schema ${name} ===\n${JSON.stringify(schemas[name], null, 2)}`)
}

fs.writeFileSync(path.join(__dirname, 'auth-openapi.txt'), out.join('\n'))
console.log('done')
