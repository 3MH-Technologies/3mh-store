import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { api } from '../lib/api'
import { formatSAR, formatUSD } from '../lib/format'
import type { Order } from '../types'

export function PaymentPage() {
  const { orderId = '' } = useParams()
  const { products, settings } = useStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [opening, setOpening] = useState(false)
  const [payError, setPayError] = useState('')
  const pollRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const o = await api.getOrder(orderId)
      if (!o) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setOrder(o)
      setLoading(false)
      if (o.status !== 'pending' && pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch {
      setNotFound(true)
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void load()
    pollRef.current = window.setInterval(() => {
      void load()
    }, 8000)
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [load])

  const openInvoice = async (force = false) => {
    setOpening(true)
    setPayError('')
    try {
      const invoice = await api.createPlisioInvoice(orderId, force)
      window.location.assign(invoice.invoiceUrl)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('ORDER_NOT_PENDING')) {
        setPayError('تمت معالجة هذا الطلب بالفعل')
        void load()
      } else {
        setPayError('تعذر فتح صفحة الدفع — حاول مرة أخرى')
      }
      setOpening(false)
    }
  }

  if (loading) {
    return (
      <div className="container-app flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="container-app max-w-xl py-20 text-center">
        <div className="card p-8">
          <AlertTriangle className="mx-auto h-14 w-14 text-amber-400" />
          <h1 className="mt-4 text-xl font-black text-white">الطلب غير موجود</h1>
          <p className="mt-2 text-sm text-slate-400">
            تأكد من رابط الطلب أو تواصل مع الدعم.
          </p>
          <Link to="/" className="btn-primary mt-6">
            العودة إلى المتجر
          </Link>
        </div>
      </div>
    )
  }

  const firstProduct = products.find((p) => p.id === order.items?.[0]?.productId)
  const done = order.status === 'verified'
  const failed = order.status === 'rejected'

  return (
    <div className="container-app max-w-2xl py-12">
      <div className="card overflow-hidden p-0">
        <div className="flex flex-col gap-5 border-b border-slate-800 bg-slate-900/40 p-6 sm:flex-row">
          <div
            className={`flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${
              firstProduct?.gradient || 'from-cyan-500 to-blue-600'
            } sm:w-36`}
          >
            {firstProduct?.image ? (
              <img
                src={firstProduct.image}
                alt={firstProduct.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <FileText className="h-10 w-10 text-white/90" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`chip ${
                  done
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                    : failed
                      ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
                      : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                }`}
              >
                {done ? 'تم الدفع — جاري تفعيل أصولك' : failed ? 'لم يكتمل الدفع' : 'بانتظار الدفع'}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-black leading-8 text-white">
              {firstProduct?.name || order.items?.[0]?.title || 'طلب'}
            </h1>
            <p className="mt-1 text-xs font-bold text-slate-400">
              رقم الطلب:{' '}
              <span className="font-black tracking-wider text-cyan-300" dir="ltr">
                {order.id}
              </span>
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              {(order.items || []).map((item) => (
                <p key={item.productId} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{item.title} × {item.qty}</span>
                  <span className="shrink-0 font-bold text-slate-200">
                    {formatUSD(Number(item.price) * item.qty)}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {done && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                تم تأكيد دفعة الطلب بنجاح
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-300">
                تم تفعيل روابط أصولك تلقائياً — افتحها من صفحة التتبع.
              </p>
              <Link to={`/track/${order.id}`} className="btn-primary mt-4">
                <FileText className="h-4 w-4" />
                فتح الأصول (التتبع)
              </Link>
            </div>
          )}

          {failed && (
            <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-rose-300">
                <AlertTriangle className="h-4 w-4" />
                لم يكتمل الدفع
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-300">
                انتهت صلاحية الفاتورة أو أُلغي التحويل. يمكنك إعادة المحاولة من
                خلال إنشاء طلب جديد، أو التواصل مع الدعم إن كنت أرسلت المبلغ فعلاً.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/" className="btn-primary">
                  <ArrowRight className="h-4 w-4" />
                  إنشاء طلب جديد
                </Link>
                <Link to={`/track/${order.id}`} className="btn-ghost">
                  <FileText className="h-4 w-4" />
                  تفاصيل الطلب
                </Link>
              </div>
            </div>
          )}

          {!done && !failed && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">إجمالي الطلب</span>
                  <span className="font-black text-white">
                    {formatUSD(Number(order.total))}{' '}
                    <span className="text-xs text-cyan-300">
                      ≈ {formatSAR(Number(order.total))}
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  الدفع عبر بوابة Plisio الآمنة (BTC، ETH، USDT وغيرها) — يُؤكد
                  الطلب تلقائياً فور اكتمال التحويل.
                </p>
              </div>

              {payError && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {payError}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={() => void openInvoice(false)}
                  disabled={opening}
                >
                  {opening ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ فتح صفحة الدفع...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      ادفع الآن عبر Plisio
                    </>
                  )}
                </button>
                <Link to={`/track/${order.id}`} className="btn-ghost">
                  <FileText className="h-4 w-4" />
                  تفاصيل الطلب
                </Link>
              </div>

              <button
                type="button"
                onClick={() => void openInvoice(true)}
                disabled={opening}
                className="mx-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-cyan-300 disabled:opacity-40"
              >
                <RefreshCw className="h-3 w-3" />
                انتهت صلاحية الفاتورة؟ أنشئ فاتورة جديدة
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-[11px] text-slate-500">
            <span>
              سيتم تحديث الحالة تلقائياً بعد الدفع ({settings.appNameAr || '3MH Store'})
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
}