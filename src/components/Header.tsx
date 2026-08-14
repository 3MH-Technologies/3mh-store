import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, LogIn, LogOut, Search, ShoppingCart, UserRound } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { Logo } from './ui/Logo'

export function Header() {
  const { cartCount, setCartOpen, settings, authUser, logout } = useStore()
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
          <Link
            to="/payment-methods"
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:text-cyan-300"
          >
            طرق الدفع
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
          {authUser ? (
            <div className="group relative">
              <button
                type="button"
                aria-label="حسابي"
                className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-slate-200 transition-colors hover:border-cyan-400/60"
              >
                <UserRound className="h-4 w-4 text-cyan-300" />
                <span className="hidden max-w-28 truncate text-xs font-black sm:block">
                  {authUser.name}
                </span>
              </button>
              <div className="invisible absolute left-0 top-full z-30 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900/95 p-2 opacity-0 shadow-xl backdrop-blur transition-all group-hover:visible group-hover:opacity-100">
                <p className="truncate px-2 py-1.5 text-xs font-bold text-slate-300" dir="ltr">
                  {authUser.email}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-black text-rose-300 transition-colors hover:bg-rose-500/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              aria-label="تسجيل الدخول"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:block">دخول</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => navigate('/track')}
            aria-label="تتبع الطلب"
            className="rounded-xl border border-slate-700 p-2.5 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/payment-methods')}
            aria-label="طرق الدفع"
            className="rounded-xl border border-slate-700 p-2.5 text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-300 md:hidden"
          >
            <CreditCard className="h-4 w-4" />
          </button>
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