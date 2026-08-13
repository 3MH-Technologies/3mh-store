import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { formatSAR, formatUSD } from '../lib/format'
import { computeOrderTotals } from '../lib/orders'

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateQty,
    removeFromCart,
    clearCart,
  } = useStore()
  const navigate = useNavigate()
  const totals = computeOrderTotals(cart)

  if (!cartOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="إغلاق السلة"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={() => setCartOpen(false)}
      />
      <aside className="absolute inset-y-0 left-0 flex w-full max-w-md animate-slideInLeft flex-col border-l border-slate-700 bg-brand-800 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
            <ShoppingCart className="h-5 w-5 text-cyan-400" />
            سلة المشتريات
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-300">
              {cart.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-slate-600" />
            <p className="text-sm font-bold text-slate-400">السلة فارغة</p>
            <p className="text-xs text-slate-500">
              تصفح المتجر وأضف ما يناسبك، الدفع يتم بعد تحديد السلة.
            </p>
            <button
              type="button"
              className="btn-primary mt-2"
              onClick={() => {
                setCartOpen(false)
                navigate('/')
              }}
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {cart.map(({ product, qty }) => (
                <div
                  key={product.id}
                  className="flex gap-3 rounded-xl border border-slate-700/70 bg-slate-900/40 p-3"
                >
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${product.gradient}`}
                  >
                    <span className="text-lg font-black text-white">
                      {product.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold leading-6 text-slate-200">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {formatUSD(product.price * qty)}
                      <span className="mr-2 text-[11px] font-bold text-cyan-300">
                        ≈ {formatSAR(product.price * qty)}
                      </span>
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, qty - 1)}
                          aria-label="إنقاص"
                          className="px-2 py-1 text-slate-300 transition-colors hover:text-cyan-300"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-xs font-black text-white">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, qty + 1)}
                          aria-label="زيادة"
                          className="px-2 py-1 text-slate-300 transition-colors hover:text-cyan-300"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label="حذف المنتج"
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-slate-700/60 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">الإجمالي الفرعي</span>
                <span className="font-black text-white">
                  {formatUSD(totals.subtotal)}
                </span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">قيمة الخصم الترويجي</span>
                  <span className="font-black text-emerald-400">
                    − {formatUSD(totals.discount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-700/60 pt-3 text-base">
                <span className="font-bold text-white">الإجمالي النهائي</span>
                <div className="text-start">
                  <p className="font-black text-white">{formatUSD(totals.total)}</p>
                  <p className="text-[11px] font-bold text-cyan-300">
                    ≈ {formatSAR(totals.total)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  setCartOpen(false)
                  navigate('/checkout')
                }}
              >
                متابعة الدفع
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="w-full text-center text-xs font-bold text-slate-500 transition-colors hover:text-rose-400"
              >
                تفريغ السلة
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}