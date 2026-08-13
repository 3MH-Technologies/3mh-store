import type { Order, Product, ProductsFile, SettingsFile, SiteSettings, StockItem } from '../types'

export interface Catalog {
  products: ProductsFile
  settings: SiteSettings | null
}

export interface AssetResult {
  label: string
  desc: string
  link: string
}

export const ADMIN_TOKEN_KEY = '3mh-admin-token'

const API_BASE =
  typeof location !== 'undefined' && location.hostname.endsWith('.hf.space')
    ? 'https://3mh-store.pages.dev'
    : ''

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    // ignore storage failures
  }
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request<T>(
  path: string,
  init?: { method?: string; body?: unknown; token?: string | null }
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  let method = init?.method ?? 'GET'
  let body: string | undefined
  if (init?.body !== undefined) {
    method = 'POST'
    body = JSON.stringify(init.body)
    headers['Content-Type'] = 'application/json'
  }
  if (init?.token) headers.Authorization = `Bearer ${init.token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body,
      cache: 'no-store',
    })
  } catch {
    throw new ApiError('NETWORK', 'تعذر الاتصال بالخادم', 0)
  }

  if (res.status === 429) {
    throw new ApiError('RATE_LIMIT', 'محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة', 429)
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // non-JSON fallback
  }

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } })?.error
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'حدث خطأ غير متوقع',
      res.status
    )
  }
  return data as T
}

export const api = {
  async getCatalog(): Promise<Catalog> {
    return request<Catalog>('/api/catalog')
  },

  async getOrder(orderId: string): Promise<Order | null> {
    const data = await request<{ order: Order | null }>(
      `/api/orders/${encodeURIComponent(orderId)}`
    )
    return data.order
  },

  async createOrder(input: {
    items: { productId: string; qty: number }[]
    customer: { name: string; email: string; telegram: string; phone: string }
    paymentMethod: string
    honeypot?: string
  }): Promise<Order> {
    const data = await request<{ order: Order }>('/api/orders', { body: input })
    return data.order
  },

  async createPlisioInvoice(
    orderId: string,
    force = false
  ): Promise<{ invoiceUrl: string; txnId: string }> {
    return request<{ invoiceUrl: string; txnId: string }>('/api/plisio/invoice', {
      body: { orderId, force },
    })
  },

  async adminLogin(pin: string): Promise<string> {
    const data = await request<{ token: string }>('/api/admin/login', {
      body: { pin },
    })
    return data.token
  },

  async listOrders(token: string): Promise<Order[]> {
    const data = await request<{ orders: Order[] }>('/api/admin/orders', {
      token,
    })
    return data.orders ?? []
  },

  async updateOrderStatus(
    token: string,
    orderId: string,
    status: Order['status'],
    notes?: string
  ): Promise<Order> {
    const data = await request<{ order: Order }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}`,
      { method: 'PATCH', token, body: { status, notes } }
    )
    return data.order
  },

  async saveProducts(token: string, products: Product[]): Promise<void> {
    await request<{ ok: boolean }>('/api/admin/products', {
      token,
      body: { products },
    })
  },

  async saveSettings(token: string, settings: SiteSettings): Promise<void> {
    await request<{ ok: boolean }>('/api/admin/settings', {
      token,
      body: { settings },
    })
  },

  async uploadAsset(
    token: string,
    kind: 'file' | 'image',
    productId: string,
    fileName: string,
    base64: string
  ): Promise<{ url: string }> {
    const data = await request<{ url: string }>('/api/admin/upload', {
      token,
      body: { kind, productId, fileName, base64 },
    })
    return data
  },

  async getStock(token: string, productId: string): Promise<StockItem[]> {
    const data = await request<{ items: StockItem[] }>(
      `/api/admin/stock/${encodeURIComponent(productId)}`,
      { token }
    )
    return data.items ?? []
  },

  async saveStock(
    token: string,
    productId: string,
    items: StockItem[]
  ): Promise<void> {
    await request<{ ok: boolean }>(
      `/api/admin/stock/${encodeURIComponent(productId)}`,
      { token, body: { items } }
    )
  },

  async getAccess(
    orderId: string,
    productId: string
  ): Promise<AssetResult | null> {
    const data = await request<{ asset: AssetResult | null }>(
      `/api/access?orderId=${encodeURIComponent(orderId)}&productId=${encodeURIComponent(productId)}`
    )
    return data.asset
  },
}

export type { ProductsFile, SettingsFile }
