import type { ComponentType } from 'react'
import {
  BadgeCheck,
  Bot,
  Building2,
  CandlestickChart,
  Code2,
  Database,
  DownloadCloud,
  Headset,
  LockKeyhole,
  MailPlus,
  MessageSquare,
  MessageSquareText,
  Monitor,
  Rocket,
  SearchCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export const ICONS: Record<string, ComponentType<LucideProps>> = {
  BadgeCheck,
  Bot,
  Building2,
  CandlestickChart,
  Code2,
  Database,
  DownloadCloud,
  Headset,
  LockKeyhole,
  MailPlus,
  MessageSquare,
  MessageSquareText,
  Monitor,
  Rocket,
  SearchCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  Users,
  Zap,
}

export function getIcon(name: string): ComponentType<LucideProps> {
  return ICONS[name] ?? Code2
}