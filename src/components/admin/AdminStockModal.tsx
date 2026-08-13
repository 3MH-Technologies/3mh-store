import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  EyeOff,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import type { Product, StockItem } from '../../types'
import { api, getAdminToken } from '../../lib/api'
import { Modal } from '../ui/Modal'

interface Props {
  product: Product
  onClose: () => void
  notify: (m: string, t?: 'success' | 'error' | 'info') => void
}

interface RowState {
  [id: string]: boolean
}

const EMPTY = { email: '', password: '', secret: '', verifyCode: '' }

export function AdminStockModal({ product, onClose, notify }: Props) {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [bulk, setBulk] = useState('')
  const [shown, setShown] = useState<RowState>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const token = getAdminToken()
      if (!token) {
        notify('انتهت الجلسة، سجّل الدخول مجدداً', 'error')
        setLoading(false)
        return
      }
      try {
        const list = await api.getStock(token, product.id)
        if (!cancelled) setItems(list)
      } catch {
        if (!cancelled) notify('تعذر تحميل المخزون', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const counts = useMemo(() => {
    const used = items.filter((i) => i.used).length
    return { total: items.length, available: items.length - used, used }
  }, [items])

  const addFormItem = () => {
    const email = form.email.trim()
    const password = form.password.trim()
    const secret = form.secret.trim()
    const verifyCode = form.verifyCode.trim()
    if (!email && !password && !secret && !verifyCode) return
    setItems((prev) => [
      ...prev,
      {
        id: `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        email,
        password,
        secret,
        verifyCode,
        used: false,
        orderId: null,
        usedAt: null,
      },
    ])
    setForm(EMPTY)
  }

  const addBulk = () => {
    const lines = bulk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return
    const added: StockItem[] = []
    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim())
      const [email = '', password = '', secret = '', verifyCode = ''] = parts
      if (!email && !password && !secret && !verifyCode) continue
      added.push({
        id: `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        email,
        password,
        secret,
        verifyCode,
        used: false,
        orderId: null,
        usedAt: null,
      })
    }
    if (added.length === 0) return
    setItems((prev) => [...prev, ...added])
    setBulk('')
    notify(`تمت إضافة ${added.length} عنصر من الدفعة`, 'success')
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateItem = (id: string, key: keyof StockItem, value: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)))
  }

  const save = async () => {
    setSaving(true)
    try {
      const token = getAdminToken()
      if (!token) {
        notify('انتهت الجلسة، سجّل الدخول مجدداً', 'error')
        return
      }
      await api.saveStock(token, product.id, items)
      notify(`تم حفظ مخزون «${product.name}» — المتاح ${counts.available}`, 'success')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      notify(
        msg.includes('UNAUTHORIZED')
          ? 'انتهت صلاحية الجلسة، سجّل الدخول مجدداً'
          : 'تعذر حفظ المخزون، حاول مرة أخرى',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleShown = (id: string) =>
    setShown((s) => ({ ...s, [id]: !s[id] }))

  return (
    <Modal open onClose={onClose} maxWidth="max-w-3xl" title={`مخزون «${product.name}»`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="chip border border-slate-700 text-slate-300">
          الإجمالي: {counts.total}
        </span>
        <span className="chip border border-emerald-400/30 text-emerald-300">
          متاح: {counts.available}
        </span>
        <span className="chip border border-amber-400/30 text-amber-300">
          مُسلَّم: {counts.used}
        </span>
        <p className="w-full text-[10px] leading-5 text-slate-500">
          يُخصَّص عنصر تلقائياً عند اعتماد الدفع، وتظهر بياناته للمشتري في صفحة
          الطلب. كود التحقق يُرسل من الدعم يدوياً.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          جارٍ تحميل المخزون...
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <input
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input text-[11px]"
              placeholder="البريد الإلكتروني"
            />
            <input
              dir="ltr"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input text-[11px]"
              placeholder="كلمة السر"
            />
            <input
              dir="ltr"
              value={form.secret}
              onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
              className="input text-[11px]"
              placeholder="قيمة السر"
            />
            <input
              dir="ltr"
              value={form.verifyCode}
              onChange={(e) => setForm((f) => ({ ...f, verifyCode: e.target.value }))}
              className="input text-[11px]"
              placeholder="كود التحقق"
            />
            <button
              type="button"
              className="btn-primary px-3 py-2 text-[11px]"
              onClick={addFormItem}
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-[10px] font-bold text-slate-400">
              إضافة دفعة — كل سطر بالشكل: إيميل | كلمة سر | قيمة سر | كود تحقق
            </p>
            <textarea
              dir="ltr"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              className="input mt-2 min-h-20 font-mono text-[11px]"
              placeholder={'user1@gmail.com | pass123 | secret1 | code1\nuser2@gmail.com | pass456 | secret2 | code2'}
            />
            <button
              type="button"
              className="btn-ghost mt-2 px-3 py-1.5 text-[11px]"
              onClick={addBulk}
            >
              <Upload className="h-3.5 w-3.5" />
              إضافة الدفعة
            </button>
          </div>

          {items.length === 0 ? (
            <div className="card mt-4 p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-xs font-bold text-slate-400">
                لا يوجد مخزون لهذا المنتج — أضف عناصر أعلاه
              </p>
            </div>
          ) : (
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pe-1">
              {items.map((item, index) => {
                const visible = Boolean(shown[item.id])
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-slate-500">
                        عنصر #{index + 1}
                        {item.used && (
                          <span className="ms-2 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-amber-300">
                            مُسلَّم ({item.orderId})
                          </span>
                        )}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-md border border-slate-700 p-1 text-slate-400 hover:text-cyan-300"
                          onClick={() => toggleShown(item.id)}
                          aria-label="إظهار/إخفاء"
                        >
                          {visible ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-700 p-1 text-slate-400 hover:text-rose-300"
                          onClick={() => removeItem(item.id)}
                          aria-label="حذف العنصر"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {(
                        [
                          ['email', 'البريد الإلكتروني'],
                          ['password', 'كلمة السر'],
                          ['secret', 'قيمة السر'],
                          ['verifyCode', 'كود التحقق'],
                        ] as [keyof StockItem, string][]
                      ).map(([key, label]) => (
                        <div key={key} className="relative">
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500">
                            {label}
                          </span>
                          <input
                            dir="ltr"
                            type={visible || key === 'email' ? 'text' : 'password'}
                            value={item[key] as string}
                            onChange={(e) => updateItem(item.id, key, e.target.value)}
                            className="input py-2 pe-2 ps-24 text-start text-[11px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-5 flex gap-3">
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>
          إلغاء
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => void save()}
          disabled={loading || saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          حفظ المخزون ({counts.total})
        </button>
      </div>
    </Modal>
  )
}