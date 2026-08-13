import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react'
import type {
  FeatureCard,
  HeroStat,
  PaymentMethod,
  SiteSettings,
  StoreCategory,
  WalletConfig,
} from '../../types'
import { useStore } from '../../context/StoreContext'
import { ICONS } from '../../lib/icons'

const PAYMENT_METHODS: PaymentMethod[] = [
  'usdt-trc20',
  'usdt-bep20',
  'usdt-erc20',
  'btc',
  'eth',
  'trx',
  'ltc',
  'ton',
]

const DEFAULT_METHOD_LABELS: Record<PaymentMethod, string> = {
  'usdt-trc20': 'USDT (TRC20)',
  'usdt-bep20': 'USDT (BEP20)',
  'usdt-erc20': 'USDT (ERC20)',
  btc: 'Bitcoin (BTC)',
  eth: 'Ethereum (ETH)',
  trx: 'TRON (TRX)',
  ltc: 'Litecoin (LTC)',
  ton: 'TON',
}

const ICON_NAMES = Object.keys(ICONS)

function cloneSettings<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function emptyWallet(): WalletConfig {
  return {
    method: 'usdt-trc20',
    name: '',
    short: '',
    address: '',
    kind: 'address',
    instruction: '',
    note: '',
  }
}

function emptyCategory(): StoreCategory {
  return { id: '', ar: '', en: '' }
}

function emptyStat(): HeroStat {
  return { label: '', value: '', suffix: '', animate: true }
}

function emptyTrustCard(): FeatureCard {
  return { icon: 'Zap', title: '', desc: '' }
}

export function AdminSettingsTab({ className = '' }: { className?: string }) {
  const { settings, saveSettings, notify } = useStore()
  const [draft, setDraft] = useState<SiteSettings>(() => cloneSettings(settings))
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const setHero = <K extends keyof SiteSettings['hero']>(
    key: K,
    value: SiteSettings['hero'][K]
  ) => {
    setDraft((d) => ({ ...d, hero: { ...d.hero, [key]: value } }))
  }

  const setWallet = (index: number, patch: Partial<WalletConfig>) => {
    setDraft((d) => ({
      ...d,
      wallets: d.wallets.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    }))
  }

  const addWallet = () => {
    setDraft((d) => ({ ...d, wallets: [...d.wallets, emptyWallet()] }))
  }

  const removeWallet = (index: number) => {
    setDraft((d) => ({ ...d, wallets: d.wallets.filter((_, i) => i !== index) }))
  }

  const setLabel = (method: PaymentMethod, value: string) => {
    setDraft((d) => ({
      ...d,
      paymentMethodLabels: { ...d.paymentMethodLabels, [method]: value },
    }))
  }

  const setCategory = (index: number, patch: Partial<StoreCategory>) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.map((c, i) =>
        i === index ? { ...c, ...patch } : c
      ),
    }))
  }

  const addCategory = () => {
    setDraft((d) => ({ ...d, categories: [...d.categories, emptyCategory()] }))
  }

  const removeCategory = (index: number) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.filter((_, i) => i !== index),
    }))
  }

  const setStat = (index: number, patch: Partial<HeroStat>) => {
    setDraft((d) => ({
      ...d,
      hero: {
        ...d.hero,
        stats: d.hero.stats.map((s, i) =>
          i === index ? { ...s, ...patch } : s
        ),
      },
    }))
  }

  const addStat = () => {
    setDraft((d) => ({
      ...d,
      hero: { ...d.hero, stats: [...d.hero.stats, emptyStat()] },
    }))
  }

  const removeStat = (index: number) => {
    setDraft((d) => ({
      ...d,
      hero: {
        ...d.hero,
        stats: d.hero.stats.filter((_, i) => i !== index),
      },
    }))
  }

  const setTrustCard = (index: number, patch: Partial<FeatureCard>) => {
    setDraft((d) => ({
      ...d,
      trust: d.trust.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))
  }

  const addTrustCard = () => {
    setDraft((d) => ({ ...d, trust: [...d.trust, emptyTrustCard()] }))
  }

  const removeTrustCard = (index: number) => {
    setDraft((d) => ({ ...d, trust: d.trust.filter((_, i) => i !== index) }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const cleaned: SiteSettings = {
        ...draft,
        usdToSar: Number(draft.usdToSar) || 3.75,
        categories: draft.categories
          .map((c) => ({
            id: c.id.trim().toLowerCase().replace(/\s+/g, '-'),
            ar: c.ar.trim(),
            en: c.en.trim(),
          }))
          .filter((c) => c.id && c.ar),
        hero: {
          ...draft.hero,
          stats: draft.hero.stats.filter((s) => s.label.trim() && s.value.trim()),
          trustBadges: (Array.isArray(draft.hero.trustBadges)
            ? draft.hero.trustBadges
            : []
          )
            .map((b) => b.trim())
            .filter(Boolean),
        },
        trust: draft.trust.filter((t) => t.title.trim()),
        wallets: draft.wallets.filter((w) => w.address.trim()),
        paymentMethodLabels: {
          ...DEFAULT_METHOD_LABELS,
          ...draft.paymentMethodLabels,
        },
      }
      await saveSettings(cleaned)
      notify('تم حفظ الإعدادات وتفعيلها في المتجر فوراً', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      notify(
        msg.includes('UNAUTHORIZED')
          ? 'انتهت صلاحية الجلسة، سجّل الدخول مجدداً'
          : 'تعذر حفظ الإعدادات، حاول مرة أخرى',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setDraft(cloneSettings(settings))
    notify('تمت استعادة آخر إعدادات محفوظة', 'info')
  }

  return (
    <form onSubmit={submit} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">إعدادات المتجر</h2>
          <p className="mt-1 text-xs text-slate-400">
            تُحفظ في قاعدة البيانات وتُطبَّق فوراً على جميع الزوار.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={reset}
            disabled={saving}
          >
            <Undo2 className="h-4 w-4" />
            استعادة
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      <section className="card mt-6 p-5">
        <h3 className="text-sm font-black text-slate-200">الهوية العامة</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="اسم المتجر (إنجليزي)">
            <input
              value={draft.appName}
              onChange={(e) => set('appName', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="اسم المتجر (عربي)">
            <input
              value={draft.appNameAr}
              onChange={(e) => set('appNameAr', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="اسم الشركة">
            <input
              value={draft.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="الشعار / الوصف">
            <input
              value={draft.companyTagline}
              onChange={(e) => set('companyTagline', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="بريد الدعم">
            <input
              dir="ltr"
              value={draft.supportEmail}
              onChange={(e) => set('supportEmail', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="حساب تيليجرام (بدون @)">
            <input
              dir="ltr"
              value={draft.supportTelegramUsername}
              onChange={(e) => {
                const username = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                setDraft((d) => ({
                  ...d,
                  supportTelegramUsername: username,
                  supportTelegramUrl: username
                    ? `https://t.me/${username}`
                    : '',
                }))
              }}
              className="input"
            />
          </Field>
          <Field label="سعر صرف الدولار (ر.س)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.usdToSar}
              onChange={(e) => set('usdToSar', Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="ملاحظة التسليم">
            <input
              value={draft.deliveryNote}
              onChange={(e) => set('deliveryNote', e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <p className='mt-4 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-[11px] leading-5 text-slate-500'>
          رمز الدخول للوحة التحكم يُدار على الخادم عبر متغير البيئة{' '}
          <code dir='ltr' className='text-cyan-300'>ADMIN_PIN</code>{' '}
          ولا يظهر في المتصفح أبداً.
        </p>
      </section>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-200">أقسام المتجر</h3>
          <button type="button" className="btn-ghost" onClick={addCategory}>
            <Plus className="h-4 w-4" />
            إضافة قسم
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          تظهر هذه الأقسام في الفلاتر الرئيسية وتُستخدم لتصنيف المنتجات.
        </p>
        <div className="mt-4 space-y-3">
          {draft.categories.map((c, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3"
            >
              <input
                value={c.id}
                onChange={(e) => setCategory(index, { id: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="المعرّف (id)"
                dir="ltr"
              />
              <input
                value={c.ar}
                onChange={(e) => setCategory(index, { ar: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="الاسم العربي"
              />
              <input
                value={c.en}
                onChange={(e) => setCategory(index, { en: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="English name"
                dir="ltr"
              />
              <button
                type="button"
                className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
                onClick={() => removeCategory(index)}
                aria-label="حذف القسم"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {draft.categories.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">
              لا توجد أقسام — أضف قسماً واحداً على الأقل.
            </p>
          )}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h3 className="text-sm font-black text-slate-200">المحتوى الرئيسي (Hero)</h3>
        <div className="mt-4 space-y-4">
          <Field label="الشارة العلوية">
            <input
              value={draft.hero.badge}
              onChange={(e) => setHero('badge', e.target.value)}
              className="input"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="العنوان المميز (Highlight)">
              <input
                value={draft.hero.titleHighlight}
                onChange={(e) => setHero('titleHighlight', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="الإحصائيات — شارات الثقة">
              <textarea
                value={(draft.hero.trustBadges ?? []).join('\n')}
                onChange={(e) =>
                  setHero('trustBadges', e.target.value.split('\n'))
                }
                className="input min-h-16"
                placeholder={'شارة واحدة في كل سطر\nشارة أخرى'}
              />
            </Field>
          </div>
          <Field label="الوصف الرئيسي">
            <textarea
              value={draft.hero.subtitle}
              onChange={(e) => setHero('subtitle', e.target.value)}
              className="input min-h-20"
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-300">الأرقام الإحصائية</h4>
          <button type="button" className="btn-ghost" onClick={addStat}>
            <Plus className="h-4 w-4" />
            إضافة رقم
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {draft.hero.stats.map((stat, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto]"
            >
              <input
                value={stat.label}
                onChange={(e) => setStat(index, { label: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="التسمية"
              />
              <input
                value={stat.value}
                onChange={(e) => setStat(index, { value: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="القيمة"
              />
              <input
                value={stat.suffix ?? ''}
                onChange={(e) => setStat(index, { suffix: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="لاحقة"
              />
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={Boolean(stat.animate)}
                  onChange={(e) => setStat(index, { animate: e.target.checked })}
                />
                متحرك
              </label>
              <button
                type="button"
                className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
                onClick={() => removeStat(index)}
                aria-label="حذف الرقم"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-200">بطاقات الثقة</h3>
          <button type="button" className="btn-ghost" onClick={addTrustCard}>
            <Plus className="h-4 w-4" />
            إضافة بطاقة
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {draft.trust.map((card, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:grid-cols-[auto_1fr_2fr_auto]"
            >
              <select
                value={card.icon}
                onChange={(e) => setTrustCard(index, { icon: e.target.value })}
                className="input px-3 py-2 text-[11px]"
              >
                {ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                value={card.title}
                onChange={(e) => setTrustCard(index, { title: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="العنوان"
              />
              <input
                value={card.desc}
                onChange={(e) => setTrustCard(index, { desc: e.target.value })}
                className="input px-3 py-2 text-[11px]"
                placeholder="الوصف"
              />
              <button
                type="button"
                className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
                onClick={() => removeTrustCard(index)}
                aria-label="حذف البطاقة"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h3 className="text-sm font-black text-slate-200">تسميات طرق الدفع</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PAYMENT_METHODS.map((method) => (
            <Field key={method} label={method}>
              <input
                value={
                  draft.paymentMethodLabels?.[method] ??
                  DEFAULT_METHOD_LABELS[method]
                }
                onChange={(e) => setLabel(method, e.target.value)}
                className="input"
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-200">محافظ الدفع الرقمية</h3>
          <button type="button" className="btn-ghost" onClick={addWallet}>
            <Plus className="h-4 w-4" />
            إضافة محفظة
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          العملات الرقمية فقط — تُحذف المحافظ الفارغة تلقائياً عند الحفظ.
        </p>

        <div className="mt-4 space-y-4">
          {draft.wallets.map((wallet, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-slate-300">
                  محفظة {index + 1}
                </p>
                <button
                  type="button"
                  className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:border-rose-400/50 hover:text-rose-300"
                  onClick={() => removeWallet(index)}
                  aria-label="حذف المحفظة"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="الشبكة / العملة">
                  <select
                    value={wallet.method}
                    onChange={(e) =>
                      setWallet(index, {
                        method: e.target.value as PaymentMethod,
                      })
                    }
                    className="input"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="الاسم الظاهر">
                  <input
                    value={wallet.name}
                    onChange={(e) => setWallet(index, { name: e.target.value })}
                    className="input"
                    placeholder="USDT (شبكة TRC20)"
                  />
                </Field>
                <Field label="الاختصار">
                  <input
                    value={wallet.short}
                    onChange={(e) => setWallet(index, { short: e.target.value })}
                    className="input"
                    placeholder="USDT"
                  />
                </Field>
                <div>
                  <Field label="العنوان / رقم المحفظة">
                    <input
                      dir="ltr"
                      value={wallet.address}
                      onChange={(e) =>
                        setWallet(index, { address: e.target.value })
                      }
                      className="input font-mono text-[11px]"
                      placeholder="TQ... / 0x... / bc1..."
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="تعليمات التحويل">
                    <textarea
                      value={wallet.instruction}
                      onChange={(e) =>
                        setWallet(index, { instruction: e.target.value })
                      }
                      className="input min-h-16"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="ملاحظة إضافية">
                    <input
                      value={wallet.note}
                      onChange={(e) => setWallet(index, { note: e.target.value })}
                      className="input"
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
          {draft.wallets.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">
              لا توجد محافظ — أضف محفظة واحدة على الأقل ليتمكن الزوار من الدفع.
            </p>
          )}
        </div>
      </section>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-400">{label}</span>
      {children}
    </label>
  )
}
