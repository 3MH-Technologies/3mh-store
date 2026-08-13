import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const owner = process.env.GITHUB_OWNER || process.env.VITE_GITHUB_OWNER || ''
const repo = process.env.GITHUB_REPO || process.env.VITE_GITHUB_REPO || ''
const branch = process.env.GITHUB_BRANCH || process.env.VITE_GITHUB_BRANCH || 'main'
const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN || ''

if (!owner || !repo || !token) {
  console.error(
    '❌ المفاتيح ناقصة — حدد:\n' +
      '   GITHUB_OWNER / GITHUB_REPO / GITHUB_TOKEN (أو VITE_GITHUB_*)'
  )
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

function encodeBase64(text) {
  return Buffer.from(text, 'utf-8').toString('base64')
}

function decodeBase64(b64) {
  return Buffer.from(b64, 'base64').toString('utf-8')
}

async function api(method, url, body) {
  const res = await fetch(`https://api.github.com${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data?.message ?? data)}`)
  return data
}

const FILES = ['products', 'orders', 'settings']

async function main() {
  console.log(`▶ تهيئة قاعدة بيانات GitHub: ${owner}/${repo} (${branch})`)

  try {
    await api('GET', `/repos/${owner}/${repo}`)
  } catch {
    console.error(`❌ المستودع غير موجود أو المفتاح بلا صلاحية قراءة.`)
    process.exit(1)
  }

  for (const name of FILES) {
    const path = `data/${name}.json`
    const local = join(root, 'data', `${name}.json`)
    const content = readFileSync(local, 'utf-8')

    try {
      const existing = await api('GET', `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`)
      if (name === 'products' || name === 'settings') {
        await api('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
          message: `db-init: تحديث ${path} من البيانات المحلية`,
          content: encodeBase64(content),
          sha: existing.sha,
          branch,
        })
        console.log(`✓ ${path} — تم تحديثه من البيانات المحلية`)
      } else {
        console.log(`✓ ${path} — موجود مسبقاً، لم يتم تعديله`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('404')) {
        await api('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
          message: `db-init: إنشاء ${path}`,
          content: encodeBase64(content),
          branch,
        })
        console.log(`✓ ${path} — تم إنشاؤه`)
      } else {
        console.error(`✗ ${path} — ${msg}`)
      }
    }
  }

  console.log('\n✔ قاعدة البيانات جاهزة. الآن ضع نفس المفاتيح في .env وشغّل المتجر.')
}

main().catch((e) => {
  console.error('فشل التهيئة:', e instanceof Error ? e.message : e)
  process.exit(1)
})