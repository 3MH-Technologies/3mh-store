import { useState } from 'react'

export function Logo({ className = 'h-9 w-9 text-base' }: { className?: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 font-black text-white ${className}`}
      >
        3
      </span>
    )
  }

  return (
    <img
      src="/logo.png"
      alt="3MH"
      onError={() => setFailed(true)}
      className={`rounded-xl object-contain ${className}`}
    />
  )
}
