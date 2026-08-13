import { handleApi } from '../../server/api.mjs'

const ALLOWED_ORIGINS = [
  'https://3mh-technologies-3mh-store.static.hf.space',
  'https://3mh-technologies-3mh-store.hf.space',
]

function corsHeaders(request) {
  const origin = request.headers.get('Origin')
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

function b64ToBytes(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for') ||
    'unknown'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }

  let body = ''
  if (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT') {
    try {
      body = await request.text()
    } catch {
      body = ''
    }
  }

  try {
    const result = await handleApi({
      method: request.method,
      pathname: url.pathname,
      search: url.searchParams,
      headers: request.headers,
      body,
      env,
      ip,
      origin: url.origin,
    })

    if (result.binaryBase64) {
      const headers = {
        'Content-Type': result.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName || 'download')}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        ...corsHeaders(request),
      }
      if (result.publicCache) {
        headers['Cache-Control'] = 'public, max-age=86400'
      } else {
        headers['Cache-Control'] = 'no-store'
      }
      return new Response(b64ToBytes(result.binaryBase64), {
        status: result.status,
        headers,
      })
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        ...corsHeaders(request),
      },
    })
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: 'INTERNAL', message: 'خطأ داخلي في الخادم' },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          ...corsHeaders(request),
        },
      }
    )
  }
}