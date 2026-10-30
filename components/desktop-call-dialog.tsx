'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Copy, Phone, X } from 'lucide-react'

/** 숫자만 남긴 번호를 읽기 쉽게 끊는다: 01023693691 → 010-2369-3691, 18005901 → 1800-5901 */
function formatNumber(digits: string): string {
  if (/^01\d{9}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (/^01\d{8}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (/^1\d{7}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  if (/^02\d{7,8}$/.test(digits)) return `02-${digits.slice(2, -4)}-${digits.slice(-4)}`
  if (/^0\d{9,10}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`
  return digits
}

/**
 * PC(마우스) 에서 전화 링크를 누르면 아무 일도 안 일어나서 손님이 여러 번 누르다 떠난다
 * (2026-10-30 세종 손님, 4초에 4번). PC 에서는 tel: 로 가지 않고 누른 링크 옆에 번호를 크게 띄워 복사하게 한다.
 * 화면 다른 곳을 누르거나 Esc·스크롤하면 닫힌다.
 * 휴대폰·태블릿(터치)은 그대로 전화가 걸린다. 클릭 기록은 site-events 의 watchContactLinks 가 그대로 남긴다.
 */
export function DesktopCallDialog() {
  const [digits, setDigits] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const desktop = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onClick = (e: MouseEvent) => {
      if (!desktop.matches || e.defaultPrevented) return
      const a = (e.target as Element | null)?.closest?.('a[href^="tel:"]') as HTMLAnchorElement | null
      if (!a || a.dataset.callDirect !== undefined) return
      const num = (a.getAttribute('href') || '').slice(4).replace(/[^0-9]/g, '')
      if (!num) return
      e.preventDefault()
      setCopied(false)
      setPos(null)
      setAnchor(a.getBoundingClientRect())
      setDigits(num)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // 누른 링크 바로 아래(자리가 없으면 위)에, 화면 밖으로 나가지 않게 놓는다
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!digits || !anchor || !box) return
    const gap = 10
    const margin = 16
    const { width, height } = box.getBoundingClientRect()
    const below = anchor.bottom + gap
    const top = below + height + margin <= window.innerHeight ? below : Math.max(margin, anchor.top - gap - height)
    const center = anchor.left + anchor.width / 2 - width / 2
    const left = Math.min(Math.max(margin, center), window.innerWidth - width - margin)
    setPos({ top, left })
  }, [digits, anchor])

  useEffect(() => {
    if (!digits) return
    const close = () => setDigits(null)
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
    }
  }, [digits])

  if (!digits) return null
  const shown = formatNumber(digits)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown)
      setCopied(true)
    } catch {
      // 복사가 막힌 브라우저 — 번호는 화면에 크게 보이므로 그대로 둔다
    }
  }

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-labelledby="call-dialog-title"
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
      className="fixed z-50 w-[24rem] max-w-[calc(100vw-2rem)] bg-background text-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4 px-8 pt-7">
        <div className="flex flex-col gap-1">
          <span className="text-kicker text-muted-foreground">Call</span>
          <span id="call-dialog-title" className="text-sm font-semibold">
            휴대폰으로 이 번호에 전화 주세요
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDigits(null)}
          aria-label="닫기"
          className="-mr-2 flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-6 px-8 pb-8 pt-6">
        <span className="select-all text-center font-mono text-4xl font-bold tracking-tight text-navy">
          {shown}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex w-full items-center justify-center gap-2 bg-electric px-4 py-3.5 text-sm font-semibold text-electric-foreground transition-opacity hover:opacity-90"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? '복사했습니다' : '번호 복사'}
        </button>
        <a
          href={`tel:${digits}`}
          data-call-direct=""
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          <Phone className="size-3.5" />
          이 PC로 바로 걸기 (전화 연결 앱이 있을 때)
        </a>
      </div>
    </div>
  )
}
