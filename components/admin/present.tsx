'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Maximize, Minimize, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PresentDoc = { key: string; label: string; html: string }

const ZOOMS = [0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2]

/**
 * 프레젠테이션 보기: 제안서·견적서 미리보기를 화면 전체로 띄운다.
 * - 열면 브라우저 전체화면을 함께 켠다(막히면 창 크기 그대로 덮는다).
 * - → / PageDown / Space 다음 섹션, ← / PageUp 이전 섹션, + / − 확대·축소, Esc 닫기.
 * - 위쪽 막대는 마우스를 잠시 움직이지 않으면 숨는다.
 */
export function PresentOverlay({ docs, initial, title, onClose }: { docs: PresentDoc[]; initial: string; title: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [cur, setCur] = useState(docs.some((d) => d.key === initial) ? initial : docs[0]?.key)
  const [zoom, setZoom] = useState(2)
  const [full, setFull] = useState(false)
  const [bar, setBar] = useState(true)
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 화면 꽉 채우기를 버튼으로 끈 것인지. Esc 로 전체화면이 풀리면(브라우저가 Esc 를 가로챔) 보기 자체를 닫는다 */
  const leaving = useRef(false)
  const doc = docs.find((d) => d.key === cur) ?? docs[0]

  const wake = useCallback(() => {
    setBar(true)
    if (idle.current) clearTimeout(idle.current)
    idle.current = setTimeout(() => setBar(false), 2500)
  }, [])

  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const close = useCallback(() => {
    if (document.fullscreenElement) {
      leaving.current = true
      document.exitFullscreen().catch(() => {})
    }
    closeRef.current()
  }, [])

  const toggleFull = () => {
    if (document.fullscreenElement) {
      leaving.current = true
      document.exitFullscreen().catch(() => {})
    }
    else box.current?.requestFullscreen?.().catch(() => {})
  }

  // 섹션 단위로 넘긴다. 섹션이 없으면 한 화면씩 넘긴다
  const step = useCallback((dir: 1 | -1) => {
    const d = frame.current?.contentDocument
    const w = frame.current?.contentWindow
    if (!d || !w) return
    const marks = [...d.querySelectorAll<HTMLElement>('section, .sheet, .nm-quote-page')].filter((el) => el.offsetHeight > 40)
    const y = w.scrollY
    if (marks.length > 1) {
      const tops = marks.map((el) => el.getBoundingClientRect().top + y).sort((a, b) => a - b)
      const next = dir > 0 ? tops.find((t) => t > y + 8) : [...tops].reverse().find((t) => t < y - 8)
      if (next !== undefined) return w.scrollTo({ top: next, behavior: 'smooth' })
    }
    w.scrollBy({ top: dir * w.innerHeight * 0.85, behavior: 'smooth' })
  }, [])

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      wake()
      const k = e.key
      if (k === 'Escape') return close()
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) {
        e.preventDefault()
        step(1)
      } else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) {
        e.preventDefault()
        step(-1)
      } else if (k === '+' || k === '=') setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))
      else if (k === '-') setZoom((z) => Math.max(0, z - 1))
      else if (k === '0') setZoom(2)
      else if (k.toLowerCase() === 'f') toggleFull()
    },
    [close, step, wake],
  )

  // iframe 안에서 누른 키도 받는다 (srcDoc 이라 같은 출처)
  const applyFrame = useCallback(() => {
    const d = frame.current?.contentDocument
    if (!d) return
    d.documentElement.style.setProperty('zoom', String(ZOOMS[zoom]))
    d.removeEventListener('keydown', onKey)
    d.addEventListener('keydown', onKey)
    d.removeEventListener('mousemove', wake)
    d.addEventListener('mousemove', wake)
  }, [zoom, onKey, wake])

  useEffect(applyFrame, [applyFrame])

  const keyRef = useRef(onKey)
  keyRef.current = onKey

  // 처음 열 때 한 번: 전체화면 켜기, 키보드, 뒤쪽 화면 스크롤 막기
  useEffect(() => {
    let was = false
    const onFs = () => {
      const now = !!document.fullscreenElement
      setFull(now)
      if (was && !now && !leaving.current) closeRef.current()
      leaving.current = false
      was = now
    }
    const key = (e: KeyboardEvent) => keyRef.current(e)
    document.addEventListener('fullscreenchange', onFs)
    window.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    box.current?.requestFullscreen?.().catch(() => {})
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      window.removeEventListener('keydown', key)
      document.body.style.overflow = ''
      if (idle.current) clearTimeout(idle.current)
    }
  }, [])

  useEffect(wake, [wake])

  if (!doc) return null

  return createPortal(
    <div ref={box} role="dialog" aria-modal="true" aria-label={`${title} 프레젠테이션`} className="fixed inset-0 z-[100] bg-[#0b1224]" onMouseMove={wake}>
      <iframe
        ref={frame}
        key={doc.key}
        srcDoc={doc.html}
        onLoad={() => {
          applyFrame()
          frame.current?.contentWindow?.focus()
        }}
        title={`${title} ${doc.label}`}
        className="absolute inset-0 h-full w-full border-0 bg-white"
      />
      <div
        className={cn(
          'absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 bg-[#0b1224] px-4 py-2 text-sm text-white shadow-lg transition-opacity duration-300',
          bar ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <span className="mr-2 truncate font-semibold">{title}</span>
        {docs.length > 1 &&
          docs.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setCur(d.key)}
              className={cn('px-3 py-1 text-sm', d.key === doc.key ? 'bg-white text-[#0b1224]' : 'text-white/80 hover:bg-white/10')}
            >
              {d.label}
            </button>
          ))}
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 hidden text-xs text-white/50 xl:inline">← → 섹션 이동 · + − 확대 · Esc 닫기</span>
          <BarButton title="이전 섹션 (←)" onClick={() => step(-1)}>
            <ChevronUp className="size-4" />
          </BarButton>
          <BarButton title="다음 섹션 (→)" onClick={() => step(1)}>
            <ChevronDown className="size-4" />
          </BarButton>
          <span className="mx-1 h-5 w-px bg-white/20" />
          <BarButton title="축소 (−)" onClick={() => setZoom((z) => Math.max(0, z - 1))}>
            <Minus className="size-4" />
          </BarButton>
          <button type="button" title="원래 크기 (0)" onClick={() => setZoom(2)} className="w-12 text-center text-xs tabular-nums text-white/80">
            {Math.round(ZOOMS[zoom] * 100)}%
          </button>
          <BarButton title="확대 (+)" onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}>
            <Plus className="size-4" />
          </BarButton>
          <span className="mx-1 h-5 w-px bg-white/20" />
          <BarButton title={full ? '창으로 보기 (F)' : '화면 꽉 채우기 (F)'} onClick={toggleFull}>
            {full ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </BarButton>
          <BarButton title="닫기 (Esc)" onClick={close}>
            <X className="size-4" />
          </BarButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function BarButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="grid size-8 place-items-center text-white/85 hover:bg-white/10 hover:text-white">
      {children}
    </button>
  )
}
