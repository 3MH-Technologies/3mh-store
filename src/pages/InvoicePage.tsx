import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  LockKeyhole,
  Printer,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { getProductsByIds } from '../lib/products'
import { useStore } from '../context/StoreContext'
import type { Order } from '../types'
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  paymentMethodLabel,
} from '../lib/orders'
import { formatDate, formatSAR, formatUSD } from '../lib/format'
import { PageLoader } from '../components/Spinner'

interface InvoiceAsset {
  productId: string
  label: string
  desc: string
  link: string
}

export function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { products, settings } = useStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [assets, setAssets] = useState<InvoiceAsset[]>([])
  const [decrypting, setDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!orderId) {
        setMissing(true)
        setLoading(false)
        return
      }
      try {
        const found = await api.getOrder(orderId)
        if (cancelled) return
        if (found) {
          setOrder(found)
        } else {
          setMissing(true)
        }
      } catch {
        if (!cancelled) setMissing(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId])

  const productIds = order ? order.items.map((i) => i.productId) : []

  useEffect(() => {
    let cancelled = false
    if (order && order.status === 'verified' && productIds.length > 0) {
      setDecrypting(true)
      setDecryptError('')
      void (async () => {
        try {
          const catalog = getProductsByIds(products, productIds)
          const results: InvoiceAsset[] = []
          for (const pid of productIds) {
            const product = catalog.find((p) => p.id === pid)
            if (!product) continue
            const asset = await api.getAccess(order.id, pid)
            if (asset?.link) {
              results.push({
                productId: pid,
                label: asset.label,
                desc: asset.desc,
                link: asset.link,
              })
            }
          }
          if (!cancelled) setAssets(results)
        } catch (err) {
          const msg = err instanceof Error ? err.message : ''
          if (!cancelled && !msg.includes('NOT_VERIFIED')) {
            setDecryptError('تعذر تحميل ملفات الاستلام حالياً، حاول مرة أخرى')
          }
        } finally {
          if (!cancelled) setDecrypting(false)
        }
      })()
    } else {
      setAssets([])
      setDecrypting(false)
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status, products])

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      /* ignore */
    }
  }

  const printInvoice = () => {
    window.print()
  }

  if (loading) {
    return <PageLoader label="جارِ تحميل الفاتورة..." />
  }

  if (missing || !order) {
    return (
      <div className="container-app py-20 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-600" />
        <h1 className="mt-4 text-xl font-black text-white">
          لم نعثر على هذه الفاتورة
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          تأكد من رابط الفاتورة أو جرّب البحث عن طلبك من صفحة تتبع الطلب.
        </p>
        <Link to="/track" className="btn-primary mt-6">
          تتبع الطلب
        </Link>
      </div>
    )
  }

  const statusColors = ORDER_STATUS_COLORS[order.status]
  const statusLabel = ORDER_STATUS_LABELS[order.status]

  return (
    <div className="container-app max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-white">فاتورة الطلب</h1>
        <div className="flex gap-2">
          <button
            onClick={printInvoice}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <Printer className="h-3.5 w-3.5" />
            طباعة
          </button>
          <Link
            to="/track"
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            تتبع طلب آخر
          </Link>
        </div>
      </div>

      <div className="card mt-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">رقم الطلب</p>
            <p className="mt-1 font-mono text-lg font-black tracking-widest text-white">
              {order.id}
            </p>
            <p className="mt-2 text-xs text-slate-500">{formatDate(order.createdAt)}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${statusColors}`}
          >
            {order.status === 'verified' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : order.status === 'rejected' ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <LockKeyhole className="h-3.5 w-3.5" />
            )}
            {statusLabel}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs font-bold text-cyan-300">بيانات العميل</p>
            <p className="mt-2 text-sm font-bold text-white">{order.customer.name}</p>
            {order.customer.email && (
              <p className="mt-1 text-xs text-slate-400" dir="ltr">
                {order.customer.email}
              </p>
            )}
            {order.customer.telegram && (
              <p className="mt-1 text-xs text-slate-400">تيليجرام: {order.customer.telegram}</p>
            )}
            {order.customer.phone && (
              <p className="mt-1 text-xs text-slate-400">الهاتف: {order.customer.phone}</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs font-bold text-cyan-300">الدفع</p>
            <p className="mt-2 text-sm font-bold text-white">
              {paymentMethodLabel(order.payment.method, settings.paymentMethodLabels)}
            </p>
            <p className="mt-1 text-xs text-slate-400" dir="ltr">
              {order.payment.txHash}
            </p>
            {order.payment.receiptDataUrl && (
              <img
                src={order.payment.receiptDataUrl}
                alt="إيصال الدفع"
                className="mt-3 max-h-40 rounded-lg border border-slate-800"
              />
            )}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500">
                <th className="px-4 py-2 text-start font-bold">المنتج</th>
                <th className="px-4 py-2 text-center font-bold">الكمية</th>
                <th className="px-4 py-2 text-end font-bold">السعر</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.productId} className="border-b border-slate-800/60">
                  <td className="px-4 py-3 font-bold text-slate-200">{item.title}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{item.qty}</td>
                  <td className="px-4 py-3 text-end text-slate-200">
                    {formatUSD(item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <p className="text-slate-400">
            المجموع الفرعي: <b className="text-slate-200">{formatUSD(order.subtotal)}</b>
          </p>
          {order.discount > 0 && (
            <p className="text-emerald-400">
              الخصم: -{formatUSD(order.discount)}
            </p>
          )}
          <p className="text-lg font-black text-white">
            الإجمالي: {formatUSD(order.total)}
          </p>
          <p className="text-xs text-slate-400">≈ {formatSAR(order.total)}</p>
        </div>

        {order.status === 'verified' && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-black">ملفات الاستلام جاهزة</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              طلبك مؤكد بنجاح، إليك كل ما اشتريته.
            </p>
            {decrypting ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                جارِ تجهيز الملفات...
              </div>
            ) : assets.length > 0 ? (
              <div className="mt-4 space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset.productId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-slate-900/60 p-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{asset.label}</p>
                      {asset.desc && (
                        <p className="mt-0.5 text-xs text-slate-400">{asset.desc}</p>
                      )}
                    </div>
                    <a
                      href={asset.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-emerald-400"
                    >
                      <Download className="h-3.5 w-3.5" />
                      تحميل
                    </a>
                    <button
                      onClick={() => void copyLink(asset.link)}
                      className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/10"
                    >
                      نسخ الرابط
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                {decryptError ||
                  'لم نجد ملفات استلام لهذا الطلب حالياً، تواصل معنا إن احتجت مساعدة.'}
              </p>
            )}
          </div>
        )}

        {order.status === 'pending' && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 text-amber-300">
              <LockKeyhole className="h-5 w-5" />
              <h2 className="font-black">بانتظار التأكيد</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              سنراجع طلبك ونؤكده قريباً، وعندها ستجد ملفات الاستلام في هذه الصفحة.
            </p>
          </div>
        )}

        {order.status === 'rejected' && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
            <div className="flex items-center gap-2 text-rose-300">
              <XCircle className="h-5 w-5" />
              <h2 className="font-black">لم يتم تأكيد الطلب</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              للأسف لم نتمكن من تأكيد هذا الطلب، تواصل معنا عبر تيليجرام
              {settings.supportTelegramUsername
                ? ` ${settings.supportTelegramUsername}`
                : ''}{' '}
              إن كان لديك استفسار.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-500">شكراً لثقتك بمتجرنا</p>
          <Link to="/" className="text-xs font-bold text-cyan-300 hover:text-cyan-200">
            العودة للمتجر
          </Link>
        </div>
      </div>
    </div>
  )
}
