import { ArrowDown, Database, LockKeyhole, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { CountUp } from './ui/CountUp'

export function Hero() {
  const { products, settings } = useStore()
  const bestSeller = [...products].sort((a, b) => b.sales - a.sales)[0]
  const hero = settings.hero

  return (
    <section className="relative overflow-hidden border-b border-slate-800">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="container-app relative py-16 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-xs font-bold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            {hero.badge}
          </span>
          <h1 className="mt-6 text-3xl font-black leading-snug text-white sm:text-5xl sm:leading-snug">
            منتجات تقنية جاهزة
            <span className="bg-gradient-to-l from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {' '}
              {hero.titleHighlight}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#catalog" className="btn-primary">
              تصفح المنتجات
              <ArrowDown className="h-4 w-4" />
            </a>
            <a
              href={settings.supportTelegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              تواصل عبر تيليجرام
            </a>
          </div>

          {bestSeller && (
            <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 px-6 py-4 text-sm">
              <span className="flex items-center gap-2 text-amber-300">
                <Zap className="h-4 w-4" />
                الأكثر مبيعاً اليوم:
              </span>
              <a
                href="#catalog"
                className="font-bold text-slate-200 transition-colors hover:text-cyan-300"
              >
                {bestSeller.name}
              </a>
            </div>
          )}

          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-800 pt-8 text-center sm:grid-cols-4">
            {hero.stats.map((stat) => (
              <div key={stat.label}>
                {stat.animate && /^[\d.]+$/.test(stat.value) ? (
                  <p className="text-2xl font-black text-white sm:text-3xl">
                    <CountUp
                      to={Number(stat.value)}
                      decimals={stat.decimals ?? 0}
                      prefix={stat.prefix ?? ''}
                      suffix={stat.suffix ?? ''}
                    />
                  </p>
                ) : (
                  <p className="flex items-center justify-center gap-1 text-2xl font-black text-white sm:text-3xl">
                    <Zap className="h-5 w-5 text-cyan-400" />
                    {stat.value}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {hero.trustBadges.map((badge, index) => {
              const BadgeIcon =
                index === 0
                  ? Database
                  : index === 1
                    ? LockKeyhole
                    : ShieldCheck
              return (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-3.5 py-1.5 text-[11px] font-bold text-slate-300"
                >
                  <BadgeIcon className="h-3.5 w-3.5 text-cyan-400" />
                  {badge}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}