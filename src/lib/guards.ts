import type { Order, OrderStatus, PaymentMethod } from '../types'

export function isPaymentMethod(value: string): value is PaymentMethod {
  return [
    'usdt-trc20',
    'usdt-bep20',
    'usdt-erc20',
    'btc',
    'eth',
    'trx',
    'ltc',
    'ton',
  ].includes(value)
}

export function isOrderStatus(value: string): value is OrderStatus {
  return ['pending', 'verified', 'rejected'].includes(value)
}

export function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') return false
  const o = value as Partial<Order>
  return (
    typeof o.id === 'string' &&
    typeof o.createdAt === 'string' &&
    !!o.customer &&
    Array.isArray(o.items) &&
    typeof o.total === 'number' &&
    isOrderStatus(String(o.status))
  )
}