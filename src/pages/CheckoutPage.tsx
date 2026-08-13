import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  User,
  Wallet,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { computeOrderTotals } from '../lib/orders'
import { formatSAR, formatUSD, isValidEmail } from '../lib/format'
import { api } from '../lib/api'

type Step = 'info' | 'submit' | 'done'

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
  const { cart, clearCart } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [walletError, setWalletError] = useState('')
  const [captcha, setCaptcha] = useState<Captcha>(makeCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [lastAttempt, setLastAttempt] = useState(0)

  const totals = useMemo(() => computeOrderTotals(cart), [cart])

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
        paymentMethod: 'plisio',
        honeypot: form.honeypot,
      })
      clearCart()
      navigate(`/pay/${order.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
      if (msg.includes('RATE_LIMIT')) {
        setWalletError('طلبات كثيرة جداً خلال فترة قصيرة. انتظر قليلاً ثم أعد المحاولة')
      } else if (msg.includes('PLISIO')) {
        setWalletError('بوابة الدفع غير متاحة حالياً — حاول لاحقاً')
      } else {
        setWalletError(`حدث خطأ أثناء إرسال الطلب: ${msg} ؟ يرجى المحاولة مرة أخرى`)
      }
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

  if (step === 'done') {
    return (
      <div className="container-app max-w-2xl py-16 text-center">
        <div className="card p-8">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          <h1 className="mt-4 text-2xl font-black text-white">تم استلام طلبك</h1>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            تم إنشاء طلبك بنجاح، راقب حالته من صفحة التتبع.
          </p>
          <Link to="/" className="btn-primary mt-6">
            العودة إلى المتجر
          </Link>
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
          { id: 'submit', label: 'التأكيد والدفع' },
        ].map((item, index, arr) => {
          const active = step === item.id
          const done = ['submit', 'done'].includes(step) && index === 0
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
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    كود التحقق لحسابات المخزون يُرسل على هذا البريد من فريق
                    الدعم بعد مراسلته.
                  </p>
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
                  بعد تأكيد الدفع ولا تُردّ بعد فتح روابط الأصول.
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
                  if (validateInfo()) setStep('submit')
                }}
              >
                متابعة إلى التأكيد والدفع
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'submit' && (
            <div className="space-y-5">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
                <LockKeyhole className="h-4 w-4 text-cyan-400" />
                تأكيد الطلب والدفع
              </h2>

              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4">
                <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  الدفع عبر Plisio — بوابة دفع آمنة
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-300">
                  بعد تأكيد الطلب سيتم تحويلك لصفحة الدفع الآمنة عبر Plisio
                  (BTC، ETH، USDT وغيرها). يتم تأكيد طلبك وتفعيل روابط الأصول
                  <b className="text-emerald-300"> تلقائياً </b>فور اكتمال التحويل
                  — بدون مراجعة يدوية.
                </p>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  مدة صلاحية الفاتورة: 30 دقيقة — إن انتهت صلاحيتها يمكنك إنشاء
                  فاتورة جديدة من صفحة تتبع الطلب.
                </p>
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
                  onClick={() => setStep('info')}
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
                      جارٍ إنشاء الطلب وفتح صفحة الدفع...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      تأكيد والانتقال للدفع
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