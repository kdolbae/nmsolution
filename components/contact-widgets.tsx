'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { FileText, MessageCircle, MessagesSquare, Phone, Plus, Smartphone, X } from 'lucide-react'
import { track } from '@/lib/track'
import { reportConversion } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { kakaoChatUrl, openKakaoChat } from '@/lib/kakao'

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
  /** 페이지 안 대화형 문의창을 연다 */
  liveChat?: boolean
}

/**
 * 페이지 안 대화형 문의창(kevin 2026-11-12 "카톡 문의에 더해 페이지 안에 대화형 문의창").
 * 창은 N-CMS 공용 위젯(https://sbworks.bond/site-chat.js). 쓴 글은 N-CMS 실시간 채팅에 바로 뜨고
 * 첫 글은 플랜트사업부 견적 문의(엔엠 홈페이지)로 들어간다. 사업체 nanomaster = 엔엠 홈페이지 문의가 들어가는 N-CMS 사업체.
 * 연결이 안 되면(위젯을 못 불렀으면) 카카오톡 상담으로.
 */
function openLiveChat(fallback: string) {
  const w = window as unknown as { ncmsChat?: { open: () => void } }
  if (w.ncmsChat) w.ncmsChat.open()
  else if (fallback) openKakaoChat(fallback)
}

export function LiveChatScript({ phoneMain, kakaoUrl }: { phoneMain: string; kakaoUrl: string }) {
  return (
    <Script
      id="ncms-site-chat"
      src="https://sbworks.bond/site-chat.js"
      strategy="afterInteractive"
      data-b="nanomaster"
      data-name="엔엠솔루션"
      data-color="#0b1f3a"
      data-accent="#1f6feb"
      data-accent-text="#ffffff"
      data-kakao={kakaoChatUrl(kakaoUrl) || ''}
      data-tel={phoneMain}
      data-privacy=""
      data-launcher="none"
      data-avoid="nav[aria-label='빠른 상담']"
      data-greet={'안녕하세요, 엔엠솔루션입니다.\n공장·건물 보수 공사, 어떤 내용이든 편하게 남겨 주세요.'}
    />
  )
}

/**
 * 연락 수단 클릭 1건을 집계한다.
 *
 * Vercel Analytics 는 사람이 보는 용도, `reportConversion` 은 광고 매체가 배우는 용도다.
 * 견적 폼을 거치지 않고 바로 전화하는 손님이 많으므로 이 클릭이 곧 전환이다.
 * 견적 폼 열기(quote_open)는 아직 문의가 아니므로 매체에는 보내지 않는다.
 */
function contactClick(channel: string, from: string) {
  track('contact_click', { channel, from })
  if (channel !== 'quote_open') reportConversion('contact', { channel, from })
}

function channels(phoneMain: string, phoneMobile: string, kakaoUrl: string): Channel[] {
  const chat = kakaoChatUrl(kakaoUrl)
  return [
    { icon: Smartphone, label: '바로 전화', sub: phoneMobile, href: `tel:${phoneMobile}`, highlight: true, event: 'call_mobile' },
    { icon: Phone, label: '대표전화', sub: `${phoneMain} · 평일 09:00 – 18:00`, href: `tel:${phoneMain}`, event: 'call_main' },
    // 페이지 안 대화형 문의창(N-CMS 실시간 채팅). 창을 못 부르면 카카오톡으로
    { icon: MessagesSquare, label: '채팅 문의', sub: '이 창에서 바로 담당자와 대화', liveChat: true, popup: chat || undefined, event: 'live_chat' },
    // 카카오톡 채널(비즈채널) 하나로 1:1 상담까지 받는다
    ...(chat
      ? [{ icon: MessageCircle, label: '카카오톡 상담', sub: '채널로 1:1 문의', popup: chat, event: 'kakao_chat' } as Channel]
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
  // 2026-11-05 광고 방문의 58%가 PC(평일 낮 사무실)인데, 접힌 '상담하기' 버튼은 눌러야 번호가 보여 문의로 이어지지 않았다.
  // PC 에서는 번호·카톡·견적이 처음부터 펼쳐져 있게 하고, 손님이 한 번 닫으면 이 탭에서는 닫아 둔다.
  const [open, setOpen] = useState(true)
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('nm-contact-closed') === '1') setOpen(false)
    } catch {
      /* 저장소를 못 쓰는 환경이면 펼친 채로 둔다 */
    }
  }, [])
  const toggle = () =>
    setOpen((v) => {
      try {
        window.sessionStorage.setItem('nm-contact-closed', v ? '1' : '0')
      } catch {
        /* 무시 */
      }
      return !v
    })
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
                {c.liveChat || c.popup ? (
                  <button
                    type="button"
                    onClick={() => {
                      contactClick(c.event, 'floating')
                      setOpen(false)
                      if (c.liveChat) openLiveChat(c.popup ?? '')
                      else openKakaoChat(c.popup!)
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
                      contactClick(c.event, 'floating')
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
        onClick={toggle}
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
  phoneMain,
  phoneMobile,
  kakaoUrl,
}: {
  phoneMain: string
  phoneMobile: string
  kakaoUrl: string
}) {
  const chat = kakaoChatUrl(kakaoUrl)
  const CELL = 'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-foreground/80'

  return (
    <>
      {/* 대화형 문의창 스크립트: 이 막대는 화면 크기와 상관없이 늘 붙어 있어(md:hidden 은 CSS) 여기서 한 번 부른다 */}
      <LiveChatScript phoneMain={phoneMain} kakaoUrl={kakaoUrl} />
      <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label="빠른 상담"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        <a
          href={`tel:${phoneMobile}`}
          onClick={() => contactClick('call_mobile', 'mobile_bar')}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-electric"
        >
          <Smartphone className="size-5" strokeWidth={1.75} />
          바로전화
        </a>
        <a
          href={`tel:${phoneMain}`}
          onClick={() => contactClick('call_main', 'mobile_bar')}
          className={CELL}
        >
          <Phone className="size-5" strokeWidth={1.75} />
          대표전화
        </a>
        {/* 모바일에서는 팝업 대신 링크로 열어야 카카오톡 앱이 바로 뜬다 */}
        <a
          href={chat || '/#quote'}
          target={chat ? '_blank' : undefined}
          rel={chat ? 'noopener noreferrer' : undefined}
          onClick={() => contactClick('kakao_chat', 'mobile_bar')}
          className={CELL}
        >
          <MessageCircle className="size-5" strokeWidth={1.75} />
          카톡상담
        </a>
        <button
          type="button"
          onClick={() => {
            contactClick('live_chat', 'mobile_bar')
            openLiveChat(chat)
          }}
          className={CELL}
        >
          <MessagesSquare className="size-5" strokeWidth={1.75} />
          채팅문의
        </button>
        <a
          href="/#quote"
          onClick={() => contactClick('quote_open', 'mobile_bar')}
          className="flex h-16 flex-col items-center justify-center gap-1 bg-navy text-[11px] font-semibold text-navy-foreground"
        >
          <FileText className="size-5" strokeWidth={1.75} />
          견적
        </a>
      </div>
      </nav>
    </>
  )
}

/* Kakao chat button used inside the contact section (server components) */
export function KakaoChatButton({ kakaoUrl, className }: { kakaoUrl: string; className?: string }) {
  const chat = kakaoChatUrl(kakaoUrl)
  if (!chat) return null

  return (
    <button
      type="button"
      onClick={() => {
        contactClick('kakao_chat', 'contact_section')
        openKakaoChat(chat)
      }}
      className={className}
    >
      <span className="flex items-center gap-2">
        카카오톡으로 상담하기
        <span className="text-navy-foreground/60">(새 창)</span>
      </span>
      <MessageCircle className="size-5" />
    </button>
  )
}
