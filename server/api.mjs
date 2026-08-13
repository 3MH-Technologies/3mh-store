// 3MH STORE — server-side API (shared between Node server and Cloudflare Worker)
// All secrets (GitHub token, admin PIN, asset secret) live here, never in the bundle.

const PRODUCTS_PATH = 'data/products.json'
const ORDERS_PATH = 'data/orders.json'
const SETTINGS_PATH = 'data/settings.json'
const SALT_DOMAIN = '3mh-store.salt.v1'

const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const encoder = new TextEncoder()

function pick(env, names) {
  for (const name of names) {
    const value = env[name]
    if (value && value.trim()) return value.trim()
  }
  return undefined
}

function makeEnv(env) {
  return {
    githubOwner: pick(env, ['GITHUB_OWNER', 'VITE_GITHUB_OWNER']) || '',
    githubRepo: pick(env, ['GITHUB_REPO', 'VITE_GITHUB_REPO']) || '',
    githubBranch: pick(env, ['GITHUB_BRANCH', 'VITE_GITHUB_BRANCH']) || 'main',
    githubToken: pick(env, ['GITHUB_TOKEN', 'VITE_GITHUB_TOKEN']) || '',
    adminPin: pick(env, ['ADMIN_PIN', 'VITE_ADMIN_PIN']) || '',
    assetSecret:
      pick(env, ['ASSET_SECRET', 'VITE_ASSET_SECRET']) || '',
    apiSecret:
      pick(env, ['API_SECRET', 'VITE_API_SECRET']) || '3mh-store-api-change-me',
  }
}

function isConfigured(cfg) {
  return Boolean(cfg.githubToken && cfg.githubOwner && cfg.githubRepo)
}

// ---------- in-memory cache + rate limiting ----------

let catalogCache = { ts: 0, data: null }

const rateBuckets = new Map()

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function isRateLimited(bucketKey, max, windowMs) {
  const now = Date.now()
  const bucket = rateBuckets.get(bucketKey)
  if (!bucket || bucket.ts + windowMs < now) {
    rateBuckets.set(bucketKey, { ts: now, count: 1 })
    return false
  }
  bucket.count += 1
  if (bucket.count > max) return true
  return false
}

// ---------- GitHub ----------

async function ghRequest(cfg, url, options = {}) {
  const res = await fetch(`https://api.github.com${url}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${cfg.githubToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': '3mh-store-server',
      ...(options.method && options.method !== 'GET' && options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body: options.body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GITHUB_${res.status}: ${text.slice(0, 160)}`)
  }
  return res
}

async function readGitFile(cfg, path) {
  const res = await ghRequest(cfg, `/repos/${cfg.githubOwner}/${cfg.githubRepo}/contents/${path}?ref=${encodeURIComponent(cfg.githubBranch)}`)
  const data = await res.json()
  if (typeof data === 'string' || Array.isArray(data) || !data.content) {
    throw new Error('UNEXPECTED_FILE_STRUCTURE')
  }
  const binary = atob(data.content)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  const text = new TextDecoder('utf-8').decode(bytes)
  return { sha: data.sha || '', text }
}

async function writeGitFile(cfg, path, text) {
  const { sha } = await readGitFile(cfg, path)
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const res = await ghRequest(cfg, `/repos/${cfg.githubOwner}/${cfg.githubRepo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `store-db: تحديث ${path}`,
      content: btoa(binary),
      sha,
      branch: cfg.githubBranch,
    }),
  })
  await res.json()
}

let writeChains = {}

async function withWriteLock(cfg, path, fn) {
  const key = `${cfg.githubOwner}/${cfg.githubRepo}/${path}`
  const prev = writeChains[key] || Promise.resolve()
  let release
  writeChains[key] = new Promise((resolve) => {
    release = resolve
  })
  await prev
  try {
    return await fn()
  } finally {
    release()
  }
}

async function loadCatalog(cfg, force = false) {
  if (!force && catalogCache.data && Date.now() - catalogCache.ts < 30000) {
    return catalogCache.data
  }
  const productsRes = await readGitFile(cfg, PRODUCTS_PATH)
  let settingsFile = { version: 1, settings: null }
  try {
    settingsFile = JSON.parse((await readGitFile(cfg, SETTINGS_PATH)).text)
  } catch {
    // keep defaults
  }
  const products = JSON.parse(productsRes.text)
  const data = { products, settings: settingsFile.settings }
  catalogCache = { ts: Date.now(), data }
  return data
}

function stampFile(text) {
  try {
    const parsed = JSON.parse(text)
    parsed.updatedAt = new Date().toISOString()
    return JSON.stringify(parsed, null, 2)
  } catch {
    return text
  }
}

// ---------- crypto (WebCrypto everywhere) ----------

function toB64(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromB64(b64) {
  const binary = atob(b64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function deriveKey(secret, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptPayload(secret, plainText, salt) {
  const key = await deriveKey(secret, encoder.encode(salt))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  )
  return {
    label: '',
    payload: toB64(new Uint8Array(ciphertext)),
    iv: toB64(iv),
  }
}

async function decryptPayload(secret, payload, iv, salt) {
  const key = await deriveKey(secret, encoder.encode(salt))
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(iv) },
    key,
    fromB64(payload)
  )
  return new TextDecoder('utf-8').decode(plain)
}

async function signToken(cfg, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(cfg.apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const body = b64url(JSON.stringify(payload))
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  )
  return `${body}.${b64url(new Uint8Array(sig)).replace(/=+$/, '')}`
}

function b64url(bytes) {
  const data =
    typeof bytes === 'string'
      ? encoder.encode(bytes)
      : bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes)
  return toB64(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  return fromB64(padded + '='.repeat((4 - (padded.length % 4)) % 4))
}

async function verifyToken(cfg, token) {
  const parts = token.split('.')
  const body = parts[0]
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(cfg.apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlDecode(parts[1]),
    encoder.encode(body)
  )
  if (!valid) return false
  let payload
  try {
    payload = JSON.parse(new TextDecoder('utf-8').decode(b64urlDecode(body)))
  } catch {
    return false
  }
  if (!payload.exp || payload.exp < Date.now()) return false
  return true
}

function timingSafeEqual(a, b) {
  const ba = encoder.encode(a)
  const bb = encoder.encode(b)
  if (ba.length !== bb.length) {
    // normalize cost; comparison result still differs
    return crypto.subtle
      .digest('SHA-256', ba)
      .then(() => false)
  }
  return crypto.subtle.digest('SHA-256', ba).then((h1) =>
    crypto.subtle.digest('SHA-256', bb).then((h2) => {
      const u1 = new Uint8Array(h1)
      const u2 = new Uint8Array(h2)
      let diff = u1.length ^ u2.length
      for (let i = 0; i < Math.min(u1.length, u2.length); i++) {
        diff |= u1[i] ^ u2[i]
      }
      return diff === 0
    })
  )
}

function safeId() {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let id = ''
  for (const b of bytes) id += charset[b % charset.length]
  return `ORD-${id.slice(0, 4)}-${id.slice(4)}`
}

function cleanText(value, max) {
  const v = String(value ?? '')
  return v.trim().slice(0, max)
}

function headerValue(headers, name) {
  if (!headers) return ''
  const value = typeof headers.get === 'function' ? headers.get(name) : headers[name]
  return String(value ?? '')
}

// ---------- request handling ----------

function internalError(message) {
  return { status: 500, body: { error: { code: 'INTERNAL', message } } }
}

function badRequest(code, message) {
  return { status: 400, body: { error: { code, message } } }
}

function unauthorized(code = 'UNAUTHORIZED', message = 'غير مصرح') {
  return { status: 401, body: { error: { code, message } } }
}

function notFound(code = 'NOT_FOUND', message = 'غير موجود') {
  return { status: 404, body: { error: { code, message } } }
}

function ok(data, status = 200) {
  return { status, body: data }
}

export async function handleApi({ method, pathname, search, headers, body, env, ip }) {
  const cfg = makeEnv(env)
  if (!isConfigured(cfg)) {
    return internalError('قاعدة البيانات غير مهيأة على الخادم')
  }

  const path = pathname.replace(/^\/api\//, '')
  const segments = path.split('/').filter(Boolean)
  const base = segments[0]

  try {
    // GET /api/catalog
    if (method === 'GET' && base === 'catalog') {
      const data = await loadCatalog(cfg)
      return ok(data)
    }

    // GET /api/orders/:id
    if (method === 'GET' && base === 'orders' && segments.length === 2) {
      const orderId = cleanText(segments[1], 40)
      const file = JSON.parse((await readGitFile(cfg, ORDERS_PATH)).text)
      const order = file.orders.find((o) => o.id === orderId) ?? null
      return ok({ order })
    }

    // POST /api/orders
    if (method === 'POST' && base === 'orders' && segments.length === 1) {
      if (isRateLimited(`order:${ip}`, 5, 15 * 60 * 1000)) {
        return { status: 429, body: { error: { code: 'RATE_LIMIT', message: 'طلبات كثيرة من هذا الجهاز، انتظر قليلاً ثم أعد المحاولة' } } }
      }
      let input
      try {
        input = typeof body === 'string' ? JSON.parse(body) : body
      } catch {
        return badRequest('BAD_JSON', 'بيانات الطلب غير صالحة')
      }
      if (!input || typeof input !== 'object') {
        return badRequest('VALIDATION', 'بيانات الطلب غير صالحة')
      }
      const honey = cleanText(input.honeypot, 100)
      if (honey) {
        return ok({ order: { id: safeId(), status: 'pending' } })
      }
      const { products, settings } = await loadCatalog(cfg)
      const catalogs = Array.isArray(products.products) ? products.products : []
      const walletMethods = Array.isArray(settings?.wallets)
        ? settings.wallets.map((w) => w.method)
        : []
      const itemsIn = Array.isArray(input.items) ? input.items.slice(0, 20) : []
      if (itemsIn.length < 1) {
        return badRequest('VALIDATION', 'السلة فارغة — لا يمكن إرسال الطلب')
      }
      const items = []
      for (const rawItem of itemsIn) {
        const productId = cleanText(rawItem?.productId, 60)
        const qty = Number(rawItem?.qty)
        const product = catalogs.find((p) => p.id === productId)
        if (!product) {
          return badRequest('VALIDATION', 'أحد المنتجات لم يعد متوفراً — حدّث السلة')
        }
        if (!Number.isInteger(qty) || qty < 1 || qty > 10) continue
        items.push({
          productId,
          title: cleanText(product.name, 60),
          price: Math.round(Number(product.price || 0) * 100) / 100,
          qty,
        })
      }
      if (items.length === 0) {
        return badRequest('VALIDATION', 'لا توجد منتجات صالحة في السلة')
      }
      let subtotal = 0
      let discount = 0
      for (const item of items) {
        subtotal += item.price * item.qty
        const orig = Number(
          catalogs.find((p) => p.id === item.productId)?.originalPrice || 0
        )
        discount += Math.max(0, orig - item.price) * item.qty
      }
      subtotal = Math.round(subtotal * 100) / 100
      discount = Math.round(discount * 100) / 100
      const total = subtotal

      const name = cleanText(input.customer?.name, 60)
      const email = cleanText(input.customer?.email, 100).toLowerCase()
      const telegram = cleanText(input.customer?.telegram, 100)
      const phone = cleanText(input.customer?.phone, 100)
      if (name.length < 3) return badRequest('VALIDATION', 'أدخل الاسم الكامل')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return badRequest('VALIDATION', 'أدخل بريداً إلكترونياً صحيحاً')
      }
      if (!telegram && !phone) {
        return badRequest('VALIDATION', 'أدخل تيليجرام أو رقم هاتف للتواصل')
      }
      const methodName = cleanText(input.paymentMethod, 20)
      if (!walletMethods.includes(methodName)) {
        return badRequest('VALIDATION', 'طريقة الدفع غير متاحة')
      }
      const txHash = cleanText(input.txHash, 120)
      if (txHash.length < 6) {
        return badRequest('VALIDATION', 'أدخل معرف العملية (TxID) — لا يقل عن 6 أحرف')
      }
      let receiptDataUrl = null
      if (input.receiptDataUrl) {
        receiptDataUrl = String(input.receiptDataUrl)
        if (receiptDataUrl.length > 3600000) {
          return badRequest('VALIDATION', 'مرفق الإثبات كبير جداً')
        }
        receiptDataUrl = receiptDataUrl.slice(0, 3600000)
      }
      const notes = cleanText(input.notes, 300)

      const order = {
        id: safeId(),
        createdAt: new Date().toISOString(),
        customer: { name, email, telegram, phone },
        items,
        subtotal,
        discount,
        total,
        currency: 'USD',
        deliveryType:
          cleanText(settings?.deliveryNote, 80) || 'تسليم فوري رقمي بعد التحقق',
        payment: { method: methodName, txHash, receiptDataUrl },
        status: 'pending',
        verifiedAt: null,
        notes,
      }

      const saved = await withWriteLock(cfg, ORDERS_PATH, async () => {
        let file
        try {
          file = JSON.parse((await readGitFile(cfg, ORDERS_PATH)).text)
        } catch {
          file = { version: 1, updatedAt: new Date().toISOString(), orders: [] }
        }
        if (!Array.isArray(file.orders)) file.orders = []
        file.orders.push(order)
        await writeGitFile(cfg, ORDERS_PATH, stampFile(JSON.stringify(file)))
        return order
      })
      return ok({ order: saved }, 201)
    }

    // POST /api/admin/login
    if (method === 'POST' && base === 'admin' && segments[1] === 'login') {
      let input = {}
      try {
        input = typeof body === 'string' ? JSON.parse(body) : body || {}
      } catch {
        // fall through
      }
      const pin = cleanText(input.pin, 32)
      if (!cfg.adminPin) return unauthorized('NO_PIN', 'كلمة مرور المشرف غير مضبوطة على الخادم')
      const same = await timingSafeEqual(pin, cfg.adminPin)
      if (!same) return unauthorized('BAD_PIN', 'كلمة المرور غير صحيحة')
      const token = await signToken(cfg, {
        sub: 'admin',
        iat: Date.now(),
        exp: Date.now() + 8 * 60 * 60 * 1000,
      })
      return ok({ token })
    }

    const isAdminRequest =
      base === 'admin' && segments.length >= 2 && segments[1] !== 'login'

    if (isAdminRequest) {
      const auth = headerValue(headers, 'authorization')
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
      const authorized = token ? await verifyToken(cfg, token) : false
      if (!authorized) return unauthorized()

      // GET /api/admin/orders
      if (segments[1] === 'orders' && segments.length === 2) {
        const file = JSON.parse((await readGitFile(cfg, ORDERS_PATH)).text)
        return ok({ orders: file.orders || [] })
      }

      // PATCH /api/admin/orders/:id
      if (segments[1] === 'orders' && segments.length === 3 && method === 'PATCH') {
        let input = {}
        try {
          input = typeof body === 'string' ? JSON.parse(body) : body || {}
        } catch {
          // fall through
        }
        const status = input.status
        if (!['verified', 'rejected', 'pending'].includes(status)) {
          return badRequest('VALIDATION', 'حالة غير صالحة')
        }
        const orderId = cleanText(segments[2], 40)
        const updated = await withWriteLock(cfg, ORDERS_PATH, async () => {
          const file = JSON.parse((await readGitFile(cfg, ORDERS_PATH)).text)
          const orders = Array.isArray(file.orders) ? file.orders : []
          const index = orders.findIndex((o) => o.id === orderId)
          if (index === -1) throw new Error('ORDER_NOT_FOUND')
          orders[index].status = status
          if (status === 'verified') orders[index].verifiedAt = new Date().toISOString()
          if (status !== 'verified') orders[index].verifiedAt = null
          const notes = cleanText(input.notes, 300)
          if (input.notes !== undefined) orders[index].notes = notes
          await writeGitFile(cfg, ORDERS_PATH, stampFile(JSON.stringify(file)))
          return orders[index]
        }).catch((e) => {
          if (e instanceof Error && e.message.includes('ORDER_NOT_FOUND')) return null
          throw e
        })
        if (!updated) return notFound('ORDER_NOT_FOUND', 'الطلب غير موجود')
        return ok({ order: updated })
      }

      // POST /api/admin/products
      if (segments[1] === 'products' && segments.length === 2 && method === 'POST') {
        let input = {}
        try {
          input = typeof body === 'string' ? JSON.parse(body) : body || {}
        } catch {
          return badRequest('BAD_JSON', 'بيانات غير صالحة')
        }
        const list = Array.isArray(input.products) ? input.products.slice(0, 200) : []
        if (!cfg.assetSecret) {
          return internalError('مفتاح الأصول غير مضبوط على الخادم')
        }
        const normalized = []
        for (const raw of list) {
          const id = cleanText(raw?.id, 60)
          if (!id) continue
          const name = cleanText(raw?.name, 60)
          if (!name) continue
          const price = Math.max(0, Math.round(Number(raw?.price || 0) * 100) / 100)
          let accessPin = raw?.access
          if (accessPin && typeof accessPin === 'object') {
            if (
              accessPin.iv &&
              accessPin.payload &&
              !String(accessPin.payload).startsWith('http')
            ) {
              accessPin = {
                label: cleanText(accessPin.label, 60) || 'الملف الرقمي',
                payload: String(accessPin.payload),
                iv: String(accessPin.iv),
              }
            } else {
              const plainText =
                typeof accessPin.payload === 'string'
                  ? accessPin.payload.trim()
                  : ''
              accessPin = {
                label: cleanText(accessPin.label, 60) || 'الملف الرقمي',
                payload: '',
                iv: '',
              }
              if (plainText) {
                const encrypted = await encryptPayload(
                  cfg.assetSecret,
                  JSON.stringify({ label: accessPin.label, desc: '', link: plainText }),
                  `${SALT_DOMAIN}${id}`
                )
                accessPin = { ...encrypted, label: accessPin.label }
              }
            }
          } else {
            accessPin = { label: '', payload: '', iv: '' }
          }
          const existing =
            Array.isArray(catalogCache.data?.products?.products)
              ? catalogCache.data.products.products.find((p) => p.id === id)
              : null
          const originalPrice =
            Math.max(0, Math.round(Number(raw?.originalPrice || 0) * 100) / 100) ||
            price
          normalized.push({
            id,
            name,
            category: cleanText(raw?.category, 40),
            price,
            originalPrice,
            tag: cleanText(raw?.tag, 40),
            icon: cleanText(raw?.icon, 30) || 'Bot',
            gradient: cleanText(raw?.gradient, 60) || 'from-cyan-500 to-blue-600',
            description: cleanText(raw?.description, 400),
            features: Array.isArray(raw?.features)
              ? raw.features.map((f) => cleanText(f, 100)).filter(Boolean).slice(0, 20)
              : [],
            specs: Array.isArray(raw?.specs)
              ? raw.specs
                  .map((s) => ({
                    label: cleanText(s?.label, 40),
                    value: cleanText(s?.value, 120),
                  }))
                  .filter((s) => s.label && s.value)
                  .slice(0, 20)
              : [],
            sales: Math.max(0, Number(raw?.sales || 0) | 0),
            rating: Math.min(5, Math.max(0, Number(raw?.rating || 5))),
            access: accessPin,
          })
        }
        const updated = await withWriteLock(cfg, PRODUCTS_PATH, async () => {
          const file = JSON.parse((await readGitFile(cfg, PRODUCTS_PATH)).text)
          file.products = normalized
          file.updatedAt = new Date().toISOString()
          await writeGitFile(cfg, PRODUCTS_PATH, stampFile(JSON.stringify(file)))
        })
        catalogCache = { ts: 0, data: null }
        return ok({ ok: true })
      }

      // POST /api/admin/settings
      if (segments[1] === 'settings' && segments.length === 2 && method === 'POST') {
        let input = {}
        try {
          input = typeof body === 'string' ? JSON.parse(body) : body || {}
        } catch {
          return badRequest('BAD_JSON', 'بيانات غير صالحة')
        }
        const s = input.settings
        if (!s || typeof s !== 'object') {
          return badRequest('VALIDATION', 'الإعدادات غير صالحة')
        }
        const settings = {
          appName: cleanText(s.appName, 60),
          appNameAr: cleanText(s.appNameAr, 60),
          companyName: cleanText(s.companyName, 60),
          companyTagline: cleanText(s.companyTagline, 200),
          brandUrl: cleanText(s.brandUrl, 200),
          supportEmail: cleanText(s.supportEmail, 100),
          supportTelegramUsername: cleanText(s.supportTelegramUsername, 40).replace(/[^a-zA-Z0-9_]/g, ''),
          supportTelegramUrl: '',
          usdToSar: Number(s.usdToSar) > 0 ? Number(s.usdToSar) : 3.75,
          categories: Array.isArray(s.categories)
            ? s.categories
                .map((c) => ({
                  id: cleanText(c?.id, 40).toLowerCase().replace(/\s+/g, '-'),
                  ar: cleanText(c?.ar, 40),
                  en: cleanText(c?.en, 40),
                }))
                .filter((c) => c.id && c.ar)
                .slice(0, 30)
            : [],
          hero: {
            badge: cleanText(s.hero?.badge, 60),
            titleHighlight: cleanText(s.hero?.titleHighlight, 60),
            subtitle: cleanText(s.hero?.subtitle, 300),
            stats: Array.isArray(s.hero?.stats)
              ? s.hero.stats
                  .map((st) => ({
                    label: cleanText(st?.label, 40),
                    value: cleanText(st?.value, 20),
                    prefix: cleanText(st?.prefix, 10),
                    suffix: cleanText(st?.suffix, 10),
                    decimals: Number(st?.decimals) || 0,
                    animate: Boolean(st?.animate),
                  }))
                  .filter((st) => st.label && st.value)
                  .slice(0, 8)
              : [],
            trustBadges: Array.isArray(s.hero?.trustBadges)
              ? s.hero.trustBadges.map((b) => cleanText(b, 40)).filter(Boolean).slice(0, 8)
              : [],
          },
          trust: Array.isArray(s.trust)
            ? s.trust
                .map((t) => ({
                  icon: cleanText(t?.icon, 30),
                  title: cleanText(t?.title, 40),
                  desc: cleanText(t?.desc, 120),
                }))
                .filter((t) => t.title)
                .slice(0, 8)
            : [],
          wallets: Array.isArray(s.wallets)
            ? s.wallets
                .map((w) => ({
                  method: cleanText(w?.method, 20),
                  name: cleanText(w?.name, 40),
                  short: cleanText(w?.short, 20),
                  address: cleanText(w?.address, 200),
                  kind: w?.kind === 'phone' ? 'phone' : 'address',
                  instruction: cleanText(w?.instruction, 300),
                  note: cleanText(w?.note, 120),
                }))
                .filter((w) => w.address)
                .slice(0, 12)
            : [],
          paymentMethodLabels: {},
          deliveryNote: cleanText(s.deliveryNote, 80) || 'تسليم فوري رقمي بعد التحقق',
        }
        settings.supportTelegramUrl = settings.supportTelegramUsername
          ? `https://t.me/${settings.supportTelegramUsername}`
          : ''
        if (s.paymentMethodLabels && typeof s.paymentMethodLabels === 'object') {
          for (const [key, label] of Object.entries(s.paymentMethodLabels)) {
            settings.paymentMethodLabels[key] = cleanText(label, 40) || key
          }
        }
        const updated = await withWriteLock(cfg, SETTINGS_PATH, async () => {
          const file = JSON.parse((await readGitFile(cfg, SETTINGS_PATH)).text)
          file.settings = settings
          file.updatedAt = new Date().toISOString()
          await writeGitFile(cfg, SETTINGS_PATH, stampFile(JSON.stringify(file)))
        })
        catalogCache = { ts: 0, data: null }
        return ok({ ok: true })
      }

      return notFound()
    }

    // GET /api/access?productId=&orderId=
    if (method === 'GET' && base === 'access') {
      if (isRateLimited(`access:${ip}`, 60, 60 * 1000)) {
        return { status: 429, body: { error: { code: 'RATE_LIMIT', message: 'محاولات كثيرة — حاول لاحقاً' } } }
      }
      const orderId = cleanText(search.get('orderId'), 40)
      const productId = cleanText(search.get('productId'), 60)
      if (!orderId || !productId) return badRequest('VALIDATION', 'بيانات غير مكتملة')
      let file
      try {
        file = JSON.parse((await readGitFile(cfg, ORDERS_PATH)).text)
      } catch {
        return notFound('ORDER_NOT_FOUND', 'الطلب غير موجود')
      }
      const order = (file.orders || []).find((o) => o.id === orderId)
      if (!order) return notFound('ORDER_NOT_FOUND', 'الطلب غير موجود')
      if (order.status !== 'verified') {
        return unauthorized('NOT_VERIFIED', 'لم يتم التحقق من الدفع بعد')
      }
      const hasItem = (order.items || []).some((i) => i.productId === productId)
      if (!hasItem) return notFound('ITEM_NOT_FOUND', 'المنتج غير موجود في الطلب')
      const { products } = await loadCatalog(cfg)
      const product = (products?.products || []).find((p) => p.id === productId)
      if (!product || !product.access?.payload || !product.access?.iv) {
        return notFound('NO_ASSET', 'لا توجد أصول لهذا المنتج')
      }
      if (!cfg.assetSecret) return internalError('مفتاح الأصول غير مضبوط على الخادم')
      let asset
      try {
        const plain = await decryptPayload(
          cfg.assetSecret,
          product.access.payload,
          product.access.iv,
          `${SALT_DOMAIN}${productId}`
        )
        const parsed = JSON.parse(plain)
        asset = {
          label: parsed.label || product.access.label || 'الملف الرقمي',
          desc: parsed.desc || '',
          link: parsed.link || '',
        }
      } catch {
        asset = { label: product.access.label || 'الملف الرقمي', desc: '', link: '' }
      }
      return ok({ asset })
    }

    return notFound('NOT_FOUND', 'الواجهة غير موجودة')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNEXPECTED_FILE_STRUCTURE')) {
      return internalError('بنية البيانات غير متوقعة')
    }
    return internalError('تعذر الاتصال بقاعدة البيانات')
  }
}