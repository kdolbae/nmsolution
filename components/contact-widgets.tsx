'use client'

import { useState } from 'react'
import { FileText, MessageCircle, MessagesSquare, Phone, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPANY } from './brand'

const CHANNELS = [
  { icon: FileText, label: '견적 문의', sub: '사진 첨부로 빠른 견적', href: '#contact' },
  { icon: MessageCircle, label: '카카오톡 상담', sub: '채널 친구 추가 후 상담', href: '#contact' },
  { icon: MessagesSquare, label: '1:1 채팅', sub: '실시간 상담원 연결', href: '#contact' },
  { icon: Phone, label: '전화 상담', sub: `${COMPANY.phoneMain} · 평일 09:00 – 18:00`, href: COMPANY.telMain },
]

/* Floating button — desktop & tablet */
export function FloatingContact() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-5 z-40 hidden flex-col items-end gap-3 md:flex lg:bottom-8 lg:right-8">
      <div
        id="contact-menu"
        className={cn(
          'flex w-72 flex-col overflow-hidden bg-background text-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-border transition-all duration-300 origin-bottom-right',
          open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-95 opacity-0',
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between bg-navy px-5 py-4 text-navy-foreground">
          <div className="flex flex-col">
            <span className="text-kicker text-navy-foreground/60">Contact</span>
            <span className="text-sm font-semibold">어떤 방식이 편하신가요?</span>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {CHANNELS.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary"
              >
                <span className="flex size-9 items-center justify-center bg-secondary text-navy transition-colors group-hover:bg-electric group-hover:text-electric-foreground">
                  <c.icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.sub}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="contact-menu"
        aria-label={open ? '상담 메뉴 닫기' : '상담 메뉴 열기'}
        className={cn(
          'flex h-14 items-center gap-3 pl-5 pr-4 text-sm font-semibold shadow-lg transition-colors',
          open ? 'bg-charcoal text-charcoal-foreground' : 'bg-electric text-electric-foreground hover:bg-navy',
        )}
      >
        {open ? '닫기' : '상담하기'}
        <span className={cn('transition-transform duration-300', open && 'rotate-45')}>
          {open ? <X className="size-5" /> : <Plus className="size-5" />}
        </span>
      </button>
    </div>
  )
}

/* Compact bottom bar — mobile only */
export function MobileContactBar() {
  const items = [
    { icon: Phone, label: '전화', href: COMPANY.telMain },
    { icon: MessageCircle, label: '카톡', href: '#contact' },
    { icon: MessagesSquare, label: '채팅', href: '#contact' },
  ]
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label="빠른 상담"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {items.map((it) => (
          <a
            key={it.label}
            href={it.href}
            className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-foreground/80"
          >
            <it.icon className="size-5" strokeWidth={1.75} />
            {it.label}
          </a>
        ))}
        <a
          href="#contact"
          className="flex h-16 flex-col items-center justify-center gap-1 bg-navy text-[11px] font-semibold text-navy-foreground"
        >
          <FileText className="size-5" strokeWidth={1.75} />
          견적
        </a>
      </div>
    </nav>
  )
}
