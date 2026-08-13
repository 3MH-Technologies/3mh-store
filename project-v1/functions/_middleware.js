const TARGET_DOMAIN = "p01--host--8yklx28n25l4.code.run"
const TARGET_URL = `https://${TARGET_DOMAIN}`

const TEXT_PATTERNS = [
  "text/", "application/json", "application/javascript",
  "application/x-javascript", "application/xml", "application/ld+json",
  "application/xhtml+xml"
]

const STRIP_REQUEST_HEADERS = [
  "cf-connecting-ip", "x-real-ip", "x-forwarded-for"
]

const STRIP_RESPONSE_HEADERS = [
  "server", "x-powered-by", "cf-cache-status", "cf-ray",
  "report-to", "nel", "via", "alt-svc", "link"
]

const SECURITY_HEADERS = {
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
}

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD", "OPTIONS"])

const TELEGRAM_BASE = "https://api.telegram.org"
const TELEGRAM_PREFIX = "/telegram/"

export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  if (url.pathname.startsWith(TELEGRAM_PREFIX)) {
    return proxyTelegram(request, url)
  }

  return proxyTarget(request, url)
}

async function proxyTelegram(request, url) {
  const tgPath = url.pathname.replace(TELEGRAM_PREFIX, "")
  const tgUrl = `${TELEGRAM_BASE}${tgPath}${url.search}`
  const headers = cleanHeaders(request.headers, STRIP_REQUEST_HEADERS)
  headers.delete("host")

  return fetch(tgUrl, { method: request.method, headers, body: request.body })
}

async function proxyTarget(request, url) {
  const targetUrl = TARGET_URL + url.pathname + url.search
  const reqHeaders = cleanHeaders(request.headers, STRIP_REQUEST_HEADERS)

  reqHeaders.set("Host", TARGET_DOMAIN)
  reqHeaders.set("X-Forwarded-Host", url.host)

  const upstream = await fetch(new Request(targetUrl, {
    method: request.method,
    headers: reqHeaders,
    body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : request.body,
    redirect: "manual"
  }))

  return sanitizeResponse(upstream, url)
}

async function sanitizeResponse(upstream, url) {
  const headers = cleanHeaders(upstream.headers, STRIP_RESPONSE_HEADERS)

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value)
  }

  sanitizeHeaders(headers, url)

  const body = await tryReadBody(upstream, headers)
  if (body !== null) {
    return new Response(
      sanitizeText(body, url),
      { status: upstream.status, headers }
    )
  }

  return new Response(upstream.body, { status: upstream.status, headers })
}

function sanitizeHeaders(headers, url) {
  for (const [key, value] of headers.entries()) {
    let cleaned = value
    if (cleaned.includes(TARGET_URL)) {
      cleaned = cleaned.replaceAll(TARGET_URL, url.origin)
    }
    if (cleaned.includes(TARGET_DOMAIN)) {
      cleaned = cleaned.replaceAll(TARGET_DOMAIN, url.host)
    }
    if (cleaned !== value) {
      headers.set(key, cleaned)
    }
  }

  const location = headers.get("location")
  if (location) {
    headers.set("location", sanitizeLocation(location, url))
  }
}

function sanitizeLocation(location, url) {
  return location
    .replace(new RegExp(`https?://${escapeRegex(TARGET_DOMAIN)}`, "gi"), url.origin)
    .replace(new RegExp(escapeRegex(TARGET_DOMAIN), "gi"), url.host)
}

function sanitizeText(text, url) {
  return text
    .replaceAll(TARGET_URL, url.origin)
    .replaceAll(TARGET_DOMAIN, url.host)
}

async function tryReadBody(response, headers) {
  const type = headers.get("content-type") ?? ""
  const isText = TEXT_PATTERNS.some(p => type.includes(p))
  return isText ? response.text() : null
}

function cleanHeaders(source, removeList) {
  const headers = new Headers(source)
  for (const h of removeList) {
    headers.delete(h)
  }
  return headers
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
