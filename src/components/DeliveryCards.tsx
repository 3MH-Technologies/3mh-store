import { useState } from 'react'
import { Check, Copy, Headphones, KeyRound, Mail, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react'
import type { DeliveryItem } from '../types'
import { useStore } from '../context/StoreContext'

interface Props {
  deliveries: DeliveryItem[]
}

function FieldRow({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir?: 'ltr'
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
        <p
          dir={dir}
          className="truncate text-start text-xs font-bold text-slate-100"
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded-md border border-slate-700 p-1.5 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300"
        aria-label={`نسخ ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

export function DeliveryCards({ deliveries }: Props) {
  const { settings } = useStore()
  return (
    <div className="space-y-4">
      {deliveries.map((d, idx) => (
        <div
          key={`${d.productId}-${idx}`}
          className="rounded-xl border border-cyan-400/25 bg-slate-900/50 p-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-extrabold text-white">{d.title}</p>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            بيانات الحساب المخصصة لك — احفظها فوراً ولا تشاركها مع أحد.
          </p>
          <div className="mt-3 space-y-2">
            <FieldRow label="البريد الإلكتروني للحساب" value={d.email} dir="ltr" />
            <FieldRow label="كلمة السر" value={d.password} dir="ltr" />
            <FieldRow label="قيمة السر" value={d.secret} dir="ltr" />
            <FieldRow label="كود التحقق" value={d.verifyCode} dir="ltr" />
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-300" />
          <p className="text-xs font-black text-amber-200">
            مهم: كود التحقق يُرسل يدوياً من فريق الدعم
          </p>
        </div>
        <p className="mt-2 text-[11px] leading-6 text-slate-300">
          كود التحقق أعلاه يُفعّل عند مراسلة فريق الدعم، وسيُرسل لك على البريد
          الإلكتروني الذي أدخلته عند الشراء. اذكر في رسالتك رقم الطلب والبريد
          الإلكتروني المستخدم لضمان وصول الكود إليك.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.supportTelegramUrl && (
            <a
              href={settings.supportTelegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-black text-slate-950 transition hover:bg-cyan-400"
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              مراسلة الدعم — تيليجرام
            </a>
          )}
          {settings.supportEmail && (
            <a
              href={`mailto:${settings.supportEmail}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition hover:border-cyan-400/50"
            >
              <Mail className="h-3.5 w-3.5" />
              {settings.supportEmail}
            </a>
          )}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
          <Headphones className="h-3 w-3" />
          البريد الذي أدخلته في الطلب هو الذي سيستقبل كود التحقق.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
        <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <p className="text-[10px] leading-5 text-slate-400">
          تُحفظ بياناتك مشفرة ولا تظهر إلا لصاحب الطلب بعد تأكيد الدفع. في حال
          فقدانها لا نستطيع استعادتها — احتفظ بها في مكان آمن.
        </p>
      </div>
    </div>
  )
}