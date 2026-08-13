import { useState } from 'react'
import {
  BadgeDollarSign,
  Check,
  ClipboardCopy,
  CreditCard,
  FileCheck2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { paymentMethodLabel } from '../lib/orders'
import type { WalletConfig } from '../types'

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
      <p dir="ltr" className="min-w-0 flex-1 break-all text-center text-xs font-bold text-cyan-200">
        {address}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded-lg bg-cyan-500 px-3 py-2 text-[11px] font-black text-slate-950 transition hover:bg-cyan-400"
        aria-label="نسخ العنوان"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
        {copied ? 'تم النسخ' : 'نسخ'}
      </button>
    </div>
  )
}

const STEPS = [
  {
    icon: Wallet,
    title: 'اختر محفظتك',
    desc: 'اختر الطريقة المناسبة لك من المحافظ المتاحة أدناه واضغط نسخ.',
  },
  {
    icon: BadgeDollarSign,
    title: 'ادفع المبلغ الصحيح',
    desc: 'أرسل قيمة الطلب بالعملة الصحيحة على الشبكة المحددة (لا ترسل على شبكة أخرى).',
  },
  {
    icon: FileCheck2,
    title: 'احفظ معرف العملية TxID',
    desc: 'بعد الإرسال ستجد معرف العملية في المحفظة أو البورصة — انسخه كاملاً.',
  },
  {
    icon: Send,
    title: 'أرسل طلبك مع الإثبات',
    desc: 'أضف المنتجات للسلة، أدخل بياناتك وألصق TxID مع صورة الإثبات وانتظر التوثيق.',
  },
]

export function PaymentMethodsPage() {
  const { settings } = useStore()
  const wallets = settings.wallets ?? []
  const [active, setActive] = useState<WalletConfig | null>(null)

  return (
    <div className="container-app max-w-4xl py-12">
      <div className="text-center">
        <span className="chip border border-cyan-400/30 bg-cyan-400/5 text-cyan-300">
          <CreditCard className="h-3.5 w-3.5" />
          طرق الدفع المعتمدة
        </span>
        <h1 className="section-title mt-4">طرق الدفع المتاحة</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-400">
          الدفع يتم الآن عبر بوابة <b className="text-cyan-300">Plisio</b> الآمنة
          — عند إتمام الطلب تُفتح لك فاتورة دفع تُؤكد تلقائياً فور اكتمال التحويل
          (BTC، ETH، USDT وغيرها).
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => (
          <button
            key={w.method}
            type="button"
            onClick={() => setActive(w)}
            className={`card p-5 text-start transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 ${
              active?.method === w.method ? 'border-cyan-400/50' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-white">{w.name}</p>
              <span className="chip border border-slate-700 text-slate-400">
                {w.short}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {paymentMethodLabel(w.method, settings.paymentMethodLabels)}
            </p>
            <p
              dir="ltr"
              className="mt-3 truncate text-start text-[11px] font-bold text-cyan-200/80"
            >
              {w.address}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-black text-cyan-300">
              <ClipboardCopy className="h-3.5 w-3.5" />
              عرض العنوان والنسخ
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div className="card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-white">{active.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {paymentMethodLabel(active.method, settings.paymentMethodLabels)}
              </p>
            </div>
            {active.kind === 'phone' && (
              <span className="chip border border-amber-400/30 text-amber-300">
                تحويل رقمي (فودافون/إنستاباي)
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold text-slate-400">
              {active.kind === 'phone' ? 'رقم الاستقبال' : 'عنوان المحفظة'}
            </p>
            <CopyAddress address={active.address} />
          </div>
          {active.instruction && (
            <p className="mt-3 text-xs leading-6 text-slate-300">
              {active.instruction}
            </p>
          )}
          {active.note && (
            <p className="mt-2 text-[11px] text-amber-300/90">ملاحظة: {active.note}</p>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            تأكد من اختيار الشبكة الصحيحة قبل الإرسال — الأموال المرسلة على شبكة
            خاطئة لا يمكن استرجاعها.
          </p>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-base font-black text-white">خطوات الشراء والدفع</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="card p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                <step.icon className="h-4 w-4 text-cyan-300" />
              </span>
              <p className="mt-3 text-sm font-black text-white">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MessageSquareText className="h-5 w-5 text-cyan-300" />
          </span>
          <div>
            <p className="text-sm font-black text-white">واجهت مشكلة في الدفع؟</p>
            <p className="text-[11px] text-slate-400">
              راسل الدعم وسنساعدك في إتمام طلبك بأمان.
            </p>
          </div>
        </div>
        <a
          href={settings.supportTelegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          <Send className="h-4 w-4" />
          مراسلة الدعم
        </a>
      </div>
    </div>
  )
}