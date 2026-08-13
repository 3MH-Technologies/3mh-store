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
    })
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
