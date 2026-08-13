import type { Order, Product, ProductsFile } from '../types'

function normalizeProduct(p: Product): Product {
  return {
    ...p,
    price: Number(p.price ?? 0),
    originalPrice:
      Number(p.originalPrice) > 0 ? Number(p.originalPrice) : Number(p.price),
    sales: Number(p.sales ?? 0),
    rating: Number(p.rating ?? 5),
    access: p.access ?? { label: '', payload: '', iv: '' },
    specs: Array.isArray(p.specs) ? p.specs : [],
    features: Array.isArray(p.features) ? p.features : [],
  }
}

export function normalizeProductsFile(file: ProductsFile | null): Product[] {
  if (!file || !Array.isArray(file.products)) return []
  return file.products.map(normalizeProduct)
}

export function normalizeOrdersFile(file: { orders?: Order[] } | null): Order[] {
  if (!file || !Array.isArray(file.orders)) return []
  return file.orders
}

export function sortBySalesDesc(list: Product[]): Product[] {
  return [...list].sort((a, b) => b.sales - a.sales)
}

export function filterProducts(list: Product[], opts: {
  query: string
  category: string
}): Product[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((p) => {
    const inCategory = opts.category === 'all' || p.category === opts.category
    if (!inCategory) return false
    if (!q) return true
    const haystack = [p.name, p.description, p.tag, p.category]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function getProductsByIds(list: Product[], ids: string[]): Product[] {
  const wanted = new Set(ids)
  return list.filter((p) => wanted.has(p.id))
}