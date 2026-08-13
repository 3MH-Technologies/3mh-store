import { CONFIG } from '../config'

export function formatUSD(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

export const formatPrice = formatUSD

export function formatSAR(value: number): string {
  const sar = value * CONFIG.usdToSar
  return `${sar.toLocaleString('en-US', {
    minimumFractionDigits: sar % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ر.س`
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function discountPercent(original: number, price: number): number {
  if (original <= 0 || price >= original) return 0
  return Math.round((1 - price / original) * 100)
}

export function clampQty(n: number, min = 1, max = 10): number {
  return Math.min(max, Math.max(min, n))
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export function isValidOrderId(id: string): boolean {
  return /^ORD-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(id.trim())
}

export function similarityMatch(a: string, b: string): boolean {
  return a.replace(/[^a-z0-9]/gi, '').toUpperCase() ===
    b.replace(/[^a-z0-9]/gi, '').toUpperCase()
}