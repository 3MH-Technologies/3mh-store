import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi } from '../server/api.mjs'

const DIST = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const PORT = Number(process.env.PORT || 7860)

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

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 5 * 1024 * 1024) {
        reject(new Error('BODY_TOO_LARGE'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'))
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname.startsWith('/api/')) {
    try {
      const body = await readBody(req)
      const forwarded = req.headers['x-forwarded-for']
      const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
        ?.split(',')[0]
        .trim() || req.socket.remoteAddress || 'local'
      const result = await handleApi({
        method: req.method,
        pathname: url.pathname,
        search: url.searchParams,
        headers: req.headers,
        body,
        env: process.env,
        ip,
        origin: url.origin,
      })
      if (result.binaryBase64) {
        res.writeHead(result.status, {
          'Content-Type': result.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName || 'download')}"`,
          'Cache-Control': result.publicCache ? 'public, max-age=86400' : 'no-store',
          ...SECURITY_HEADERS,
        })
        res.end(Buffer.from(result.binaryBase64, 'base64'))
        return
      }
      res.writeHead(result.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...SECURITY_HEADERS,
      })
      res.end(JSON.stringify(result.body))
      return
    } catch (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        ...SECURITY_HEADERS,
      })
      res.end(JSON.stringify({ error: { code: 'INTERNAL', message: 'خطأ داخلي في الخادم' } }))
      return
    }
  }

  // static SPA
  let filePath = resolve(
    join(
      DIST,
      url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)
    )
  )
  if (
    !filePath.startsWith(DIST + sep) &&
    filePath !== DIST &&
    !filePath.startsWith(DIST + '/')
  ) {
    res.writeHead(403, SECURITY_HEADERS)
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
      'Cache-Control': url.pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      ...SECURITY_HEADERS,
    })
    res.end(body)
  } catch {
    res.writeHead(500, SECURITY_HEADERS)
    res.end('Server error')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`3MH STORE ready on http://0.0.0.0:${PORT}`)
})