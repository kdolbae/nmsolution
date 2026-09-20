'use client'

import { useState } from 'react'
import { FileText, MessageCircle, MessagesSquare, Phone, Plus, Smartphone, X } from 'lucide-react'
import { track } from '@vercel/analytics'
import { cn } from '@/lib/utils'
import { kakaoLinks, openKakaoChat } from '@/lib/kakao'

type Channel = {
  icon: typeof FileText
  label: string
  sub: string
  href?: string
  /** 카카오 주소를 팝업으로 연다 (데스크톱) */
  popup?: string
  /** 번호를 Mono로 크게 보여주는 직통 항목 */
  highlight?: boolean
  /** 전환 집계용 이름 */
  event: string
}

function channels(phoneMain: string, phoneMobile: string, kakaoUrl: string): Channel[] {
  const kakao = kakaoLinks(kakaoUrl)
  return [
    { icon: Smartphone, label: '바로 전화', sub: phoneMobile, href: `tel:${phoneMobile}`, highlight: true, event: 'call_mobile' },
    { icon: Phone, label: '대표전화', sub: `${phoneMain} · 평일 09:00 – 18:00`, href: `tel:${phoneMain}`, event: 'call_main' },
    ...(kakao.chat
      ? [{ icon: MessagesSquare, label: '비즈니스 채팅', sub: '카카오톡으로 1:1 문의', popup: kakao.chat, event: 'kakao_chat' } as Channel]
      : []),
    ...(kakao.home
      ? [{ icon: MessageCircle, label: '카카오톡 채널', sub: '채널 추가하고 소식 받기', href: kakao.home, event: 'kakao_channel' } as Channel]
      : []),
    { icon: FileText, label: '견적 문의', sub: '남기면 당일 회신', href: '/#quote', event: 'quote_open' },
  ]
}

/* Floating button — desktop & tablet */
export function FloatingContact({
  phoneMain,
  phoneMobile,
  kakaoUrl,
}: {
  phoneMain: string
  phoneMobile: string
  kakaoUrl: string
}) {
  const [open, setOpen] = useState(false)
  const CHANNELS = channels(phoneMain, phoneMobile, kakaoUrl)

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
          {CHANNELS.map((c) => {
            const inner = (
              <>
                <span className="flex size-9 items-center justify-center bg-secondary text-navy transition-colors group-hover:bg-electric group-hover:text-electric-foreground">
                  <c.icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{c.label}</span>
                  <span
                    className={cn(
                      c.highlight
                        ? 'font-mono text-base font-bold tracking-tight text-navy'
                        : 'text-xs text-muted-foreground',
                    )}
                  >
                    {c.sub}
                  </span>
                </span>
              </>
            )
            const className =
              'group flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-secondary'
            return (
              <li key={c.label}>
                {c.popup ? (
                  <button
                    type="button"
                    onClick={() => {
                      track('contact_click', { channel: c.event, from: 'floating' })
                      setOpen(false)
                      openKakaoChat(c.popup!)
                    }}
                    className={className}
                  >
                    {inner}
                  </button>
                ) : (
                  <a
                    href={c.href}
                    {...(c.href?.startsWith('http')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    onClick={() => {
                      track('contact_click', { channel: c.event, from: 'floating' })
                      setOpen(false)
                    }}
                    className={className}
                  >
                    {inner}
                  </a>
                )}
              </li>
            )
          })}
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
export function MobileContactBar({
  phoneMobile,
  kakaoUrl,
}: {
  phoneMobile: string
  kakaoUrl: string
}) {
  const kakao = kakaoLinks(kakaoUrl)
  const CELL = 'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-foreground/80'

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label="빠른 상담"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        <a
          href={`tel:${phoneMobile}`}
          onClick={() => track('contact_click', { channel: 'call_mobile', from: 'mobile_bar' })}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-electric"
        >
          <Smartphone className="size-5" strokeWidth={1.75} />
          바로전화
        </a>
        {/* 모바일에서는 팝업 대신 링크로 열어야 카카오톡 앱이 바로 뜬다 */}
        <a
          href={kakao.chat || '/#quote'}
          target={kakao.chat ? '_blank' : undefined}
          rel={kakao.chat ? 'noopener noreferrer' : undefined}
          onClick={() => track('contact_click', { channel: 'kakao_chat', from: 'mobile_bar' })}
          className={CELL}
        >
          <MessagesSquare className="size-5" strokeWidth={1.75} />
          채팅상담
        </a>
        <a
          href={kakao.home || '/#quote'}
          target={kakao.home ? '_blank' : undefined}
          rel={kakao.home ? 'noopener noreferrer' : undefined}
          onClick={() => track('contact_click', { channel: 'kakao_channel', from: 'mobile_bar' })}
          className={CELL}
        >
          <MessageCircle className="size-5" strokeWidth={1.75} />
          카톡채널
        </a>
        <a
          href="/#quote"
          onClick={() => track('contact_click', { channel: 'quote_open', from: 'mobile_bar' })}
          className="flex h-16 flex-col items-center justify-center gap-1 bg-navy text-[11px] font-semibold text-navy-foreground"
        >
          <FileText className="size-5" strokeWidth={1.75} />
          견적
        </a>
      </div>
    </nav>
  )
}

/* Kakao chat button used inside the contact section (server components) */
export function KakaoChatButton({ kakaoUrl, className }: { kakaoUrl: string; className?: string }) {
  const kakao = kakaoLinks(kakaoUrl)
  if (!kakao.chat) return null

  return (
    <button
      type="button"
      onClick={() => {
        track('contact_click', { channel: 'kakao_chat', from: 'contact_section' })
        openKakaoChat(kakao.chat)
      }}
      className={className}
    >
      <span className="flex items-center gap-2">
        카카오톡 비즈니스 채팅
        <span className="text-navy-foreground/60">(새 창)</span>
      </span>
      <MessagesSquare className="size-5" />
    </button>
  )
}
