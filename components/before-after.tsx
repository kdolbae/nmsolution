'use client'

import Image from 'next/image'
import { useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function BeforeAfter({
  before,
  after,
  alt,
  className,
  initial = 50,
}: {
  before: string
  after: string
  alt: string
  className?: string
  initial?: number
}) {
  const [pos, setPos] = useState(initial)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  const update = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    setPos((x / rect.width) * 100)
  }

  return (
    <div
      ref={ref}
      className={cn('relative aspect-[4/3] select-none overflow-hidden bg-muted touch-none', className)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e.clientX)
      }}
    >
      {/* After (base) */}
      <Image src={after} alt={`${alt} — 시공 후`} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      {/* Before (clipped) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt={`${alt} — 시공 전`} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-4 top-4 bg-charcoal/80 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider text-charcoal-foreground">
        BEFORE
      </span>
      <span className="pointer-events-none absolute right-4 top-4 bg-electric px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider text-electric-foreground">
        AFTER
      </span>

      {/* Handle */}
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-background"
        style={{ left: `${pos}%` }}
        aria-hidden
      >
        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-background text-navy shadow-lg">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
            <path d="M5 1 1 6l4 5M13 1l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </span>
      </div>

      <label htmlFor={id} className="sr-only">
        시공 전후 비교 슬라이더
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-x-0 bottom-0 h-8 w-full cursor-ew-resize opacity-0"
        aria-valuetext={`시공 전 ${Math.round(pos)}%`}
      />
    </div>
  )
}
