import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const PORT = Number(process.env.PORT || 7860)

const pick = (names) => {
  for (const name of names) {
    const value = process.env[name]
    if (value && value.trim()) return value.trim()
  }
  return undefined
}

function buildConfig() {
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

  return JSON.stringify(patch)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/config.json') {
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' })
    res.end(buildConfig())
    return
  }

  let filePath = resolve(join(DIST, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)))
  if (!filePath.startsWith(DIST + sep) && filePath !== DIST && !filePath.startsWith(DIST + '/')) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, 'index.html')
  }

  try {
    const body = readFileSync(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    res.end(body)
  } catch {
    res.writeHead(500)
    res.end('Server error')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`3MH STORE ready on http://0.0.0.0:${PORT}`)
})