import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ClipboardCopy,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { api, getAdminToken, setAdminToken } from '../lib/api'
import type { Order, SiteSettings } from '../types'
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  paymentMethodLabel,
} from '../lib/orders'
import { formatDate, formatUSD } from '../lib/format'
import { useStore } from '../context/StoreContext'
import { PageLoader } from '../components/Spinner'
import { Modal } from '../components/ui/Modal'
import { AdminProductsTab } from '../components/admin/AdminProductsTab'
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab'

type StatusFilter = Order['status'] | 'all'
type AdminTab = 'orders' | 'products' | 'settings'

export function AdminPage() {
  const { notify, settings } = useStore()
  const [authed, setAuthed] = useState(
    () => Boolean(getAdminToken())
  )

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} notify={notify} />
  }
  return (
    <AdminDashboard
      onLogout={() => {
        setAdminToken(null)
        setAuthed(false)
      }}
      notify={notify}
      settings={settings}
    />
  )
}

function AdminLogin({
  onSuccess,
  notify,
}: {
  onSuccess: () => void
  notify: (m: string, t?: 'success' | 'error' | 'info') => void
}) {
  const [pin, setPin] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const token = await api.adminLogin(pin.trim())
      setAdminToken(token)
      onSuccess()
      notify('تم تسجيل الدخول بنجاح، أهلاً بك', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('INVALID_PIN')) {
        setError('رمز الدخول غير صحيح، حاول مرة أخرى')
      } else {
        setError('تعذر الاتصال بالخادم حالياً، حاول بعد قليل')
      }
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-app flex max-w-md flex-col py-20">
      <div className="card p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
          <LockKeyhole className="h-6 w-6 text-purple-300" />
        </div>
        <h1 className="mt-5 text-center text-xl font-black text-white">
          لوحة التحكم — دخول المشرف
        </h1>
        <p className="mt-2 text-center text-xs text-slate-400">
          المنطقة محمية بكلمة مرور خاصة بالفريق الإداري فقط.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setError('')
              }}
              placeholder="••••••••"
              className="input py-3 text-center text-xl tracking-[0.5em]"
              aria-label="كلمة المرور"
              maxLength={32}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="إظهار الرقم"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'جارِ التحقق...' : 'دخول'}
          </button>
          <Link
            to="/"
            className="block text-center text-xs font-bold text-slate-500 hover:text-cyan-300"
          >
            العودة إلى المتجر
          </Link>
        </form>
      </div>
    </div>
  )
}

function AdminDashboard({
  onLogout,
  notify,
  settings,
}: {
  onLogout: () => void
  notify: (m: string, t?: 'success' | 'error' | 'info') => void
  settings: SiteSettings
}) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Order | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [tab, setTab] = useState<AdminTab>('orders')

const load = async () => {
    setLoading(true)
    try {
      const token = getAdminToken()
      if (!token) {
        notify('انتهت الجلسة، سجّل الدخول مرة أخرى', 'error')
        return
      }
      const list = await api.listOrders(token)
      setOrders(list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)))
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('UNAUTHORIZED')) {
        notify('انتهت صلاحية الجلسة، سجّل الدخول مجدداً', 'error')
      } else {
        notify('تعذر تحميل الطلبات، تحقق من الاتصال', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  )

  const stats = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === 'pending').length,
      verified: orders.filter((o) => o.status === 'verified').length,
      rejected: orders.filter((o) => o.status === 'rejected').length,
      revenue: orders
        .filter((o) => o.status === 'verified')
        .reduce((sum, o) => sum + o.total, 0),
    }),
    [orders]
  )

const setStatus = async (order: Order, status: Order['status']) => {
    setBusyId(order.id)
    try {
      const token = getAdminToken()
      if (!token) {
        notify('انتهت الجلسة، سجّل الدخول مرة أخرى', 'error')
        return
      }
      await api.updateOrderStatus(token, order.id, status)
      notify(
        status === 'verified'
          ? `تم تأكيد الطلب ${order.id}${order.customer.telegram ? ` وتم إرسال رابط الاستلام إلى تيليجرام ${order.customer.telegram}` : ''}`
          : `تم رفض الطلب ${order.id}`,
        status === 'verified' ? 'success' : 'info'
      )
      await load()
} catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('UNAUTHORIZED')) {
        notify('انتهت صلاحية الجلسة، سجّل الدخول مجدداً', 'error')
      } else if (msg.includes('ORDER_NOT_FOUND')) {
        notify('الطلب غير موجود', 'error')
      } else if (msg.includes('NO_STOCK')) {
        notify(msg, 'error')
      } else {
        notify('تعذر تحديث حالة الطلب', 'error')
      }
    } finally {
      setBusyId(null)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify('تم النسخ', 'success')
    } catch {
      notify('تعذر النسخ', 'error')
    }
  }

  return (
    <div className="container-app py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">لوحة تحكم الطلبات</h1>
          <p className="mt-1 text-xs text-slate-400">
            إدارة طلبات المتجر والتحقق من عمليات الدفع.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
          <button type="button" className="btn-ghost" onClick={onLogout}>
            خروج
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { id: 'orders', label: 'الطلبات' },
            { id: 'products', label: 'المنتجات' },
            { id: 'settings', label: 'الإعدادات' },
          ] as { id: AdminTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`chip ${
              tab === t.id
                ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && <AdminProductsTab className="mt-6" />}
      {tab === 'settings' && <AdminSettingsTab className="mt-6" />}

      {tab === 'orders' && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="قيد المراجعة" value={stats.pending} color="text-amber-300" icon={<Inbox />} />
        <StatCard label="تم التحقق" value={stats.verified} color="text-emerald-300" icon={<BadgeCheck />} />
        <StatCard label="مرفوضة" value={stats.rejected} color="text-rose-300" icon={<X />} />
        <StatCard
          label="إيرادات موثقة"
          value={formatUSD(stats.revenue)}
          color="text-cyan-300"
          icon={<TrendingUp />}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            { id: 'all', label: 'الكل' },
            { id: 'pending', label: ORDER_STATUS_LABELS.pending },
            { id: 'verified', label: ORDER_STATUS_LABELS.verified },
            { id: 'rejected', label: ORDER_STATUS_LABELS.rejected },
          ] as { id: StatusFilter; label: string }[]
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`chip ${
              filter === f.id
                ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader label="جارٍ تحميل الطلبات..." />
      ) : visible.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-300">
            لا توجد طلبات في هذه القائمة
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.map((order) => {
            const isOpen = expanded === order.id
            return (
              <div key={order.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-start"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${ORDER_STATUS_COLORS[order.status]}`}
                    >
                      {order.status === 'pending' && <Inbox className="h-4 w-4" />}
                      {order.status === 'verified' && <ShieldCheck className="h-4 w-4" />}
                      {order.status === 'rejected' && <X className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="font-mono text-sm font-black text-white" dir="ltr">
                        {order.id}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {order.customer.name} · {formatUSD(order.total)} ·{' '}
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`chip border ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-700/60 p-5">
                    <div className="grid gap-5 md:grid-cols-3">
                      <div>
                        <p className="mb-2 text-xs font-bold text-slate-500">العميل</p>
                        <div className="space-y-1 text-xs text-slate-300">
                          <p className="font-bold text-slate-200">{order.customer.name}</p>
                          <p dir="ltr" className="text-start">{order.customer.email}</p>
                          <p dir="ltr" className="text-start">
                            {order.customer.telegram || order.customer.phone}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold text-slate-500">المنتجات</p>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {order.items.map((item) => (
                            <li key={item.productId} className="flex justify-between gap-2">
                              <span className="line-clamp-1">{item.title}</span>
                              <span className="shrink-0">
                                {item.qty} × {formatUSD(item.price)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold text-slate-500">الدفع</p>
                        <div className="space-y-1 text-xs text-slate-300">
                          <p>{paymentMethodLabel(order.payment.method, settings.paymentMethodLabels)}</p>
                          <p className="flex items-center gap-1.5 break-all">
                            <code dir="ltr" className="text-cyan-300">
                              {order.payment.txHash}
                            </code>
                            <button
                              type="button"
                              onClick={() => void copy(order.payment.txHash)}
                              className="shrink-0 text-slate-500 hover:text-cyan-300"
                              aria-label="نسخ المعرف"
                            >
                              <ClipboardCopy className="h-3.5 w-3.5" />
                            </button>
                          </p>
                          {order.payment.receiptDataUrl && (
                            <a
                              href={order.payment.receiptDataUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 font-bold text-slate-300 hover:border-cyan-400/50"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              عرض مرفق الإثبات
                            </a>
                          )}
                          {order.notes && (
                            <p className="mt-2 text-slate-400">ملاحظة: {order.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-700/60 pt-4">
                      {order.status !== 'verified' && (
                        <button
                          type="button"
                          className="btn-success"
                          disabled={busyId === order.id}
                          onClick={() => setConfirm(order)}
                        >
                          {busyId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          اعتماد الدفع
                        </button>
                      )}
                      {order.status !== 'rejected' && (
                        <button
                          type="button"
                          className="btn-danger"
                          disabled={busyId === order.id}
                          onClick={() => {
                            setRejectMode(true)
                            setConfirm(order)
                          }}
                        >
                          <X className="h-4 w-4" />
                          رفض الطلب
                        </button>
                      )}
                      <Link
                        to={`/invoice/${order.id}`}
                        className="btn-ghost"
                        target="_blank"
                      >
                        فتح الفاتورة
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          order={confirm}
          action={rejectMode ? 'reject' : 'approve'}
          onCancel={() => {
            setConfirm(null)
            setRejectMode(false)
          }}
          onConfirm={() => {
            const target = confirm
            setConfirm(null)
            const mode = rejectMode
            setRejectMode(false)
            void setStatus(target, mode ? 'rejected' : 'verified')
          }}
        />
      )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string | number
  color: string
  icon: ReactNode
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
        {icon}
      </span>
      <div>
        <p className={`text-xl font-black ${color}`}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function ConfirmModal({
  order,
  action,
  onCancel,
  onConfirm,
}: {
  order: Order
  action: 'approve' | 'reject'
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open
      onClose={onCancel}
      maxWidth="max-w-md"
      title={action === 'approve' ? 'اعتماد الدفع' : 'رفض الطلب'}
    >
      <div className="text-sm leading-7 text-slate-300">
        <p>
          {action === 'approve' ? (
            <>
              هل أنت متأكد من اعتماد عملية الطلب{' '}
              <b dir="ltr" className="text-white">{order.id}</b>؟
              سيتم تفعيل روابط الأصول في الفاتورة فوراً.
            </>
          ) : (
            <>
              سيتم وضع الطلب{' '}
              <b dir="ltr" className="text-white">{order.id}</b> كرفض، ولن تُفتح
              روابط الأصول. يمكنك التراجع لاحقاً بقبول جديد.
            </>
          )}
        </p>
      </div>
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
          تراجع
        </button>
        <button
          type="button"
          className={action === 'approve' ? 'btn-success flex-1' : 'btn-danger flex-1'}
          onClick={onConfirm}
        >
          {action === 'approve' ? 'نعم، اعتمد' : 'نعم، ارفض'}
        </button>
      </div>
    </Modal>
  )
}