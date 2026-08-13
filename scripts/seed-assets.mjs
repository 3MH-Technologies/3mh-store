import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const productsPath = join(root, 'data', 'products.json')
const secret = process.env.VITE_ASSET_SECRET || '3mh-store-assets-change-me-2026'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function deriveKey(salt) {
  const base = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

function fromBase64(b64) {
  return Uint8Array.from(Buffer.from(b64, 'base64'))
}

const SALT_DOMAIN = '3mh-store.salt.v1'

async function main() {
  const raw = JSON.parse(readFileSync(productsPath, 'utf-8'))
  let changed = false

  for (const product of raw.products) {
    if (product.access && product.access.payload && product.access.iv) continue
    if (!product.access || (product.access.link === undefined && product.access.desc === undefined)) {
      throw new Error(`المنتج ${product.id} لا يحتوي على access صالح للتشفير`)
    }

    const plain = JSON.stringify({
      label: product.access.label,
      desc: product.access.desc ?? '',
      link: product.access.link ?? '',
    })

    const salt = encoder.encode(SALT_DOMAIN + product.id)
    const key = await deriveKey(salt)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plain)
    )

    product.access.payload = toBase64(new Uint8Array(ciphertext))
    product.access.iv = toBase64(iv)
    delete product.access.link
    delete product.access.desc
  }

  raw.updatedAt = new Date().toISOString()
  writeFileSync(productsPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
  console.log(`تم تشفير أصول ${raw.products.length} منتج بنجاح ✓`)
  console.log('قم الآن بمراجعة data/products.json — روابط الوصول أصبحت مشفرة AES-GCM.')
}

main().catch((err) => {
  console.error('فشل تشفير الأصول:', err)
  process.exit(1)
})