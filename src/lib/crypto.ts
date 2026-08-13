import { CONFIG } from '../config'
import type { AccessInfo } from '../types'

const enc = new TextEncoder()
const dec = new TextDecoder()

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(CONFIG.assets.secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptPayload(
  payload: string,
  salt: string
): Promise<AccessInfo> {
  const key = await deriveKey(enc.encode(salt))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(payload)
  )
  return { label: '', payload: toBase64(new Uint8Array(ciphertext)), iv: toBase64(iv) }
}

export async function decryptAccess(
  access: AccessInfo,
  productId: string
): Promise<{ label: string; desc: string; link: string }> {
  const salt = enc.encode(CONFIG.assets.saltDomain + productId)
  const key = await deriveKey(salt)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(access.iv) },
      key,
      fromBase64(access.payload)
    )
    const parsed = JSON.parse(dec.decode(plain)) as {
      label: string
      desc?: string
      link?: string
    }
    return {
      label: parsed.label ?? 'الملف الرقمي',
      desc: parsed.desc ?? '',
      link: parsed.link ?? '',
    }
  } catch {
    return { label: access.label || 'الملف الرقمي', desc: '', link: '' }
  }
}