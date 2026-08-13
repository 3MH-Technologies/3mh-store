import { CONFIG } from '../config'

interface RuntimePatch {
  github?: Partial<typeof CONFIG.github>
  admin?: { pin?: string }
  assets?: { secret?: string }
}

let ready: Promise<void> | null = null

function applyPatch(patch: RuntimePatch) {
  if (patch.github) {
    Object.assign(CONFIG.github, patch.github)
  }
  if (patch.admin && typeof patch.admin.pin === 'string' && patch.admin.pin) {
    CONFIG.admin.pin = patch.admin.pin
  }
  if (patch.assets && typeof patch.assets.secret === 'string' && patch.assets.secret) {
    CONFIG.assets.secret = patch.assets.secret
  }
}

/**
 * يحمّل إعدادات التشغيل من /config.json الذي يولّده حاوي Docker من متغيرات
 * البيئة وقت التشغيل. يتيح وضع مفاتيح GitHub و PIN و مفتاح الأصول بعد البناء
 * مباشرة دون إعادة بناء الصورة (مثلاً من Hugging Face Secrets).
 */
export function loadRuntimeConfig(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      try {
        const base = import.meta.env.BASE_URL ?? '/'
        const res = await fetch(new URL('config.json', base).href, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const patch = (await res.json()) as RuntimePatch
        applyPatch(patch)
      } catch {
        // لا يوجد config.json — نكمل بقيم البناء المضمّنة
      }
    })()
  }
  return ready
}

export function whenConfigReady(): Promise<void> {
  return loadRuntimeConfig()
}