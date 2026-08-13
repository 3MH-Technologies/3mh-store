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
} from 'lucide-react'
import { githubDB } from '../lib/github'
import { getProductsByIds } from '../lib/products'
import { useStore } from '../context/StoreContext'
import { decryptAccess } from '../lib/crypto'
import type { Order, SiteSettings } from '../types'
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

  useEffect(() => {
    let cancelled = false
    if (!orderId) {
      setMissing(true)
      setLoading(false)
      return
    }
    void (async () => {
      try {
        const found = await githubDB.findOrder(orderId)
        if (found) {
          if (!cancelled) setOrder(found)
          if (!cancelled) setMissing(false)
        } else {
          if (!cancelled) setMissing(true)
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

  useEffect(() => {
    let cancelled = false
    if (!order || order.status !== 'verified') {
      setAssets([])
      setDecrypting(false)
      return
    }
    setDecrypting(true)
    void (async () => {
      const catalog = getProductsByIds(
        products,
        order.items.map((i) => i.productId)
      )
      const results: InvoiceAsset[] = []
      for (const item of order.items) {
        const product = catalog.find((p) => p.id === item.productId)
        if (!product) continue
        const decrypted = await decryptAccess(product.access, product.id)
        if (decrypted.link) {
          results.push({
            productId: product.id,
            label: decrypted.label,
            desc: decrypted.desc,
            link: decrypted.link,
          })
        }
      }
      if (!cancelled) setAssets(results)
      if (!cancelled) setDecrypting(false)
    })()
    return () => {
      cancelled = true
    }
  }, [order, products])

  if (loading) return <PageLoader label="Ã«—Ú  Õ„Ì· «·›« Ê—…..." />

  if (missing || !order) {
    return (
      <div className="container-app max-w-md py-20 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-600" />
        <h1 className="mt-4 text-xl font-black text-white">›« Ê—… €Ì— „ÊÃÊœ…</h1>
        <p className="mt-2 text-sm text-slate-400">
          ·«  ÊÃœ ›« Ê—… »Â–« «·—ﬁ„°  √ﬂœ „‰ «·—«»ÿ √Ê  Ê«’· „⁄ «·œ⁄„.
        </p>
        <Link to="/track" className="btn-primary mt-6">
            »⁄ ÿ·»ﬂ
        </Link>
      </div>
    )
  }

  const verified = order.status === 'verified'

  return (
    <div className="container-app max-w-4xl py-10">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">«·›« Ê—… «·—ﬁ„Ì…</h1>
          <p className="mt-1 text-xs text-slate-400">
            ›« Ê—… —”„Ì… ﬁ«»·… ··ÿ»«⁄… Ê«· Õ„Ì· PDF
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            ÿ»«⁄… / PDF
          </button>
          <Link to={`/track/${order.id}`} className="btn-ghost">
              »⁄ «·ÿ·»
          </Link>
        </div>
      </div>

      <div className="print-area card overflow-hidden p-0">
        <InvoiceHeader order={order} settings={settings} />
        <InvoiceBody order={order} settings={settings} />
        {verified ? (
          <InvoiceAssets
            assets={assets}
            decrypting={decrypting}
            orderId={order.id}
          />
        ) : (
          <div className="print-dark border-t border-slate-800 p-6 sm:p-8">
            <div className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
              <LockKeyhole className="h-5 w-5 shrink-0 text-amber-300" />
              <div className="text-xs leading-6 text-slate-300">
                <p className="font-bold text-amber-200">—Ê«»ÿ «· ”·Ì„ „ﬁ›·…</p>
                <p>
                   ı› Õ —Ê«»ÿ «·√’Ê·  ·ﬁ«∆Ì« ›Ì Â–Â «·›« Ê—… ›Ê— «· Õﬁﬁ „‰
                  ⁄„·Ì… «·œ›⁄ ó «·Õ«·… «·Õ«·Ì…:{' '}
                  {ORDER_STATUS_LABELS[order.status]}.
                </p>
              </div>
            </div>
          </div>
        )}
        <InvoiceFooter settings={settings} />
      </div>
    </div>
  )
}

function InvoiceHeader({ order, settings }: { order: Order; settings: SiteSettings }) {
  return (
    <div className="border-b border-slate-800 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 text-lg font-black text-white">
              3
            </span>
            <div>
              <p className="text-sm font-black tracking-wide text-white">
                {settings.companyName}
              </p>
              <p className="text-[11px] text-slate-400">
                {settings.appNameAr} ó {settings.appName}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-xs text-slate-400">
            <p>
              »—Ìœ «·œ⁄„: <span dir="ltr">{settings.supportEmail}</span>
            </p>
            <p>
               Ì·ÌÃ—«„:{' '}
              <a
                href={`https://t.me/${settings.supportTelegramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
                dir="ltr"
              >
                @{settings.supportTelegramUsername}
              </a>
            </p>
          </div>
        </div>

        <div className="text-end">
          <p className="text-xs font-bold text-slate-500">›« Ê—… ≈·ﬂ —Ê‰Ì…</p>
          <p className="mt-1 font-mono text-lg font-black tracking-wider text-white" dir="ltr">
            {order.id}
          </p>
          <p className="mt-2 text-xs text-slate-400">
             «—ÌŒ «·≈‰‘«¡: {formatDate(order.createdAt)}
          </p>
          {order.verifiedAt && (
            <p className="mt-0.5 text-xs text-slate-400">
               «—ÌŒ «· Õﬁﬁ: {formatDate(order.verifiedAt)}
            </p>
          )}
          <span
            className={`chip mt-3 border ${ORDER_STATUS_COLORS[order.status]}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>
    </div>
  )
}

function InvoiceBody({ order, settings }: { order: Order; settings: SiteSettings }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">»Ì«‰«  «·⁄„Ì·</p>
          <div className="space-y-1 text-sm text-slate-200">
            <p className="font-extrabold">{order.customer.name}</p>
            <p dir="ltr" className="text-start text-xs">
              {order.customer.email}
            </p>
            <p dir="ltr" className="text-start text-xs">
              {order.customer.telegram || order.customer.phone || 'ó'}
            </p>
          </div>
        </div>
        <div className="sm:text-end">
          <p className="mb-2 text-xs font-bold text-slate-500">»Ì«‰«  «·œ›⁄</p>
          <div className="space-y-1 text-xs text-slate-300">
            <p>
              «·ÿ—Ìﬁ…: <b>{paymentMethodLabel(order.payment.method, settings.paymentMethodLabels)}</b>
            </p>
            <p className="break-all">
              „⁄—› «·⁄„·Ì…:{' '}
              <code dir="ltr" className="text-cyan-300">
                {order.payment.txHash}
              </code>
            </p>
            <p>‰Ê⁄ «· ”·Ì„: {order.deliveryType}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-900/70 text-slate-400">
              <th className="px-4 py-3 text-start font-bold">«·„‰ Ã</th>
              <th className="px-4 py-3 text-center font-bold">«·ﬂ„Ì…</th>
              <th className="px-4 py-3 text-end font-bold">«·”⁄—</th>
              <th className="px-4 py-3 text-end font-bold">«·≈Ã„«·Ì</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {order.items.map((item) => (
              <tr key={item.productId} className="text-slate-300">
                <td className="px-4 py-3 font-bold text-slate-200">
                  {item.title}
                </td>
                <td className="px-4 py-3 text-center">{item.qty}</td>
                <td className="px-4 py-3 text-end">{formatUSD(item.price)}</td>
                <td className="px-4 py-3 text-end font-black text-white">
                  {formatUSD(item.price * item.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 ms-auto w-full max-w-xs space-y-2 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>«·≈Ã„«·Ì «·›—⁄Ì</span>
          <span className="font-bold text-slate-200">{formatUSD(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-slate-400">
            <span>Œ’„  —ÊÌÃÌ</span>
            <span className="font-bold text-emerald-400">
              ? {formatUSD(order.discount)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-slate-400">
          <span>«· Ê’Ì·</span>
          <span className="font-bold text-emerald-400">„Ã«‰Ì</span>
        </div>
        <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
          <span className="font-extrabold text-white">«·≈Ã„«·Ì «·‰Â«∆Ì</span>
          <div className="text-end">
            <p className="font-black text-white">{formatUSD(order.total)}</p>
            <p className="text-[11px] font-bold text-cyan-300">
              ? {formatSAR(order.total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InvoiceAssets({
  assets,
  decrypting,
  orderId,
}: {
  assets: InvoiceAsset[]
  decrypting: boolean
  orderId: string
}) {
  return (
    <div className="border-t border-slate-800 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-extrabold text-emerald-300">
             „ «· Õﬁﬁ ó —Ê«»ÿ «·√’Ê· „›⁄·…
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Â–Â «·›« Ê—… „ÊÀﬁ… »—ﬁ„ «· Õﬁﬁ {orderId} ·œÏ ›—Ìﬁ 3MH TECHNOLOGIES.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {decrypting ? (
          <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ã«—Ú ›ﬂ  ‘›Ì— —Ê«»ÿ «· ”·Ì„...
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
                 Õ„Ì· «·√’Ê·
              </a>
            </div>
          ))
        ) : (
          <p className="py-3 text-xs text-slate-400">
            ·«   Ê›— —Ê«»ÿ  Õ„Ì· ·Â–Â «·√’Ê·°  Ê«’· „⁄ «·œ⁄„.
          </p>
        )}
      </div>
    </div>
  )
}

function InvoiceFooter({ settings }: { settings: SiteSettings }) {
  return (
    <div className="print-dark border-t border-slate-800 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          ‘ﬂ—« ·Àﬁ ﬂ„ ›Ì {settings.companyName} ó Ã„Ì⁄ «·„‰ Ã«  „—Œ’… Ê ”·Ì„Â«
          „ÊÀﬁ —ﬁ„Ì«.
        </p>
        <p className="text-xs text-slate-500" dir="ltr">
          {settings.appName} © 2026
        </p>
      </div>
    </div>
  )
}