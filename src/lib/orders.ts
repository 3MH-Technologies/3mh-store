import { CONFIG } from '../config'
import type { CartItem, Customer, Order, OrderStatus, PaymentMethod } from '../types'

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateOrderId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let id = ''
  for (const byte of bytes) id += CHARS[byte % CHARS.length]
  return `ORD-${id.slice(0, 4)}-${id.slice(4)}`
}

export interface OrderTotals {
  subtotal: number
  discount: number
  total: number
}

export function computeOrderTotals(items: CartItem[]): OrderTotals {
  let subtotal = 0
  let discount = 0
  for (const { product, qty } of items) {
    subtotal += product.price * qty
    discount += Math.max(0, product.originalPrice - product.price) * qty
  }
  subtotal = Math.round(subtotal * 100) / 100
  discount = Math.round(discount * 100) / 100
  return { subtotal, discount, total: subtotal }
}

export function buildOrder(input: {
  items: CartItem[]
  customer: Customer
  paymentMethod: PaymentMethod
  txHash: string
  receiptDataUrl: string | null
  deliveryType?: string
  notes?: string
}): Order {
  const totals = computeOrderTotals(input.items)
  return {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    customer: input.customer,
    items: input.items.map(({ product, qty }) => ({
      productId: product.id,
      title: product.name,
      price: product.price,
      qty,
    })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    currency: 'USD',
    deliveryType: input.deliveryType ?? 'تسليم فوري رقمي بعد التحقق',
    payment: {
      method: input.paymentMethod,
      txHash: input.txHash.trim(),
      receiptDataUrl: input.receiptDataUrl,
    },
    status: 'pending',
    verifiedAt: null,
    notes: input.notes?.trim() ?? '',
  }
}

export function paymentMethodLabel(
  method: PaymentMethod,
  labels: Record<PaymentMethod, string>
): string {
  return labels[method] ?? method
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد المراجعة',
  verified: 'تم التحقق',
  rejected: 'مرفوض',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  verified: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  rejected: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
}

export const USD_TO_SAR = CONFIG.usdToSar