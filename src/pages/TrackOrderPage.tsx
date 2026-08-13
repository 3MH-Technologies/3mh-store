import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { getProductsByIds } from '../lib/products'
import { useStore } from '../context/StoreContext'
import type { Order } from '../types'
import { DeliveryCards } from '../components/DeliveryCards'
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  paymentMethodLabel,
} from '../lib/orders'
import { formatDate, formatUSD, isValidOrderId } from '../lib/format'
import { PageLoader } from '../components/Spinner'

interface AssetLink {
  productId: string
  label: string
  desc: string
  link: string
}

export function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { products, settings } = useStore()
  const [input, setInput] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'missing' | 'error'>('idle')
  const [assets, setAssets] = useState<AssetLink[]>([])
  const [decrypting, setDecrypting] = useState(false)

  const lookFor = (raw: string) => {
    const clean = raw.trim()
    if (!isValidOrderId(clean)) {
      setStatus('missing')
      return
    }
    void fetchOrder(clean)
  }

  const fetchOrder = async (id: string) => {
    setStatus('loading')
    try {
      const found = await api.getOrder(id)
      if (found) {
        setOrder(found)
        setStatus('found')
      } else {
        setOrder(null)
        setStatus('missing')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('NO_GITHUB_CONFIG')) {
        setStatus('error')
        setOrder(null)
      } else {
        setStatus('missing')
        setOrder(null)
      }
    }
  }

  useEffect(() => {
    if (orderId) {
      setInput(orderId)
      void fetchOrder(orderId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const productIds = useMemo(
    () => (order ? order.items.map((i) => i.productId) : []),
    [order]
  )

  useEffect(() => {
    let cancelled = false
    if (order && order.status === 'verified' && productIds.length > 0) {
      setDecrypting(true)
      void (async () => {
        const catalog = getProductsByIds(products, productIds)
        const results: AssetLink[] = []
        for (const pid of productIds) {
          const product = catalog.find((p) => p.id === pid)
          if (!product) continue
          try {
            const asset = await api.getAccess(order.id, pid)
            if (asset?.link) {
              results.push({
                productId: pid,
                label: asset.label,
                desc: asset.desc,
                link: asset.link,
              })
            }
          } catch {
            // منتج بلا أصول أو خطأ — نتجاهل ونكمل
          }
        }
        if (!cancelled) setAssets(results)
        if (!cancelled) setDecrypting(false)
      })()
    } else {
      setAssets([])
      setDecrypting(false)
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.id, productIds.join('|'), products])

  return (
    <div className="container-app max-w-3xl py-12">
      <div className="text-center">
        <h1 className="section-title">تتبع الطلب</h1>
        <p className="mt-2 text-sm text-slate-400">
          أدخل رقم الطلب (ORD-XXXX-XXXX) الذي حصلت عليه بعد إتمام الشراء.
        </p>
      </div>

      <form
        className="mx-auto mt-8 flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          lookFor(input)
        }}
      >
        <input
          dir="ltr"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ORD-4K2M-9X7Q"
          className="input text-center font-mono uppercase tracking-wider"
          aria-label="رقم الطلب"
        />
        <button type="submit" className="btn-primary shrink-0">
          <Search className="h-4 w-4" />
          بحث
        </button>
      </form>

      {status === 'loading' && <PageLoader label="جارٍ التحقق من الطلب..." />}

      {status === 'missing' && (
        <div className="card mx-auto mt-10 max-w-md p-8 text-center">
          <Search className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-4 text-sm font-bold text-slate-300">
            لم نعثر على طلب بهذا الرقم
          </p>
          <p className="mt-1 text-xs text-slate-500">
            تحقق من كتابة الرقم كما ورد في بريدك أو رسالة التأكيد.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="card mx-auto mt-10 max-w-md p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-rose-400" />
          <p className="mt-4 text-sm font-bold text-slate-300">
            قاعدة البيانات غير مهيأة
          </p>
          <p className="mt-1 text-xs text-slate-500">
            قم بربط متغيرات GITHUB_OWNER و GITHUB_REPO و GITHUB_TOKEN لتفعيل
            التتبع، أو تواصل مع الدعم عبر تيليجرام.
          </p>
        </div>
      )}

      {status === 'found' && order && (
        <div className="mt-10 space-y-6">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">رقم الطلب</p>
                <p className="mt-1 font-mono text-lg font-black tracking-wider text-white" dir="ltr">
                  {order.id}
                </p>
              </div>
              <span
                className={`chip border ${ORDER_STATUS_COLORS[order.status]}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>

            <div className="mt-6 grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-xl bg-slate-900/60 p-3">
                <p className="text-slate-500">تاريخ الإنشاء</p>
                <p className="mt-1 font-bold text-slate-200">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-3">
                <p className="text-slate-500">المبلغ الإجمالي</p>
                <p className="mt-1 font-bold text-slate-200">
                  {formatUSD(order.total)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-3">
                <p className="text-slate-500">طريقة الدفع</p>
                <p className="mt-1 font-bold text-slate-200">
                  {paymentMethodLabel(order.payment.method, settings.paymentMethodLabels)}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-700/60 pt-5">
              <p className="mb-3 text-xs font-bold text-slate-400">حالة الطلب</p>
              <ol className="flex items-center gap-2">
                {(
                  [
                    { key: 'pending', label: 'قيد المراجعة' },
                    { key: 'verified', label: 'تم التحقق' },
                    { key: 'delivered', label: 'الاستلام' },
                  ] as const
                ).map((step, index, arr) => {
                  const reached =
                    order.status === 'verified' || step.key === 'pending'
                  const isRejected = order.status === 'rejected'
                  const iconClass = isRejected
                    ? 'border-rose-500/50 text-rose-400'
                    : reached
                      ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300'
                      : 'border-slate-700 text-slate-600'
                  return (
                    <li key={step.key} className="flex flex-1 flex-col items-center gap-2">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border ${iconClass}`}
                      >
                        {isRejected && index === 0 ? (
                          <XCircle className="h-4 w-4" />
                        ) : reached ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </span>
                      <span className="text-center text-[11px] text-slate-400">
                        {step.label}
                      </span>
                      {index < arr.length - 1 && (
                        <span
                          className={`h-0.5 w-full ${
                            reached || order.status === 'verified'
                              ? 'bg-cyan-400/50'
                              : 'bg-slate-800'
                          }`}
                        />
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>

          {order.status === 'pending' && (
            <div className="card flex items-start gap-3 p-5">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="text-sm leading-7 text-slate-300">
                <p className="font-bold text-amber-200">
                  طلبك قيد المراجعة اليدوية
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  نتحقق من عملية الدفع الآن، وعادةً ما يستغرق الأمر أقل من ساعة.
                  سنبلغك عبر بريدك وتيليجرام فور اكتمال التحقق.
                </p>
              </div>
            </div>
          )}

          {order.status === 'rejected' && (
            <div className="card flex items-start gap-3 border-rose-500/30 p-5">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div className="text-sm leading-7 text-slate-300">
                <p className="font-bold text-rose-200">لم يتعذر تأكيد العملية</p>
                <p className="mt-1 text-xs text-slate-400">
                  لم نتمكن من مطابقة إثبات الدفع مع العملية، تواصل معنا عبر
                  تيليجرام @{settings.supportTelegramUsername} مع رقم طلبك
                  وبيانات التحويل لتسوية الأمر.
                </p>
              </div>
            </div>
          )}

          {order.status === 'verified' && (
            <div className="card border-emerald-400/25 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-extrabold text-emerald-300">
                    تم التحقق من طلبك بنجاح
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    أصولك جاهزة الآن، وحالة التحقق موثقة في فاتورتك الرقمية.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {order.deliveries && order.deliveries.length > 0 && (
                  <DeliveryCards deliveries={order.deliveries} />
                )}
                {decrypting ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ فك تشفير روابط التسليم...
                  </div>
                ) : assets.length > 0 ? (
                  assets.map((asset) => (
                    <div
                      key={asset.productId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-white">{asset.label}</p>
                        {asset.desc && (
                          <p className="mt-0.5 text-[11px] text-slate-400">{asset.desc}</p>
                        )}
                      </div>
                      <a
                        href={asset.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary shrink-0 px-4 py-2 text-xs"
                      >
                        <Download className="h-4 w-4" />
                        تحميل الأصول
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                    <LockKeyhole className="h-4 w-4" />
                    لا تتوفر روابط تحميل لهذه الأصول، تواصل مع الدعم.
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-slate-700/60 pt-4">
                <Link to={`/invoice/${order.id}`} className="btn-ghost w-full">
                  <FileText className="h-4 w-4" />
                  فتح الفاتورة الرقمية الرسمية
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}