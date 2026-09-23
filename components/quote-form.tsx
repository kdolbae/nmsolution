'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics'
import { ArrowRight, Check, Loader2, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUOTE_CATEGORIES } from '@/lib/quote'
import { submitQuote } from '@/app/actions/quote'

const FIELD =
  'h-12 w-full rounded-none border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-electric focus-visible:ring-2 focus-visible:ring-electric/30'

export function QuoteForm({
  phoneMobile,
  initialCategories = [],
  from = 'home',
}: {
  phoneMobile: string
  /** 서비스 페이지에서 열면 해당 공종을 미리 골라 둔다 */
  initialCategories?: string[]
  /** 전환 집계용. 어느 페이지의 폼인지 */
  from?: string
}) {
  const [categories, setCategories] = useState<string[]>(initialCategories)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function toggle(c: string) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const res = await submitQuote({
      name: String(fd.get('name') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      company: String(fd.get('company') ?? ''),
      location: String(fd.get('location') ?? ''),
      message: String(fd.get('message') ?? ''),
      website: String(fd.get('website') ?? ''),
      categories,
    })

    setPending(false)
    if (res.ok) {
      setDone(true)
      track('quote_submitted', { categories: categories.join(',') || '미선택', from })
    } else {
      setError(res.error)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-4 border border-electric bg-electric/5 p-8">
        <span className="flex size-10 items-center justify-center bg-electric text-electric-foreground">
          <Check className="size-5" strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-xl font-bold tracking-tight">접수되었습니다.</p>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            담당자가 확인 후 당일 회신드립니다. 현장 사진이 있으시면 아래 번호로 보내주시면 더 정확한 견적이
            가능합니다.
          </p>
        </div>
        <a
          href={`sms:${phoneMobile}`}
          className="inline-flex h-12 items-center gap-3 border border-foreground/20 px-6 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          <Phone className="size-4" strokeWidth={1.75} />
          {phoneMobile}로 사진 보내기
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {/* 봇 트랩 — 사람에게는 보이지 않는다 */}
      <div className="hidden" aria-hidden>
        <label htmlFor="q-website">홈페이지</label>
        <input id="q-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="q-name" className="text-sm font-semibold">
            성함 <span className="text-electric">*</span>
          </label>
          <input id="q-name" name="name" required autoComplete="name" className={FIELD} placeholder="홍길동" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="q-phone" className="text-sm font-semibold">
            연락처 <span className="text-electric">*</span>
          </label>
          <input
            id="q-phone"
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            className={cn(FIELD, 'font-mono')}
            placeholder="010-1234-5678"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="q-company" className="text-sm font-semibold">
            업체명
          </label>
          <input id="q-company" name="company" autoComplete="organization" className={FIELD} placeholder="○○산업" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="q-location" className="text-sm font-semibold">
            현장 위치
          </label>
          <input id="q-location" name="location" className={FIELD} placeholder="평택시 고덕면" />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">필요한 작업 (복수 선택)</legend>
        <div className="flex flex-wrap gap-2">
          {QUOTE_CATEGORIES.map((c) => {
            const on = categories.includes(c)
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                aria-pressed={on}
                className={cn(
                  // 최소 터치 영역 44px (DESIGN_SYSTEM 10.2)
                  'inline-flex min-h-11 items-center gap-2 border px-4 py-2.5 text-sm transition-colors',
                  on
                    ? 'border-electric bg-electric text-electric-foreground'
                    : 'border-border text-foreground/80 hover:border-foreground',
                )}
              >
                {on && <Check className="size-3.5" strokeWidth={2.5} />}
                {c}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="q-message" className="text-sm font-semibold">
          문의 내용
        </label>
        <textarea
          id="q-message"
          name="message"
          rows={4}
          className={cn(FIELD, 'h-auto min-h-28 py-3 leading-relaxed')}
          placeholder="어디가 어떻게 문제인지 간단히 적어주세요. 예) 지붕 판넬 이음부에서 비 올 때 누수, 30평 정도"
        />
        <p className="text-xs text-muted-foreground">
          정확한 위치와 증상, 대략적인 규모를 적어주시면 현장 방문 전에 범위를 좁힐 수 있습니다.
        </p>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex h-14 items-center justify-center gap-3 bg-electric px-7 text-base font-semibold text-electric-foreground transition-colors hover:bg-navy disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? (
            <>
              접수 중
              <Loader2 className="size-4 animate-spin" />
            </>
          ) : (
            <>
              견적 문의 보내기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground">
          평일 09:00 – 18:00 접수 건은 당일 회신드립니다.
        </p>
      </div>
    </form>
  )
}
