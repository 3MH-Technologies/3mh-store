import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useStore } from '../../context/StoreContext'

export function ToastContainer() {
  const { toasts } = useStore()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[60] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex animate-fadeIn items-start gap-3 rounded-xl border border-slate-700 bg-brand-800 px-4 py-3 shadow-card"
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          )}
          {toast.type === 'error' && (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          )}
          {toast.type === 'info' && (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          )}
          <p className="text-sm text-slate-200">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}