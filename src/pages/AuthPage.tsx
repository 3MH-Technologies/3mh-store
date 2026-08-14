import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { isValidEmail } from '../lib/format'

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

export function AuthPage() {
  const { login, register } = useStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telegram, setTelegram] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [captcha, setCaptcha] = useState<Captcha>(makeCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (honeypot.trim()) {
      navigate('/')
      return
    }
    setError('')
    if (!isValidEmail(email.trim())) {
      setError('أدخل بريداً إلكترونياً صحيحاً')
      return
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (mode === 'register') {
      if (name.trim().length < 3) {
        setError('أدخل اسمك الكامل (3 أحرف على الأقل)')
        return
      }
      if (captchaInput.trim() !== captcha.answer) {
        setError('إجابة التحقق الأمني غير صحيحة')
        setCaptcha(makeCaptcha())
        setCaptchaInput('')
        return
      }
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          telegram: telegram.trim(),
          honeypot,
        })
      }
      const from = sessionStorage.getItem('3mh-auth-redirect')
      sessionStorage.removeItem('3mh-auth-redirect')
      navigate(from || '/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('RATE_LIMIT')) {
        setError('محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة')
      } else if (msg.includes('EMAIL_TAKEN')) {
        setMode('login')
        setError('هذا البريد مسجل بالفعل — سجّل الدخول')
      } else if (msg.includes('BAD_CREDENTIALS')) {
        setError('البريد أو كلمة المرور غير صحيحة')
      } else if (msg.includes('NETWORK')) {
        setError('تعذر الاتصال بالخادم — حاول مرة أخرى')
      } else {
        setError(msg || 'حدث خطأ غير متوقع')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-app max-w-md py-12">
      <div className="card p-7">
        <div className="text-center">
          <span className="chip border border-cyan-400/30 bg-cyan-400/5 text-cyan-300">
            {mode === 'login' ? (
              <LogIn className="h-3.5 w-3.5" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </span>
          <h1 className="mt-4 text-2xl font-black text-white">
            {mode === 'login' ? 'مرحباً بعودتك' : 'أنشئ حسابك'}
          </h1>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            {mode === 'login'
              ? 'سجّل الدخول لمتابعة الطلبات وإتمام عملية الشراء.'
              : 'حسابك مطلوب لإتمام الطلبات ومتابعة الأصول بشكل آمن.'}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-1 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`rounded-lg py-2.5 transition ${
              mode === 'login'
                ? 'bg-cyan-400/15 text-cyan-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError('')
            }}
            className={`rounded-lg py-2.5 transition ${
              mode === 'register'
                ? 'bg-cyan-400/15 text-cyan-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            حساب جديد
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="name">الاسم الكامل</label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="name"
                  className="input ps-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد العلي"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="email"
                type="email"
                dir="ltr"
                className="input ps-10 text-left"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">كلمة المرور</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                dir="ltr"
                className="input px-10 text-left"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300"
                aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="label" htmlFor="telegram">تيليجرام (اختياري)</label>
                <div className="relative">
                  <Send className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="telegram"
                    dir="ltr"
                    className="input ps-10 text-left"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@username"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
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
            </>
          )}

          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute -left-96 h-px w-px opacity-0"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button type="button" className="btn-primary w-full" onClick={() => void submit()} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === 'login' ? 'جارٍ تسجيل الدخول...' : 'جارٍ إنشاء الحساب...'}
              </>
            ) : (
              <>
                {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
              </>
            )}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] leading-5 text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            كلمات المرور تُخزَّن مشفّرة (PBKDF2) ولا يمكن لأحد قراءتها — حتى الإدارة.
          </p>
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-slate-500">
        <LockKeyhole className="h-3.5 w-3.5" />
        الحساب ضروري لمتابعة طلباتك وأصولك بأمان.
        <Link to="/" className="font-black text-cyan-300 hover:underline">
          العودة للمتجر
        </Link>
      </p>
    </div>
  )
}