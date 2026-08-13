import { Octokit } from '@octokit/rest'
import type { Order, OrdersFile, ProductsFile, SettingsFile } from '../types'
import { CONFIG } from '../config'

const PRODUCTS_PATH = 'data/products.json'
const ORDERS_PATH = 'data/orders.json'
const SETTINGS_PATH = 'data/settings.json'

let octokit: Octokit | null = null
let writeLock: Promise<unknown> = Promise.resolve()

const isConfigured = Boolean(
  CONFIG.github.token && CONFIG.github.owner && CONFIG.github.repo
)

function getOctokit(): Octokit {
  if (!isConfigured) throw new Error('NO_GITHUB_CONFIG')
  if (!octokit) {
    octokit = new Octokit({ auth: CONFIG.github.token })
  }
  return octokit
}

function decodeBase64Content(b64: string): string {
  const binary = atob(b64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function encodeBase64Content(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

async function readRawFile(path: string): Promise<{ sha: string; text: string }> {
  const client = getOctokit()
  const { data } = await client.rest.repos.getContent({
    owner: CONFIG.github.owner,
    repo: CONFIG.github.repo,
    path,
    ref: CONFIG.github.branch,
  })
  if (typeof data === 'string' || Array.isArray(data) || !('content' in data)) {
    throw new Error(`UNEXPECTED_FILE_STRUCTURE: ${path}`)
  }
  const content = (data as { content?: string }).content ?? ''
  return {
    sha: (data as { sha?: string }).sha ?? '',
    text: decodeBase64Content(content),
  }
}

async function writeRawFile(path: string, text: string): Promise<void> {
  const client = getOctokit()
  const { sha } = await readRawFile(path)
  await client.rest.repos.createOrUpdateFileContents({
    owner: CONFIG.github.owner,
    repo: CONFIG.github.repo,
    path,
    message: `store-db: تحديث ${path} ${new Date().toISOString()}`,
    content: encodeBase64Content(text),
    branch: CONFIG.github.branch,
    sha,
  })
}

async function writeOrCreate(path: string, text: string): Promise<void> {
  if (!isConfigured) return
  try {
    await writeRawFile(path, text)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('404') || msg.includes('Not Found')) {
      const client = getOctokit()
      await client.rest.repos.createOrUpdateFileContents({
        owner: CONFIG.github.owner,
        repo: CONFIG.github.repo,
        path,
        message: `store-db: إنشاء ${path} ${new Date().toISOString()}`,
        content: encodeBase64Content(text),
        branch: CONFIG.github.branch,
      })
    } else {
      throw e
    }
  }
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn, fn)
  writeLock = run.catch(() => undefined)
  return run
}

function stampFile<T extends { updatedAt?: string }>(obj: T): T {
  return { ...obj, updatedAt: new Date().toISOString() }
}

export const githubDB = {
  isConfigured,

  async readProducts(): Promise<ProductsFile | null> {
    if (!isConfigured) return null
    const { text } = await readRawFile(PRODUCTS_PATH)
    return JSON.parse(text) as ProductsFile
  },

  async writeProducts(data: ProductsFile): Promise<void> {
    const json = JSON.stringify(stampFile(data), null, 2)
    await withLock(() => writeOrCreate(PRODUCTS_PATH, json))
  },

  async readOrders(): Promise<OrdersFile> {
    if (!isConfigured) {
      return { version: 1, updatedAt: new Date().toISOString(), orders: [] }
    }
    const { text } = await readRawFile(ORDERS_PATH)
    return JSON.parse(text) as OrdersFile
  },

  async findOrder(orderId: string): Promise<Order | null> {
    const file = await this.readOrders()
    return file.orders.find((o) => o.id === orderId) ?? null
  },

  async findAllOrders(): Promise<Order[]> {
    const file = await this.readOrders()
    return file.orders
  },

  async addOrder(order: Order): Promise<Order> {
    await withLock(async () => {
      let file: OrdersFile
      try {
        file = await this.readOrders()
      } catch {
        file = { version: 1, updatedAt: new Date().toISOString(), orders: [] }
      }
      if (file.orders.some((o) => o.id === order.id)) {
        throw new Error(`الطلب ${order.id} موجود مسبقاً`)
      }
      file.orders.push(order)
      const json = JSON.stringify(stampFile(file), null, 2)
      await writeOrCreate(ORDERS_PATH, json)
    })
    return order
  },

  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    notes?: string
  ): Promise<Order> {
    let updated: Order | undefined
    await withLock(async () => {
      const file = await this.readOrders()
      const index = file.orders.findIndex((o) => o.id === orderId)
      if (index === -1) throw new Error('الطلب غير موجود')
      const target = file.orders[index]
      target.status = status
      if (status === 'verified') target.verifiedAt = new Date().toISOString()
      if (notes !== undefined) target.notes = notes
      updated = target
      const json = JSON.stringify(stampFile(file), null, 2)
      await writeOrCreate(ORDERS_PATH, json)
    })
    if (!updated) throw new Error('فشل تحديث الطلب')
    return updated
  },

  async readSettings(): Promise<SettingsFile | null> {
    if (!isConfigured) return null
    try {
      const { text } = await readRawFile(SETTINGS_PATH)
      return JSON.parse(text) as SettingsFile
    } catch {
      return null
    }
  },

  async writeSettings(data: SettingsFile): Promise<void> {
    const json = JSON.stringify(stampFile(data), null, 2)
    await withLock(() => writeOrCreate(SETTINGS_PATH, json))
  },
}