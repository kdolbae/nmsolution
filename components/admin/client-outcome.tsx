'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { recordOutcome, removeOutcome } from '@/app/actions/outcomes'
import { categoryLabel } from '@/lib/knowledge/shared'
import { OUTCOME_REASONS, OUTCOME_RESULTS, RESULT_LABEL, countReasons, winRate, type Outcome, type OutcomeResult } from '@/lib/outcomes/shared'

const day = (iso: string) => iso.slice(0, 10)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const tone: Record<OutcomeResult, string> = { won: 'bg-emerald-100 text-emerald-800', lost: 'bg-red-100 text-red-800', hold: 'bg-secondary text-muted-foreground' }

export function ResultBadge({ result }: { result: OutcomeResult }) {
  return <span className={cn('px-1.5 py-0.5 text-xs font-medium', tone[result])}>{RESULT_LABEL[result]}</span>
}

/**
 * 업체 화면 '수주·실주 결과' (어드민 전용, 전 업체 공통, kevin 2026-11-14).
 * 계약이 됐는지 안 됐는지와 그 이유를 남긴다. 지식 DB(/admin/knowledge)의 '수주·실주'에 모이고,
 * 같은 공종의 견적을 새로 쓸 때 '줄을 넣기 전에 확인'에 다시 나온다.
 */
export function ClientOutcome({ clientId, outcome, finalized }: { clientId: number; outcome: Outcome | null; finalized: boolean }) {
  const router = useRouter()
  const [result, setResult] = useState<OutcomeResult | null>(outcome?.result ?? null)
  const [reasons, setReasons] = useState<string[]>(outcome?.reasons ?? [])
  const [note, setNote] = useState(outcome?.note ?? '')
  const [rival, setRival] = useState(outcome?.rivalPrice ? String(outcome.rivalPrice) : '')
  const [editing, setEditing] = useState(!outcome)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const pick = (r: OutcomeResult) => {
    setResult(r)
    setReasons((cur) => cur.filter((x) => OUTCOME_REASONS[r].includes(x)))
  }
  const toggle = (r: string) => setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))
  const save = () =>
    result &&
    start(async () => {
      const res = await recordOutcome(clientId, { result, reasons, note, rivalPrice: rival ? Number(rival.replace(/[^\d]/g, '')) : null })
      if (!res.ok) return setError(res.error)
      setError('')
      setEditing(false)
      router.refresh()
    })
  const remove = () =>
    confirm('이 결과 기록을 지울까요? 이전 기록까지 모두 지워집니다.') &&
    start(async () => {
      const res = await removeOutcome(clientId)
      if (!res.ok) return setError(res.error)
      setResult(null)
      setReasons([])
      setNote('')
      setRival('')
      setEditing(true)
      router.refresh()
    })
  return (
    <section className="flex flex-col gap-3 bg-secondary/40 p-5 ring-1 ring-border">
      <div>
        <h2 className="text-base font-bold">수주·실주 결과</h2>
        <p className="text-sm text-muted-foreground">
          계약이 됐는지 안 됐는지, 왜 그랬는지 남김. 기록할 때의 공급가·영업이익률·공종이 같이 저장되고{' '}
          <a href="/admin/knowledge" className="underline">
            지식 DB
          </a>
          에 모여 다음 견적 때 다시 보임. 고객 화면에는 나오지 않음.
        </p>
      </div>
      {finalized && !outcome && <p className="border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-800">계약 확정한 견적임. 왜 수주했는지 남겨 두면 다음 견적에 쓰임.</p>}
      {!editing && outcome ? (
        <div className="bg-background p-4 ring-1 ring-border">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ResultBadge result={outcome.result} />
            {outcome.reasons.map((r) => (
              <span key={r} className="border border-border px-1.5 py-0.5 text-xs">
                {r}
              </span>
            ))}
          </div>
          {outcome.note && <p className="mt-2 whitespace-pre-wrap text-sm">{outcome.note}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            공급가 {won(outcome.supply)}
            {outcome.rate !== null && ` · 영업이익률 ${outcome.rate}%`}
            {outcome.rivalPrice !== null && ` · 다른 업체 ${won(outcome.rivalPrice)}`}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {outcome.by || '기록자 없음'} · {day(outcome.at)}
            <button className="underline" onClick={() => setEditing(true)}>
              고치기
            </button>
            <button className="underline" onClick={remove} disabled={pending}>
              지우기
            </button>
          </p>
          {outcome.history.length > 0 && (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">이전 기록 {outcome.history.length}</summary>
              <ul className="mt-1 space-y-1.5">
                {outcome.history.map((h, i) => (
                  <li key={i} className="whitespace-pre-wrap border-l-2 border-border pl-2">
                    {h.by || '기록자 없음'} · {day(h.at)} · {RESULT_LABEL[h.result] ?? h.result}
                    {h.reasons.length > 0 && ` · ${h.reasons.join(', ')}`}
                    {h.note && `\n${h.note}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border">
          <div className="flex flex-wrap gap-2">
            {OUTCOME_RESULTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => pick(r)}
                className={cn('border px-4 py-2 text-sm font-medium', result === r ? 'border-foreground bg-foreground text-background' : 'border-border bg-background')}
              >
                {RESULT_LABEL[r]}
                {r === 'hold' && <span className="ml-1 text-xs font-normal">(고객 사정으로 멈춤)</span>}
              </button>
            ))}
          </div>
          {result && (
            <>
              <div>
                <p className="mb-1.5 text-xs font-semibold">{result === 'won' ? '왜 됐는지' : result === 'lost' ? '왜 안 됐는지' : '왜 멈췄는지'} (여러 개 고를 수 있음)</p>
                <div className="flex flex-wrap gap-1.5">
                  {OUTCOME_REASONS[result].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggle(r)}
                      className={cn('border px-2.5 py-1 text-sm', reasons.includes(r) ? 'border-foreground bg-foreground text-background' : 'border-border bg-background')}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="고객이 한 말, 경쟁 상황, 다음에 다르게 할 점"
                className="w-full border border-input bg-background p-2 text-sm"
              />
              {result !== 'won' && (
                <label className="flex flex-wrap items-center gap-2 text-sm">
                  다른 업체 금액 (공급가, 알 때만)
                  <input
                    inputMode="numeric"
                    value={rival ? Number(rival.replace(/[^\d]/g, '') || 0).toLocaleString('ko-KR') : ''}
                    onChange={(e) => setRival(e.target.value.replace(/[^\d]/g, ''))}
                    className="h-9 w-40 border border-input bg-background px-2 text-right text-sm tabular-nums"
                  />
                  원
                </label>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-none" onClick={save} disabled={pending || !result}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />} 결과 남기기
            </Button>
            {outcome && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                취소
              </Button>
            )}
            <span className="text-xs text-muted-foreground">로그인한 이름과 날짜가 함께 기록됨.</span>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        </div>
      )}
    </section>
  )
}

/** 결과 한 줄 (지식 DB 목록, 견적 편집의 '지난 수주·실주') */
export function OutcomeRow({ outcome }: { outcome: Outcome }) {
  return (
    <article className="bg-background p-3 text-sm ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-2">
        <ResultBadge result={outcome.result} />
        <a href={`/admin/clients/${outcome.clientId}`} className="font-semibold underline">
          {outcome.clientName}
        </a>
        <span className="text-xs text-muted-foreground">
          {outcome.number} · 공급가 {won(outcome.supply)}
          {outcome.rate !== null && ` · 영업이익률 ${outcome.rate}%`}
          {outcome.rivalPrice !== null && ` · 다른 업체 ${won(outcome.rivalPrice)}`}
        </span>
      </div>
      {outcome.reasons.length > 0 && <p className="mt-1.5">{outcome.reasons.join(' · ')}</p>}
      {outcome.note && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{outcome.note}</p>}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {outcome.categories.length > 0 && `${outcome.categories.map(categoryLabel).join(', ')} · `}
        {outcome.by || '기록자 없음'} · {day(outcome.at)}
      </p>
    </article>
  )
}

/** 지식 DB '수주·실주' 탭: 수주율, 이유별 건수, 기록 목록 */
export function OutcomeBoard({ outcomes }: { outcomes: Outcome[] }) {
  const [filter, setFilter] = useState<OutcomeResult | 'all'>('all')
  const w = winRate(outcomes)
  const list = outcomes.filter((o) => filter === 'all' || o.result === filter)
  const avg = (r: OutcomeResult) => {
    const rates = outcomes.filter((o) => o.result === r && o.rate !== null).map((o) => o.rate as number)
    return rates.length ? `${(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)}%` : '기록 없음'
  }
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">계약이 된 견적과 안 된 견적, 그 이유를 모은 기록임. 업체 화면 아래 &lsquo;수주·실주 결과&rsquo;에서 남김.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ['수주율', w.rate === null ? '기록 없음' : `${w.rate.toFixed(0)}%`, `수주 ${w.won} · 실주 ${w.lost} · 보류 ${w.hold}`],
            ['수주 견적 평균 영업이익률', avg('won'), '기록할 때의 견적 기준'],
            ['실주 견적 평균 영업이익률', avg('lost'), '기록할 때의 견적 기준'],
          ] as const
        ).map(([k, v, sub]) => (
          <div key={k} className="bg-background p-4 ring-1 ring-border">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['lost', 'won'] as const).map((r) => {
          const counts = countReasons(outcomes, r)
          const max = counts[0]?.count ?? 1
          return (
            <div key={r} className="bg-background p-4 ring-1 ring-border">
              <p className="text-sm font-semibold">{r === 'lost' ? '안 된 이유' : '된 이유'}</p>
              {counts.length === 0 && <p className="mt-2 text-sm text-muted-foreground">아직 기록이 없음.</p>}
              <ul className="mt-2 space-y-1.5 text-sm">
                {counts.map((c) => (
                  <li key={c.reason} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2">
                    <span className="relative px-2 py-1">
                      <span className={cn('absolute inset-y-0 left-0', r === 'lost' ? 'bg-red-100' : 'bg-emerald-100')} style={{ width: `${(c.count / max) * 100}%` }} />
                      <span className="relative">{c.reason}</span>
                    </span>
                    <span className="text-right tabular-nums">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {(['all', ...OUTCOME_RESULTS] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('border px-3 py-1.5 text-sm', filter === f ? 'border-foreground bg-foreground text-background' : 'border-border bg-background')}
          >
            {f === 'all' ? `전체 ${outcomes.length}` : `${RESULT_LABEL[f]} ${outcomes.filter((o) => o.result === f).length}`}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="bg-background p-5 text-sm ring-1 ring-border">아직 남긴 결과가 없음.</p>}
      {list.map((o) => (
        <OutcomeRow key={o.clientId} outcome={o} />
      ))}
    </section>
  )
}
