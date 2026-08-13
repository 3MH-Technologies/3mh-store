import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  User,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import type { PaymentMethod } from '../types'
import { computeOrderTotals, paymentMethodLabel } from '../lib/orders'
import { formatSAR, formatUSD, isValidEmail } from '../lib/format'
import { api } from '../lib/api'
import type { Order } from '../types'

type Step = 'info' | 'pay' | 'submit' | 'done'

interface FormState {
  name: string
  email: string
  telegram: string
  phone: string
  terms: boolean
  honeypot: string
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  telegram: '',
  phone: '',
  terms: false,
  honeypot: '',
}

interface Captcha {
  q: string
  answer: string
}

function makeCaptcha(): Captcha {
  const a = 1 + Math.floor(Math.random() * 9)
  const b = 1 + Math.floor(Math.random() * 9)
  const mul = Math.random() < 0.5
  const answer = mul ? a * b : a + b
  return { q: mul ? `${a} × ${b}` : `${a} + ${b}`, answer: String(answer) }
}

export function CheckoutPage() {
  const { cart, clearCart, notify, settings } = useStore()
  const wallets = settings.wallets
  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [method, setMethod] = useState<PaymentMethod>(settings.wallets[0]?.method ?? 'usdt-trc20')
  const [txHash, setTxHash] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const [walletError, setWalletError] = useState('')
  const [captcha, setCaptcha] = useState<Captcha>(makeCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [lastAttempt, setLastAttempt] = useState(0)

  const totals = useMemo(() => computeOrderTotals(cart), [cart])
  const wallet = wallets.find((w) => w.method === method) ?? wallets[0]
  const qrText = wallet?.kind === 'address' ? wallet.address : `تحويل إلى ${wallet?.address ?? ''}`

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (method) {
      import('qrcode').then(({ default: QRCode }) => {
        QRCode.toDataURL(qrText, {
          margin: 1,
          width: 240,
          color: { dark: '#0b0f17', light: '#ffffff' },
        })
          .then((url) => {
            if (!cancelled) setQrDataUrl(url)
          })
          .catch(() => {
            if (!cancelled) setQrDataUrl(null)
          })
      })
    } else {
      setQrDataUrl(null)
    }
    return () => {
      cancelled = true
    }
  }, [method, qrText])

  const validateInfo = (): boolean => {
    const next: typeof errors = {}
    if (form.name.trim().length < 3) next.name = 'أدخل الاسم الكامل (3 أحرف على الأقل)'
    if (!isValidEmail(form.email)) next.email = 'أدخل بريداً إلكترونياً صحيحاً'
    if (!form.telegram.trim() && !form.phone.trim()) {
      next.telegram = 'أدخل تيليجرام أو رقم هاتف للتواصل'
    }
    if (!form.terms) next.terms = 'يجب الموافقة على شروط الاستخدام'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(`تم نسخ ${label}`, 'success')
    } catch {
      notify('تعذر النسخ، انسخ يدوياً', 'error')
    }
  }

  const handleReceipt = (file: File | null) => {
    if (!file) {
      setReceiptFile(null)
      return
    }
    if (file.size > 2_500_000) {
      setWalletError('حجم المرفق يتجاوز 2.5MB، ارفع صورة أصغر')
      return
    }
    setWalletError('')
    const reader = new FileReader()
    reader.onload = () => setReceiptFile(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (form.honeypot.trim()) {
      clearCart()
      setStep('done')
      return
    }
    if (Date.now() - lastAttempt < 10000) {
      setWalletError('انتظر قليلاً قبل إعادة المحاولة')
      return
    }
    const cleanHash = txHash.trim()
    if (cleanHash.length < 6) {
      setWalletError('أدخل معرف العملية (TxID) — لا يقل عن 6 أحرف')
      return
    }
    if (!form.terms) {
      setWalletError('يجب الموافقة على شروط الاستخدام')
      return
    }
    if (captchaInput.trim() !== captcha.answer) {
      setWalletError('إجابة التحقق الأمني غير صحيحة — أعد المحاولة')
      setCaptcha(makeCaptcha())
      setCaptchaInput('')
      return
    }
    setWalletError('')
    setSubmitting(true)
    setLastAttempt(Date.now())
    try {
      const order = await api.createOrder({
        items: cart.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
        })),
        customer: {
          name: form.name.trim(),
          email: form.email.trim(),
          telegram: form.telegram.trim(),
          phone: form.phone.trim(),
        },
        paymentMethod: method,
        txHash: cleanHash,
        receiptDataUrl: receiptFile,
        notes,
        honeypot: form.honeypot,
      })
      setCreatedOrder(order)
      clearCart()
      setStep('done')
      notify(`تم إنشاء طلبك بنجاح رقم ${order.id}`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
      if (msg.includes('NO_GITHUB_CONFIG')) {
        setWalletError(
          'عذراً، المتجر غير مهيأ حالياً. يرجى المحاولة لاحقاً'
        )
      } else if (msg.includes('RATE_LIMITED')) {
        setWalletError(
          'طلبات كثيرة جداً خلال فترة قصيرة. انتظر قليلاً ثم أعد المحاولة'
        )
      } else if (msg.includes('ORDER_REJECTED')) {
        setWalletError(
          'تعذر تأكيد الطلب في الوقت الحالي. يرجى المحاولة بعد قليل'
        )
      } else {
        setWalletError(`حدث خطأ أثناء إرسال الطلب: ${msg} ؟ يرجى المحاولة مرة أخرى`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0 && step !== 'done') {
    return (
      <div className="container-app py-20 text-center">
        <ShoppingCartIcon />
        <h1 className="mt-4 text-xl font-black text-white">السلة فارغة</h1>
        <p className="mt-2 text-sm text-slate-400">
          أضف منتجات من المتجر قبل إتمام عملية الشراء.
        </p>
        <Link to="/" className="btn-primary mt-6">
          العودة إلى المتجر
        </Link>
      </div>
    )
  }

  if (step === 'done' && createdOrder) {
    return (
      <div className="container-app max-w-2xl py-16 text-center">
        <div className="card p-8">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          <h1 className="mt-4 text-2xl font-black text-white">تم استلام طلبك</h1>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            تم إنشاء طلبك بنجاح، فريق المراجعة يتحقق من العملية الآن.
            راقب حالتك من صفحة تتبع الطلب برقم الطلب:
          </p>
          <p className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-lg font-black tracking-wider text-cyan-300" dir="ltr">
            {createdOrder.id}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to={`/track/${createdOrder.id}`} className="btn-primary">
              تتبع الطلب الآن
            </Link>
            <Link to={`/invoice/${createdOrder.id}`} className="btn-ghost">
              <FileText className="h-4 w-4" />
              عرض الفاتورة
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            تأكد من مراجعة بريدك الإلكتروني، وسنبلغك بأي استفسار عبر تيليجرام
            <span dir="ltr"> @{settings.supportTelegramUsername}</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-app max-w-5xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">إتمام الطلب</h1>
        <Link to="/" className="text-xs font-bold text-slate-400 hover:text-cyan-300">
          مواصلة التسوق
        </Link>
      </div>

      <ol className="mt-6 flex items-center gap-2 text-xs font-bold">
        {[
          { id: 'info', label: 'بياناتك' },
          { id: 'pay', label: 'الدفع' },
          { id: 'submit', label: 'التأكيد' },
        ].map((item, index, arr) => {
          const active = step === item.id
          const done = ['pay', 'submit', 'done'].includes(step)
            ? index < arr.findIndex((i) => i.id === step)
            : false
          return (
            <li key={item.id} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${
                  done || active
                    ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300'
                    : 'border-slate-700 text-slate-500'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={active ? 'text-cyan-300' : 'text-slate-500'}
              >
                {item.label}
              </span>
              {index < arr.length - 1 && (
                <ArrowLeft className="mx-1 h-3.5 w-3.5 text-slate-600" />
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="card p-6">
          {step === 'info' && (
            <div className="space-y-5">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
                <User className="h-4 w-4 text-cyan-400" />
                معلومات العميل
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">الاسم الكامل</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="name"
                      className={`input ps-10 ${errors.name ? 'border-rose-500' : ''}`}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="مثال: أحمد محمد العلي"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-xs text-rose-400">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="email">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      dir="ltr"
                      className={`input ps-10 text-left ${errors.email ? 'border-rose-500' : ''}`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="name@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-400">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="telegram">تيليجرام (يُفضّل)</label>
                  <div className="relative">
                    <Send className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="telegram"
                      dir="ltr"
                      className={`input ps-10 text-left ${errors.telegram ? 'border-rose-500' : ''}`}
                      value={form.telegram}
                      onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                  {errors.telegram && (
                    <p className="mt-1 text-xs text-rose-400">{errors.telegram}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="phone">رقم الهاتف (اختياري)</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="phone"
                      dir="ltr"
                      className="input ps-10 text-left"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+9665xxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs leading-6 text-slate-400">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.checked })}
                  className="mt-1 h-4 w-4 accent-cyan-400"
                />
                <span>
                  أوافق على شروط الاستخدام، وأقر بأن المنتجات الرقمية تُسلم
                  بعد التحقق من العملية ولا تُردّ بعد فتح روابط الأصول.
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs text-rose-400">{errors.terms}</p>
              )}

              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute -left-96 h-px w-px opacity-0"
                value={form.honeypot}
                onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
              />

              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  if (validateInfo()) setStep('pay')
                }}
              >
                متابعة إلى الدفع
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'pay' && wallet && (
            <div className="space-y-6">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
                <Banknote className="h-4 w-4 text-cyan-400" />
                اختر طريقة الدفع
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {wallets.map((w) => (
                  <button
                    key={w.method}
                    type="button"
                    onClick={() => setMethod(w.method)}
                    className={`rounded-xl border p-4 text-start transition-colors ${
                      method === w.method
                        ? 'border-cyan-400/60 bg-cyan-400/10'
                        : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-white">
                        {w.name}
                      </span>
                      {method === w.method && (
                        <Check className="h-4 w-4 text-cyan-300" />
                      )}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {w.kind === 'phone' ? 'رقم محفظة' : 'عنوان شبكة'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5">
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  <div className="flex flex-col items-center gap-2">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code ${wallet.name}`}
                        className="h-40 w-40 rounded-xl border border-slate-700 bg-white p-2"
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
                        <QrCode className="h-10 w-10 text-slate-600" />
                      </div>
                    )}
                    <span className="text-[11px] text-slate-500">
                      امسح الرمز أو انسخ البيانات
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-extrabold text-white">{wallet.name}</p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-700 bg-brand-900 px-3 py-2">
                      <code
                        dir="ltr"
                        className="min-w-0 flex-1 truncate text-xs text-cyan-300"
                      >
                        {wallet.address}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(wallet.address, 'العنوان')}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-cyan-300"
                        aria-label="نسخ العنوان"
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-300">
                      {wallet.instruction}
                    </p>
                    <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-[11px] leading-5 text-amber-200">
                      <b>المبلغ المطلوب:</b> {formatUSD(totals.total)} ≈{' '}
                      {formatSAR(totals.total)}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{wallet.note}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setStep('info')}
                >
                  <ArrowRight className="h-4 w-4" />
                  رجوع
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={() => setStep('submit')}
                >
                  أكملت الدفع — متابعة
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'submit' && (
            <div className="space-y-5">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
                <LockKeyhole className="h-4 w-4 text-cyan-400" />
                إثبات عملية الدفع
              </h2>
              <p className="text-xs leading-6 text-slate-400">
                أرسل معرف العملية أو أرفق لقطة من التحويل عبر{' '}
                <b className="text-slate-200">{paymentMethodLabel(method, settings.paymentMethodLabels)}</b>.
                المراجعة اليدوية تستغرق عادةً أقل من ساعة، وسيُفتح رابط الأصول
                فور التحقق.
              </p>

              <div>
                <label className="label" htmlFor="txHash">
                  معرف العملية (Transaction Hash / TxID)
                </label>
                <input
                  id="txHash"
                  dir="ltr"
                  className={`input text-left ${walletError && !txHash ? 'border-rose-500' : ''}`}
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x4f8a2c… أو 6 أحرف على الأقل"
                />
              </div>

              <div>
                <label className="label" htmlFor="receipt">
                  مرفق الإثبات (اختياري — لقطة شاشة، حد أقصى 2.5MB)
                </label>
                <input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  className="block w-full cursor-pointer text-xs text-slate-400 file:me-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-white"
                  onChange={(e) => handleReceipt(e.target.files?.[0] ?? null)}
                />
                {receiptFile && (
                  <img
                    src={receiptFile}
                    alt="مرفق إثبات الدفع"
                    className="mt-3 max-h-40 rounded-lg border border-slate-700"
                  />
                )}
              </div>

              <div>
                <label className="label" htmlFor="notes">ملاحظات إضافية (اختياري)</label>
                <textarea
                  id="notes"
                  className="input min-h-20 resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل تساعد في التحقق من العملية..."
                />
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                <label className="label" htmlFor="captcha">
                  تحقق أمني — أجب عن السؤال
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-black text-cyan-300"
                    dir="ltr"
                  >
                    {captcha.q} = ؟
                  </span>
                  <input
                    id="captcha"
                    inputMode="numeric"
                    className="input flex-1"
                    value={captchaInput}
                    onChange={(e) =>
                      setCaptchaInput(e.target.value.replace(/[^0-9]/g, ''))
                    }
                    placeholder="الإجابة"
                    maxLength={3}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCaptcha(makeCaptcha())
                      setCaptchaInput('')
                    }}
                    className="btn-ghost shrink-0"
                    aria-label="تغيير السؤال"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {walletError && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {walletError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm">
                <span className="text-slate-400">إجمالي الطلب</span>
                <span className="font-black text-white">
                  {formatUSD(totals.total)}{' '}
                  <span className="text-xs text-cyan-300">
                    ≈ {formatSAR(totals.total)}
                  </span>
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setStep('pay')}
                  disabled={submitting}
                >
                  <ArrowRight className="h-4 w-4" />
                  رجوع
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ حفظ الطلب...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      تأكيد الطلب النهائي
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="card h-fit p-5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ملخص الطلب
          </h3>
          <div className="mt-4 space-y-3">
            {cart.map(({ product, qty }) => (
              <div key={product.id} className="flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-bold leading-5 text-slate-200">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-slate-500">الكمية: {qty}</p>
                </div>
                <span className="shrink-0 font-black text-slate-200">
                  {formatUSD(product.price * qty)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-700/60 pt-4 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>الإجمالي الفرعي</span>
              <span className="font-bold text-slate-200">{formatUSD(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>الخصم الترويجي</span>
                <span className="font-bold text-emerald-400">
                  − {formatUSD(totals.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>التوصيل</span>
              <span className="font-bold text-emerald-400">مجاني (رقمي)</span>
            </div>
            <div className="flex justify-between border-t border-slate-700/60 pt-3 text-sm">
              <span className="font-extrabold text-white">الإجمالي</span>
              <div className="text-start">
                <p className="font-black text-white">{formatUSD(totals.total)}</p>
                <p className="text-[11px] font-bold text-cyan-300">
                  ≈ {formatSAR(totals.total)}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ShoppingCartIcon() {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
      <ShoppingCart className="h-7 w-7 text-slate-500" />
    </div>
  )
}