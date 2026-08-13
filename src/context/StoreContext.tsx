import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { CartItem, Product, ProductsFile, SiteSettings, SettingsFile } from '../types'
import { CONFIG } from '../config'
import { githubDB } from '../lib/github'
import { whenConfigReady } from '../lib/runtimeConfig'
import { normalizeProductsFile } from '../lib/products'
import { clampQty } from '../lib/format'
import staticProductsData from '../../data/products.json'
import staticSettingsData from '../../data/settings.json'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface StoreContextValue {
  products: Product[]
  productsSource: 'github' | 'bundle'
  settings: SiteSettings
  settingsSource: 'github' | 'bundle'
  refreshProducts: () => Promise<void>
  reloadSettings: () => Promise<void>
  saveProducts: (products: Product[]) => Promise<void>
  saveSettings: (settings: SiteSettings) => Promise<void>
  cart: CartItem[]
  cartCount: number
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  addToCart: (product: Product, qty?: number) => void
  updateQty: (productId: string, qty: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  toasts: Toast[]
  notify: (message: string, type?: Toast['type']) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

const bundledProducts = normalizeProductsFile(
  staticProductsData as unknown as ProductsFile
)

const bundledSettings: SiteSettings =
  (staticSettingsData as unknown as SettingsFile).settings

function normalizeSettings(s: SiteSettings): SiteSettings {
  return {
    ...s,
    appName: s.appName || '3MH STORE',
    appNameAr: s.appNameAr || 'متجر 3MH التقني',
    companyName: s.companyName || '3MH TECHNOLOGIES',
    supportEmail: s.supportEmail || '',
    supportTelegramUsername: s.supportTelegramUsername || '',
    supportTelegramUrl:
      s.supportTelegramUrl ||
      (s.supportTelegramUsername
        ? `https://t.me/${s.supportTelegramUsername}`
        : ''),
    usdToSar: Number(s.usdToSar) || 3.75,
    categories: Array.isArray(s.categories) ? s.categories : [],
    hero: {
      badge: s.hero?.badge ?? '',
      titleHighlight: s.hero?.titleHighlight ?? '',
      subtitle: s.hero?.subtitle ?? '',
      stats: Array.isArray(s.hero?.stats) ? s.hero.stats : [],
      trustBadges: Array.isArray(s.hero?.trustBadges)
        ? s.hero.trustBadges
        : [],
    },
    trust: Array.isArray(s.trust) ? s.trust : [],
    wallets: Array.isArray(s.wallets) ? s.wallets : [],
    paymentMethodLabels: (s.paymentMethodLabels ??
      {}) as SiteSettings['paymentMethodLabels'],
    deliveryNote: s.deliveryNote || 'تسليم فوري رقمي بعد التحقق',
  }
}

function normalizeProducts(products: Product[]): Product[] {
  return products.map((p) => ({
    ...p,
    price: Number(p.price),
    originalPrice: Number(p.originalPrice) || Number(p.price),
    sales: Number(p.sales ?? 0),
    rating: Number(p.rating ?? 5),
    specs: Array.isArray(p.specs) ? p.specs : [],
    features: Array.isArray(p.features) ? p.features : [],
    access: p.access ?? { label: '', payload: '', iv: '' },
  }))
}

function loadPersistedCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CONFIG.cartStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    return parsed.filter((item) => item && item.product && item.qty > 0)
  } catch {
    return []
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(bundledProducts)
  const [productsSource, setProductsSource] = useState<'github' | 'bundle'>(
    'bundle'
  )
  const [settings, setSettings] = useState<SiteSettings>(() =>
    normalizeSettings(bundledSettings)
  )
  const [settingsSource, setSettingsSource] = useState<'github' | 'bundle'>(
    'bundle'
  )
  const [cart, setCart] = useState<CartItem[]>(loadPersistedCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const notify = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = ++toastId.current
      setToasts((prev) => [...prev, { id, message, type }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4200)
    },
    []
  )

  const refreshProducts = useCallback(async () => {
    await whenConfigReady()
    try {
      const remote = await githubDB.readProducts()
      if (remote && Array.isArray(remote.products) && remote.products.length > 0) {
        setProducts(normalizeProducts(remote.products))
        setProductsSource('github')
      }
    } catch {
      // في حال تعذر الاتصال بقاعدة البيانات يبقى الكتالوج المحلي نشطًا
    }
  }, [])

  const reloadSettings = useCallback(async () => {
    await whenConfigReady()
    try {
      const remote = await githubDB.readSettings()
      if (remote && remote.settings) {
        setSettings(normalizeSettings(remote.settings))
        setSettingsSource('github')
        CONFIG.usdToSar = Number(remote.settings.usdToSar) || CONFIG.usdToSar
      }
    } catch {
      // نكمل بالإعدادات المحلية المضمّنة
    }
  }, [])

  useEffect(() => {
    void refreshProducts()
    void reloadSettings()
  }, [refreshProducts, reloadSettings])

  const saveProducts = useCallback(
    async (list: Product[]) => {
      await whenConfigReady()
      await githubDB.writeProducts({
        version: 1,
        updatedAt: new Date().toISOString(),
        currency: 'USD',
        products: list,
      })
      setProducts(normalizeProducts(list))
      setProductsSource('github')
    },
    []
  )

  const saveSettings = useCallback(async (next: SiteSettings) => {
    await whenConfigReady()
    await githubDB.writeSettings({
      version: 1,
      updatedAt: new Date().toISOString(),
      settings: next,
    })
    setSettings(normalizeSettings(next))
    setSettingsSource('github')
    CONFIG.usdToSar = Number(next.usdToSar) || CONFIG.usdToSar
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG.cartStorageKey, JSON.stringify(cart))
    } catch {
      // تجاهل امتلاء مساحة التخزين
    }
  }, [cart])

  const addToCart = useCallback(
    (product: Product, qty = 1) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id)
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, qty: clampQty(item.qty + qty) }
              : item
          )
        }
        return [...prev, { product, qty: clampQty(qty) }]
      })
      notify(`تمت إضافة «${product.name}» إلى السلة`, 'success')
    },
    [notify]
  )

  const updateQty = useCallback((productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, qty: clampQty(qty) } : item
      )
    )
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  )

  const value = useMemo<StoreContextValue>(
    () => ({
      products,
      productsSource,
      settings,
      settingsSource,
      refreshProducts,
      reloadSettings,
      saveProducts,
      saveSettings,
      cart,
      cartCount,
      cartOpen,
      setCartOpen,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      toasts,
      notify,
    }),
    [
      products,
      productsSource,
      settings,
      settingsSource,
      refreshProducts,
      reloadSettings,
      saveProducts,
      saveSettings,
      cart,
      cartCount,
      cartOpen,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      toasts,
      notify,
    ]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}