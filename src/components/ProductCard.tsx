import { Check, Star } from 'lucide-react'
import type { Product } from '../types'
import { getIcon } from '../lib/icons'
import { discountPercent, formatSAR, formatUSD } from '../lib/format'
import { useStore } from '../context/StoreContext'

interface ProductCardProps {
  product: Product
  onDetails: (product: Product) => void
}

export function ProductCard({ product, onDetails }: ProductCardProps) {
  const { addToCart } = useStore()
  const Icon = getIcon(product.icon)
  const discount = discountPercent(product.originalPrice, product.price)
  const outOfStock = typeof product.stock?.available === 'number' && product.stock.available <= 0

  return (
    <article className="card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-glow">
      <button
        type="button"
        onClick={() => onDetails(product)}
        className="relative block cursor-pointer text-start"
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        <div
          className={`flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${product.gradient}`}
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <Icon className="h-14 w-14 text-white/90 transition-transform duration-300 group-hover:scale-110" />
          )}
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-gradient-to-l from-rose-500 to-orange-500 px-2.5 py-1 text-xs font-black text-white shadow-lg">
          {discount > 0 ? `خصم ${discount}%` : product.tag}
        </span>
        {product.tag && discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full border border-cyan-400/30 bg-brand-900/80 px-2.5 py-1 text-[11px] font-bold text-cyan-300 backdrop-blur">
            {product.tag}
          </span>
        )}
        {product.stock && (
          <span
            className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-black backdrop-blur ${
              outOfStock
                ? 'bg-rose-500/90 text-white'
                : 'bg-emerald-500/90 text-white'
            }`}
          >
            {outOfStock ? 'نفد المخزون' : `متوفر: ${product.stock.available}`}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button
          type="button"
          onClick={() => onDetails(product)}
          className="cursor-pointer text-start"
        >
          <h3 className="text-base font-extrabold leading-7 text-white transition-colors group-hover:text-cyan-300">
            {product.name}
          </h3>
        </button>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-bold text-slate-300">{product.rating}</span>
          <span>·</span>
          <span>{product.sales} عملية شراء</span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
          {product.description}
        </p>

        <ul className="mt-3 space-y-1.5">
          {product.features.slice(0, 2).map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-1.5 text-xs leading-5 text-slate-400"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="line-clamp-1">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white">
                  {formatUSD(product.price)}
                </span>
                <span className="text-sm text-slate-500 line-through">
                  {formatUSD(product.originalPrice)}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-cyan-300">
                ≈ {formatSAR(product.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={outOfStock}
              className="btn-primary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              {outOfStock ? 'نفد المخزون' : 'أضف للسلة'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}