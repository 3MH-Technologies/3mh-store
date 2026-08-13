import { readFileSync } from 'node:fs'

const secret = process.env.ASSET_SECRET || process.env.VITE_ASSET_SECRET || ''
const SALT_DOMAIN = '3mh-store.salt.v1'
const data = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf-8'))

const enc = new TextEncoder()
const dec = new TextDecoder()

async function decrypt(product) {
  const salt = enc.encode(SALT_DOMAIN + product.id)
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(Buffer.from(product.access.iv, 'base64')) },
    key,
    Uint8Array.from(Buffer.from(product.access.payload, 'base64'))
  )
  return JSON.parse(dec.decode(plain))
}

for (const p of data.products) {
  const a = await decrypt(p)
  console.log(`${p.id} => [${a.label}] link=${a.link ? 'OK' : 'MISSING'} desc=${a.desc ? 'OK' : 'empty'}`)
}
console.log('round-trip OK for', data.products.length, 'products')