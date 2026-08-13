import { useState } from 'react'
import {
  Check,
  Clock,
  DownloadCloud,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react'
import type { Product } from '../types'
import { getIcon } from '../lib/icons'
import { discountPercent, formatSAR, formatUSD } from '../lib/format'
import { Modal } from './ui/Modal'
import { useStore } from '../context/StoreContext'

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const { addToCart, settings } = useStore()
  const [qty, setQty] = useState(1)

  if (!product) return null

  const Icon = getIcon(product.icon)
  const discount = discountPercent(product.originalPrice, product.price)
  const categoryAr =
    settings.categories.find((c) => c.id === product.category)?.ar ??
    product.category

  return (
    <Modal open={Boolean(product)} onClose={onClose} maxWidth="max-w-3xl">
      <div className="grid gap-6 md:grid-cols-2">
        <div
          className={`relative flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${product.gradient}`}
        >
          <Icon className="h-20 w-20 text-white/90" />
          <span className="absolute right-3 top-3 rounded-full bg-gradient-to-l from-rose-500 to-orange-500 px-3 py-1 text-xs font-black text-white">
            {discount > 0 ? `خصم ${discount}%` : product.tag}
          </span>
          <span className="absolute left-3 top-3 rounded-full border border-cyan-400/30 bg-brand-900/80 px-3 py-1 text-[11px] font-bold text-cyan-300 backdrop-blur">
            {categoryAr}
          </span>
        </div>

        <div className="flex flex-col">
          <h2 className="text-xl font-black leading-9 text-white">{product.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <b className="text-slate-200">{product.rating}</b>
            </span>
            <span>·</span>
            <span>{product.sales} عملية شراء موثقة</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-emerald-300">
              <Zap className="h-3.5 w-3.5" /> تسليم فوري بعد التحقق
            </span>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-300">{product.description}</p>

          <div className="mt-5 rounded-xl border border-slate-700 bg-brand-900/60 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-2xl font-black text-white">
                {formatUSD(product.price)}
              </span>
              <span className="text-base text-slate-500 line-through">
                {formatUSD(product.originalPrice)}
              </span>
              <span className="text-sm font-black text-cyan-300">
                ≈ {formatSAR(product.price)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3.5 py-2.5 text-lg font-black text-slate-300 transition-colors hover:text-cyan-300"
                aria-label="إنقاص الكمية"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm font-black text-white">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="px-3.5 py-2.5 text-lg font-black text-slate-300 transition-colors hover:text-cyan-300"
                aria-label="زيادة الكمية"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                addToCart(product, qty)
                onClose()
              }}
              className="btn-primary flex-1"
            >
              أضف إلى السلة
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-white">
            <Check className="h-4 w-4 text-emerald-400" />
            المزايا المضمونة في المنتج
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {product.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-xs leading-6 text-slate-300"
              >
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-white">
            <DownloadCloud className="h-4 w-4 text-cyan-400" />
            المواصفات الفنية
          </h3>
          <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {product.specs.map((spec) => (
              <div
                key={spec.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs"
              >
                <dt className="font-bold text-slate-400">{spec.label}</dt>
                <dd className="text-start font-bold text-slate-200" dir="auto">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-emerald-200">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
          <p>
            بعد تأكيد عملية الدفع تفتح الفاتورة تلقائياً على رابط الأصول المشفرة،
            ويمكنك متابعة الحالة من صفحة «تتبع الطلب» برقم الطلب.
          </p>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="h-3.5 w-3.5" /> المراجعة تستغرق عادةً أقل من ساعة
          </span>
        </div>
      </div>
    </Modal>
  )
}