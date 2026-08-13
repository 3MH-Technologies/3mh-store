import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  LockKeyhole,
  Search,
  ShoppingBag,
  Wallet,
} from 'lucide-react'
import { Hero } from '../components/Hero'
import { ProductCard } from '../components/ProductCard'
import { ProductModal } from '../components/ProductModal'
import { getIcon } from '../lib/icons'
import { useStore } from '../context/StoreContext'
import { filterProducts, sortBySalesDesc } from '../lib/products'
import type { Product } from '../types'

type CategoryFilter = string | 'all'

export function HomePage() {
  const { products, settings } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [selected, setSelected] = useState<Product | null>(null)

  const filters = useMemo(
    () => [
      { id: 'all' as const, label: 'كل المنتجات' },
      ...settings.categories.map((c) => ({
        id: c.id,
        label: c.ar,
      })),
    ],
    [settings.categories]
  )

  const visible = useMemo(
    () => filterProducts(sortBySalesDesc(products), { query, category }),
    [products, query, category]
  )

  return (
    <div>
      <Hero />

      <ProductModal
        product={selected}
        onClose={() => setSelected(null)}
      />

      <section id="catalog" className="container-app scroll-mt-8 py-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="section-title">كامل الكتالوج الرقمي</h2>
            <p className="mt-2 text-sm text-slate-400">
              منتجات محدثة ومفحوصة، مع ضمان التسليم بعد التحقق من العملية.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن سكربت، أداة، كورس، اشتراك..."
              className="input py-3 ps-11"
              aria-label="بحث في المنتجات"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (              <button
                key={filter.id}
                type="button"
                onClick={() => setCategory(filter.id)}
                className={`chip ${
                  category === filter.id
                    ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-slate-800 p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-4 text-sm font-bold text-slate-300">
              لا توجد نتائج مطابقة
            </p>
            <p className="mt-1 text-xs text-slate-500">
              جرّب كلمات بحث أخرى أو غيّر القسم.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDetails={setSelected}
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-slate-800 bg-brand-950/40">
        <div className="container-app grid gap-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {settings.trust.map(({ icon, title, desc }) => {
            const Icon = getIcon(icon)
            return (
              <div key={title} className="card p-5">
                <span className="inline-flex rounded-xl bg-gradient-to-l from-cyan-500/15 to-purple-500/15 p-3">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </span>
                <h3 className="mt-4 text-sm font-extrabold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-6 text-slate-400">{desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="container-app py-14">
        <div className="text-center">
          <h2 className="section-title">كيف يتم الشراء؟</h2>
          <p className="mt-2 text-sm text-slate-400">
            أربع خطوات تفصلك عن منتجك الرقمي.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShoppingBag,
              step: '01',
              title: 'أضف إلى السلة',
              desc: 'اختر منتجاتك وأضفها إلى السلة ثم انتقل إلى إتمام الطلب.',
            },
            {
              icon: Wallet,
              step: '02',
              title: 'ادفع بالطريقة المناسبة',
              desc: 'حوّل المبلغ بالعملات الرقمية (USDT / BTC / ETH) وأرسل إثبات العملية.',
            },
            {
              icon: LockKeyhole,
              step: '03',
              title: 'أرسل إثبات العملية',
              desc: 'الصق معرف العملية أو أرفق إثبات التحويل لمراجعته يدوياً.',
            },
            {
              icon: BadgeCheck,
              step: '04',
              title: 'استلم فوراً',
              desc: 'عند تأكيد التحقق تُفتح روابط الأصول في الفاتورة فوراً.',
            },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="relative">
              <span className="absolute -top-3 right-0 text-4xl font-black text-slate-800">
                {step}
              </span>
              <span className="inline-flex rounded-xl bg-gradient-to-l from-cyan-500/15 to-purple-500/15 p-3">
                <Icon className="h-5 w-5 text-purple-300" />
              </span>
              <h3 className="mt-4 text-sm font-extrabold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-6 text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}