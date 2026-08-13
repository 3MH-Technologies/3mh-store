const fs = require('node:fs')
const path = require('node:path')

const env = process.env

const pick = (names) => {
  for (const name of names) {
    const value = env[name]
    if (value && value.trim()) return value.trim()
  }
  return undefined
}

const patch = {}

const github = {}
const owner = pick(['VITE_GITHUB_OWNER', 'GITHUB_OWNER'])
if (owner) github.owner = owner
const repo = pick(['VITE_GITHUB_REPO', 'GITHUB_REPO'])
if (repo) github.repo = repo
const branch = pick(['VITE_GITHUB_BRANCH', 'GITHUB_BRANCH'])
if (branch) github.branch = branch
const token = pick(['VITE_GITHUB_TOKEN', 'GITHUB_TOKEN'])
if (token) github.token = token
if (Object.keys(github).length > 0) patch.github = github

const pin = pick(['VITE_ADMIN_PIN', 'ADMIN_PIN'])
if (pin) patch.admin = { pin }

const secret = pick(['VITE_ASSET_SECRET', 'ASSET_SECRET'])
if (secret) patch.assets = { secret }

const outDir = path.join(__dirname, '..', 'dist')
const target = path.join(outDir, 'config.json')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(target, JSON.stringify(patch), 'utf-8')

const keys = Object.keys(patch)
console.log(
  `config.json ${keys.length > 0 ? `مولّد: ${keys.join(', ')}` : 'فارغ — أضف متغيرات البيئة'}`
)