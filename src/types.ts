export type OrderStatus = 'pending' | 'verified' | 'rejected'

export type PaymentMethod =
  | 'plisio'
  | 'usdt-trc20'
  | 'usdt-bep20'
  | 'usdt-erc20'
  | 'btc'
  | 'eth'
  | 'trx'
  | 'ltc'
  | 'ton'

export interface StoreCategory {
  id: string
  ar: string
  en: string
}

export interface WalletConfig {
  method: PaymentMethod
  name: string
  short: string
  address: string
  kind: 'address' | 'phone'
  instruction: string
  note: string
}

export interface HeroStat {
  label: string
  value: string
  prefix?: string
  suffix?: string
  decimals?: number
  animate?: boolean
}

export interface FeatureCard {
  icon: string
  title: string
  desc: string
}

export interface SiteSettings {
  appName: string
  appNameAr: string
  companyName: string
  companyTagline: string
  brandUrl: string
  supportEmail: string
  supportTelegramUsername: string
  supportTelegramUrl: string
  usdToSar: number
  categories: StoreCategory[]
  hero: {
    badge: string
    titleHighlight: string
    subtitle: string
    stats: HeroStat[]
    trustBadges: string[]
  }
  trust: FeatureCard[]
  wallets: WalletConfig[]
  paymentMethodLabels: Record<PaymentMethod, string>
  deliveryNote: string
}

export interface SettingsFile {
  version: number
  updatedAt: string
  settings: SiteSettings
}

export interface AccessInfo {
  label: string
  payload: string
  iv: string
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  originalPrice: number
  tag: string
  icon: string
  gradient: string
  image?: string
  description: string
  features: string[]
  specs: { label: string; value: string }[]
  sales: number
  rating: number
  access: AccessInfo
  stock?: { total: number; available: number }
}

export interface StockItem {
  id: string
  email: string
  password: string
  secret: string
  verifyCode: string
  used: boolean
  orderId: string | null
  usedAt: string | null
}

export interface DeliveryItem {
  productId: string
  title: string
  email: string
  password: string
  secret: string
  verifyCode: string
}

export interface ProductsFile {
  version: number
  updatedAt: string
  currency: 'USD'
  products: Product[]
}

export interface CartItem {
  product: Product
  qty: number
}

export interface OrderItem {
  productId: string
  title: string
  price: number
  qty: number
}

export interface Customer {
  name: string
  email: string
  telegram: string
  phone: string
}

export interface Order {
  id: string
  createdAt: string
  customer: Customer
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  currency: 'USD'
  deliveryType: string
  payment: {
    method: PaymentMethod
    txHash: string
    walletAddress?: string
    receiptDataUrl: string | null
    plisio?: { txnId: string; invoiceUrl: string }
  }
  status: OrderStatus
  verifiedAt: string | null
  notes: string
  deliveries?: DeliveryItem[]
}

export interface OrdersFile {
  version: number
  updatedAt: string
  orders: Order[]
}