'use client'

import { useState, useTransition } from 'react'
import { Phone, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUOTE_STATUSES, statusLabel } from '@/lib/quote'
import { attributionSummary } from '@/lib/attribution'
import { deleteQuote, updateQuoteMemo, updateQuoteStatus } from '@/app/actions/admin'
import type { QuoteRequest } from '@/lib/db/schema'

const FILTERS = [{ value: 'all', label: '전체' }, ...QUOTE_STATUSES] as const

export function QuotesManager({ quotes }: { quotes: QuoteRequest[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [pending, startTransition] = useTransition()

  const list = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter)
  const counts = (v: string) => (v === 'all' ? quotes.length : quotes.filter((q) => q.status === v).length)

  if (quotes.length === 0) {
    return (
      <p className="border border-dashed border-border bg-background px-6 py-16 text-center text-sm text-muted-foreground">
        아직 접수된 견적 문의가 없습니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-max gap-1 border-b border-border" role="tablist" aria-label="상태 필터">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              filter === f.value
                ? 'border-electric text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label} {counts(f.value)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="border border-dashed border-border bg-background px-6 py-12 text-center text-sm text-muted-foreground">
          해당 상태의 문의가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((q) => (
            <li key={q.id} className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold tracking-tight">{q.name}</span>
                    {q.company && <span className="text-sm text-muted-foreground">{q.company}</span>}
                    <span
                      className={cn(
                        'border px-2 py-0.5 text-xs font-medium',
                        q.status === 'new'
                          ? 'border-electric text-electric'
                          : q.status === 'contacted'
                            ? 'border-border text-foreground/70'
                            : 'border-border text-muted-foreground',
                      )}
                    >
                      {statusLabel(q.status)}
                    </span>
                  </div>
                  <a
                    href={`tel:${q.phone}`}
                    className="flex w-fit items-center gap-2 font-mono text-lg font-bold tracking-tight hover:text-electric"
                  >
                    <Phone className="size-4" strokeWidth={1.75} />
                    {q.phone}
                  </a>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(q.createdAt).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {(q.location || q.categories || attributionSummary(q)) && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {q.location && (
                    <>
                      <dt className="text-muted-foreground">현장</dt>
                      <dd>{q.location}</dd>
                    </>
                  )}
                  {q.categories && (
                    <>
                      <dt className="text-muted-foreground">작업</dt>
                      <dd>{q.categories.split(',').join(' · ')}</dd>
                    </>
                  )}
                  {/* 어느 광고에서 왔는지. 추적을 깔기 전에 들어온 문의는 비어 있다. */}
                  {attributionSummary(q) && (
                    <>
                      <dt className="text-muted-foreground">유입</dt>
                      <dd>{attributionSummary(q)}</dd>
                    </>
                  )}
                </dl>
              )}

              {q.message && (
                <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-relaxed text-foreground/85">
                  {q.message}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <label htmlFor={`memo-${q.id}`} className="text-xs font-medium text-muted-foreground">
                  메모
                </label>
                <textarea
                  id={`memo-${q.id}`}
                  defaultValue={q.memo}
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value === q.memo) return
                    startTransition(() => void updateQuoteMemo(q.id, e.target.value))
                  }}
                  placeholder="통화 내용, 방문 일정 등"
                  className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-electric"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {QUOTE_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={pending || q.status === s.value}
                    onClick={() => startTransition(() => void updateQuoteStatus(q.id, s.value))}
                    className={cn(
                      'border px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none',
                      q.status === s.value
                        ? 'border-navy bg-navy text-navy-foreground'
                        : 'border-border text-foreground/70 hover:border-foreground',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`${q.name}님의 문의를 삭제할까요? 되돌릴 수 없습니다.`)) return
                    startTransition(() => void deleteQuote(q.id))
                  }}
                  aria-label={`${q.name}님의 문의 삭제`}
                  className="ml-auto flex size-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
