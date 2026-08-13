import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Wrench } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { Logo } from './ui/Logo'

export function Header() {
  const { cartCount, setCartOpen, settings } = useStore()
  const navigate = useNavigate()

  return (
    <header className="border-b border-slate-800 bg-brand-900/80">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="leading-tight">
            <span className="block text-sm font-black tracking-wide text-white">
              {settings.appName}
            </span>
            <span className="block text-[11px] text-slate-400">
              {settings.companyName}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:text-cyan-300"
          >
            الرئيسية
          </Link>
          <Link
            to="/track"
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:text-cyan-300"
          >
            تتبع الطلب
          </Link>
          <a
            href={settings.supportTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:text-cyan-300"
          >
            تواصل معنا
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/track')}
            aria-label="تتبع الطلب"
            className="rounded-xl border border-slate-700 p-2.5 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/admin"
            aria-label="لوحة التحكم"
            className="hidden rounded-xl border border-slate-700 p-2.5 text-slate-300 transition-colors hover:border-purple-400/50 hover:text-purple-300 sm:inline-flex"
          >
            <Wrench className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="فتح السلة"
            className="relative rounded-xl border border-slate-700 p-2.5 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-l from-cyan-500 to-purple-500 px-1 text-[10px] font-black text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}