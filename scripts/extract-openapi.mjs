import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '../api-docs.json'), 'utf8'))
const schemas = docs.components?.schemas ?? {}
const out = []
for (const k of ['EvaluationRequest', 'QuestionOptionRequest', 'QuestionOptionRequestDAO', 'QuestionRequest', 'QuestionOuverteRequestDAO', 'QuestionCaseStudyRequestDAO']) {
  out.push(`=== ${k} ===\n${JSON.stringify(schemas[k], null, 2)}`)
}
const post = docs.paths['/api/{version}/private/evaluations']?.post
out.push(`=== POST private/evaluations ===\n${JSON.stringify(post?.requestBody, null, 2)}`)
fs.writeFileSync(path.join(__dirname, 'openapi-eval.txt'), out.join('\n\n'))
console.log('written openapi-eval.txt')
