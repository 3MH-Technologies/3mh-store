import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Check,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Package,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react'
import type { Product } from '../../types'
import { ICONS } from '../../lib/icons'
import { formatUSD } from '../../lib/format'
import { useStore } from '../../context/StoreContext'
import { api, getAdminToken } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { AdminStockModal } from './AdminStockModal'

const GRADIENTS = [
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-orange-500',
  'from-amber-400 to-orange-600',
  'from-fuchsia-500 to-pink-600',
  'from-sky-400 to-cyan-600',
  'from-lime-500 to-emerald-600',
]

const ICON_NAMES = Object.keys(ICONS)

interface Draft {
  id: string
  name: string
  category: string
  price: string
  originalPrice: string
  tag: string
  icon: string
  gradient: string
  image: string
  description: string
  features: string
  sales: string
  rating: string
  accessLabel: string
  accessPayload: string
}

function toDraft(p: Product): Draft {
  const plain =
    p.access?.payload && !p.access.iv ? p.access.payload : ''
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: String(p.price),
    originalPrice: String(p.originalPrice),
    tag: p.tag,
    icon: p.icon,
    gradient: p.gradient,
    image: p.image ?? '',
    description: p.description,
    features: p.features.join('\n'),
    sales: String(p.sales),
    rating: String(p.rating),
    accessLabel: p.access?.label ?? '',
    accessPayload: plain,
  }
}

function emptyDraft(): Draft {
  return {
    id: '',
    name: '',
    category: '',
    price: '',
    originalPrice: '',
    tag: '',
    icon: 'Bot',
    gradient: GRADIENTS[0],
    image: '',
    description: '',
    features: '',
    sales: '0',
    rating: '5',
    accessLabel: '',
    accessPayload: '',
  }
}

export function AdminProductsTab({ className = '' }: { className?: string }) {
  const { products, saveProducts, settings, notify } = useStore()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [stockFor, setStockFor] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState<'file' | 'image' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      [p.name, p.description, p.tag].join(' ').toLowerCase().includes(q)
    )
  }, [products, query])

  const totalPrice = products.reduce((sum, p) => sum + p.price, 0)

  const makeId = () =>
    `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

  const openNew = () => {
    setEditingId(null)
    setDraft({ ...emptyDraft(), id: makeId() })
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setDraft(toDraft(p))
  }

  const readFileBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || '')
        resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result)
      }
      reader.onerror = () => reject(new Error('تعذر قراءة الملف'))
      reader.readAsDataURL(file)
    })

  const uploadFile = async (kind: 'file' | 'image', file: File) => {
    if (!draft) return
    const token = getAdminToken()
    if (!token) {
      notify('انتهت صلاحية الجلسة، سجّل الدخول مجدداً', 'error')
      return
    }
    if (kind === 'file' && file.size > 12 * 1024 * 1024) {
      notify('الملف كبير جداً — الحد الأقصى 12MB', 'error')
      return
    }
    if (kind === 'image' && file.size > 3 * 1024 * 1024) {
      notify('الصورة كبيرة جداً — الحد الأقصى 3MB', 'error')
      return
    }
    setUploading(kind)
    try {
      const base64 = await readFileBase64(file)
      const result = await api.uploadAsset(
        token,
        kind,
        draft.id,
        file.name,
        base64
      )
      if (kind === 'image') {
        set('image', result.url)
        notify('تم رفع الصورة — احفظ المنتج لتأكيدها', 'success')
      } else {
        set('accessPayload', result.url)
        notify('تم رفع الملف — الرابط التلقائي جاهز، احفظ المنتج', 'success')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      notify(
        msg.includes('UNAUTHORIZED')
          ? 'انتهت صلاحية الجلسة، سجّل الدخول مجدداً'
          : msg.includes('VALIDATION')
            ? msg.replace(/^.*?VALIDATION[^:]*:\s*/, '')
            : 'تعذر رفع الملف، حاول مرة أخرى',
        'error'
      )
    } finally {
      setUploading(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft) return
    setSaving(true)
    try {
      const id = editingId || draft.id || makeId()

      const payload = draft.accessPayload.trim()
      const existing = editingId
        ? products.find((p) => p.id === editingId)
        : null
      let access: { label: string; payload: string; iv: string }
      if (payload) {
        access = {
          label: draft.accessLabel.trim() || 'ملف الاستلام',
          payload,
          iv: '',
        }
      } else if (existing?.access?.payload) {
        access = { ...existing.access }
      } else {
        access = { label: draft.accessLabel.trim(), payload: '', iv: '' }
      }

      const product: Product = {
        id,
        name: draft.name.trim(),
        category: draft.category,
        price: Number(draft.price) || 0,
        originalPrice: Number(draft.originalPrice) || Number(draft.price) || 0,
        tag: draft.tag.trim(),
        icon: draft.icon,
        gradient: draft.gradient,
        image: draft.image.trim() || undefined,
        description: draft.description.trim(),
        features: draft.features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        specs: [],
        sales: Number(draft.sales) || 0,
        rating: Math.min(5, Math.max(0, Number(draft.rating) || 5)),
        access,
      }
      const next = editingId
        ? products.map((p) => (p.id === editingId ? product : p))
        : [...products, product]
      await saveProducts(next)
      notify(editingId ? 'تم تحديث المنتج' : 'تمت إضافة المنتج', 'success')
      setDraft(null)
      setEditingId(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      notify(
        msg.includes('UNAUTHORIZED')
          ? 'انتهت صلاحية الجلسة، سجّل الدخول مجدداً'
          : 'تعذر حفظ التغييرات، حاول مرة أخرى',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await saveProducts(products.filter((p) => p.id !== deleting.id))
      notify('تم حذف المنتج', 'success')
      setDeleting(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      notify(
        msg.includes('UNAUTHORIZED')
          ? 'انتهت صلاحية الجلسة، سجّل الدخول مجدداً'
          : 'تعذر حفظ التغييرات، حاول مرة أخرى',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">إدارة المنتجات</h2>
          <p className="mt-1 text-xs text-slate-400">
            {products.length} منتج · القيمة الإجمالية {formatUSD(totalPrice)}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openNew}>
          <Plus className="h-4 w-4" />
          منتج جديد
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث في المنتجات..."
        className="input mt-4"
        aria-label="بحث في المنتجات"
      />

      {visible.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <p className="text-sm font-bold text-slate-300">لا توجد منتجات</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="bg-slate-900/70 text-slate-400">
                <th className="px-4 py-3 text-start font-bold">المنتج</th>
                <th className="px-4 py-3 text-center font-bold">الفئة</th>
                <th className="px-4 py-3 text-end font-bold">السعر</th>
                <th className="px-4 py-3 text-center font-bold">المبيعات</th>
                <th className="px-4 py-3 text-center font-bold">المخزون</th>
                <th className="px-4 py-3 text-center font-bold">التسليم</th>
                <th className="px-4 py-3 text-end font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((p) => {
                const Icon = ICONS[p.icon] ?? ICONS.Code2
                return (
                  <tr key={p.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-10 w-10 shrink-0 rounded-lg border border-slate-700 object-cover"
                          />
                        ) : (
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${p.gradient}`}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 line-clamp-1">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {p.tag}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {settings.categories.find((c) => c.id === p.category)?.ar ??
                        p.category}
                    </td>
                    <td className="px-4 py-3 text-end font-black text-white">
                      {formatUSD(p.price)}
                      {p.originalPrice > p.price && (
                        <span className="ms-1.5 text-[10px] font-bold text-slate-500 line-through">
                          {formatUSD(p.originalPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{p.sales}</td>
                    <td className="px-4 py-3 text-center">
                      {p.stock ? (
                        <button
                          type="button"
                          onClick={() => setStockFor(p)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-black transition ${
                            p.stock.available > 0
                              ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300 hover:bg-emerald-400/10'
                              : 'border-rose-400/30 bg-rose-400/5 text-rose-300 hover:bg-rose-400/10'
                          }`}
                        >
                          <Package className="h-3 w-3" />
                          {p.stock.available} / {p.stock.total}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStockFor(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-500 transition hover:border-cyan-400/40 hover:text-cyan-300"
                        >
                          <Package className="h-3 w-3" />
                          إدارة
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.access?.payload && p.access.iv ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <LockKeyhole className="h-3 w-3" />
                          مشفر
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:border-cyan-400/50 hover:text-cyan-300"
                          onClick={() => openEdit(p)}
                          aria-label={`تعديل ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
                          onClick={() => setDeleting(p)}
                          aria-label={`حذف ${p.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {stockFor && (
        <AdminStockModal
          product={stockFor}
          onClose={() => setStockFor(null)}
          notify={notify}
        />
      )}

      {draft && (
        <Modal
          open
          onClose={() => setDraft(null)}
          maxWidth="max-w-2xl"
          title={editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        >
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  اسم المنتج
                </span>
                <input
                  required
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="input"
                  placeholder="مثال: أداة سحب بيانات — Pro"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  الشارة (tag)
                </span>
                <input
                  value={draft.tag}
                  onChange={(e) => set('tag', e.target.value)}
                  className="input"
                  placeholder="الأكثر مبيعاً"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  الفئة
                </span>
                <select
                  value={draft.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="input"
                >
                  {settings.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ar}
                    </option>
                  ))}
                </select>
                {!settings.categories.some((c) => c.id === draft.category) &&
                  draft.category && (
                    <span className="mt-1 block text-[10px] text-amber-300">
                      فئة غير معرّفة — أضفها من تبويب الإعدادات
                    </span>
                  )}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  الأيقونة
                </span>
                <select
                  value={draft.icon}
                  onChange={(e) => set('icon', e.target.value)}
                  className="input"
                >
                  {ICON_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  السعر ($)
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price}
                  onChange={(e) => set('price', e.target.value)}
                  className="input"
                  placeholder="49"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  السعر قبل الخصم ($)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.originalPrice}
                  onChange={(e) => set('originalPrice', e.target.value)}
                  className="input"
                  placeholder="99"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  المبيعات
                </span>
                <input
                  type="number"
                  min="0"
                  value={draft.sales}
                  onChange={(e) => set('sales', e.target.value)}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  التقييم (0–5)
                </span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={draft.rating}
                  onChange={(e) => set('rating', e.target.value)}
                  className="input"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-400">
                الوصف
              </span>
              <textarea
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                className="input min-h-20"
                placeholder="وصف قصير يظهر في المتجر"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-400">
                المميزات (كل ميزة في سطر)
              </span>
              <textarea
                value={draft.features}
                onChange={(e) => set('features', e.target.value)}
                className="input min-h-24"
                placeholder={'دفعة واحدة\nتحديثات مجانية\nضمان 7 أيام'}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  تدرج الألوان
                </span>
                <select
                  value={draft.gradient}
                  onChange={(e) => set('gradient', e.target.value)}
                  className="input"
                >
                  {GRADIENTS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-400">
                  تسمية رابط التسليم (اختياري)
                </span>
                <input
                  value={draft.accessLabel}
                  onChange={(e) => set('accessLabel', e.target.value)}
                  className="input"
                  placeholder="الملف الرقمي"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Paperclip className="h-4 w-4 text-cyan-300" />
                    ملف المنتج (التسليم)
                  </span>
                  <button
                    type="button"
                    className="btn-primary px-3 py-1.5 text-[11px]"
                    disabled={uploading !== null}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading === 'file' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    رفع ملف
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void uploadFile('file', file)
                    }}
                  />
                </div>
                {draft.accessPayload ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-2.5">
                    <span className="mt-0.5 text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-emerald-300">
                        رابط تلقائي جاهز
                      </p>
                      <p
                        dir="ltr"
                        className="truncate text-start text-[10px] text-slate-400"
                        title={draft.accessPayload}
                      >
                        {draft.accessPayload}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md p-1 text-slate-500 hover:text-rose-300"
                      onClick={() => set('accessPayload', '')}
                      aria-label="إزالة رابط الملف"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    ارفع ملف المنتج وسيُنشأ له رابط تلقائياً (يُشفر ولا يُعرض إلا
                    بعد التحقق من الدفع).
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <ImagePlus className="h-4 w-4 text-purple-300" />
                    صورة المنتج
                  </span>
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-[11px]"
                    disabled={uploading !== null}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {uploading === 'image' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    رفع صورة
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void uploadFile('image', file)
                    }}
                  />
                </div>
                <div className="mt-3">
                  {draft.image ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={draft.image}
                        alt="معاينة"
                        className="h-16 w-16 rounded-lg border border-slate-700 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-emerald-300">
                          صورة مرفوعة
                        </p>
                        <p
                          dir="ltr"
                          className="truncate text-start text-[10px] text-slate-500"
                          title={draft.image}
                        >
                          {draft.image}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1 text-slate-500 hover:text-rose-300"
                        onClick={() => set('image', '')}
                        aria-label="إزالة الصورة"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] leading-5 text-slate-500">
                      بدون صورة — ستظهر الأيقونة والتدرج اللوني.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-400">
                رابط التسليم / محتوى الأصول
              </span>
              <textarea
                value={draft.accessPayload}
                onChange={(e) => set('accessPayload', e.target.value)}
                className="input min-h-16 font-mono text-[11px]"
                placeholder="https://drive.google.com/..."
              />
              <span className="mt-1 block text-[10px] leading-5 text-slate-500">
                يُشفر تلقائياً AES-GCM (بمفتاح الأصول) عند الحفظ ولا يظهر إلا
                للعميل بعد التحقق من الدفع. استخدم زر «رفع ملف» أعلاه لتوليد
                الرابط تلقائياً، أو اتركه فارغاً لإبقاء الرابط الحالي دون تغيير.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setDraft(null)}
              >
                إلغاء
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          maxWidth="max-w-sm"
          title="حذف المنتج"
        >
          <div className="flex items-start gap-3 text-sm leading-7 text-slate-300">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-300" />
            <p>
              هل أنت متأكد من حذف «<b className="text-white">{deleting.name}</b>»؟
              لن يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" className="btn-ghost flex-1" onClick={() => setDeleting(null)}>
              تراجع
            </button>
            <button type="button" className="btn-danger flex-1" onClick={() => void confirmDelete()}>
              حذف
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
