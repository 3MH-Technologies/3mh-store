import { Link } from 'react-router-dom'
import { Mail, Send } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { Logo } from './ui/Logo'

export function Footer() {
  const { settings } = useStore()

  return (
    <footer className="mt-16 border-t border-slate-800 bg-brand-950/60">
      <div className="container-app grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-tight">
              <p className="text-sm font-black text-white">{settings.companyName}</p>
              <p className="text-[11px] text-slate-400">{settings.appNameAr}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
            {settings.companyTagline}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Mail className="h-4 w-4" />
            <a
              href={`mailto:${settings.supportEmail}`}
              className="transition-colors hover:text-cyan-300"
            >
              {settings.supportEmail}
            </a>
          </div>
        </div>

        <div>
          <p className="mb-4 text-sm font-extrabold text-white">روابط سريعة</p>
          <ul className="space-y-2.5 text-sm text-slate-400">
            <li>
              <Link to="/" className="transition-colors hover:text-cyan-300">
                الرئيسية والمتجر
              </Link>
            </li>
            <li>
              <Link to="/track" className="transition-colors hover:text-cyan-300">
                تتبع طلبك
              </Link>
            </li>
            <li>
              <Link to="/admin" className="transition-colors hover:text-cyan-300">
                لوحة التحكم
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-extrabold text-white">تواصل معنا</p>
          <a
            href={settings.supportTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-500/15 to-purple-500/15 px-4 py-2.5 text-sm font-bold text-cyan-300 ring-1 ring-cyan-400/25 transition-colors hover:bg-cyan-400/20"
          >
            <Send className="h-4 w-4" />
            <span dir="ltr">@{settings.supportTelegramUsername}</span>
          </a>
          <p className="mt-3 text-xs text-slate-500">
            الدعم متاح يومياً عبر تيليجرام، التوثيق أو المساعدة في استقبال
            الأصول خلال ساعات.
          </p>
        </div>
      </div>

      <div className="w-full border-t border-slate-800 py-6 text-center text-sm text-slate-400">
        <p>
          جميع الحقوق محفوظة © 2026 | تطوير وتصميم{' '}
          <a
            href={settings.brandUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-cyan-400 hover:underline"
          >
            {settings.companyName}
          </a>
        </p>
      </div>
    </footer>
  )
}