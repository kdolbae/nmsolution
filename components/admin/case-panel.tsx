'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, History, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calcQuote, won, type Quote } from '@/lib/clients/quote'
import {
  DEFAULT_DRAFT_OPTIONS,
  DRAFT_CHECKS,
  draftFromCase,
  findSimilar,
  STANDARD_RATES,
  tradeHistory,
  workTags,
  type CaseMatch,
  type DraftOptions,
  type QuoteCase,
} from '@/lib/clients/quote-cases'

const ALL_TAGS = ['배관', '펌프', '전기', '판넬', '지붕', '외벽', '철골', '용접', '인양', '도장', '철거', '도어', '고소작업', '보온']

const OPTION_LABELS: [keyof DraftOptions, string][] = [
  ['standardLabor', '노무 일당·현장 경비를 회사 기준으로'],
  ['standardRates', `제비율을 회사 기준으로 (일반관리비 ${STANDARD_RATES.overhead}% · 이윤 ${STANDARD_RATES.profit}% · 안전 ${STANDARD_RATES.safety}%)`],
  ['addIndirect', '간접노무비 줄 없는 공종에 넣기 (직접노무비 × 15%)'],
  ['withOptions', '선택 항목 공종도 가져오기'],
  ['withNotes', '특기사항도 가져오기'],
]

function rateText(q: Quote) {
  if (!q.costCalc) return '원가계산 없음'
  const r = q.rates
  return `일반관리비 ${r.overhead}% · 이윤 ${r.profit}% · 안전 ${r.safety}%`
}

/**
 * 지난 견적에서 시작 (lib/clients/quote-cases.ts).
 * 요청 내용을 적으면 비슷한 지난 견적을 보여 주고, 고른 견적으로 이 견적서의 공종·줄을 채운다.
 */
export function CasePanel({ cases, q, onApply }: { cases: QuoteCase[]; q: Quote; onApply: (quote: Quote) => void }) {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState(q.title)
  const [tags, setTags] = useState<string[]>([])
  const [opt, setOpt] = useState<DraftOptions>(DEFAULT_DRAFT_OPTIONS)
  const [picked, setPicked] = useState<string | null>(null)
  const [showRates, setShowRates] = useState(false)
  const matches = useMemo(() => findSimilar(request, cases, tags), [request, cases, tags])
  const auto = useMemo(() => workTags(request), [request])
  const history = useMemo(() => tradeHistory(cases), [cases])
  const empty = !q.sections.some((s) => s.items.some((i) => i.name.trim()))

  const pick = matches.find((m) => m.c.key === picked) ?? null
  const draft = useMemo(() => (pick ? draftFromCase(q, pick.c.quote, opt) : null), [pick, q, opt])

  const apply = () => {
    if (!draft || !pick) return
    if (!empty && !confirm(`지금 공종·줄을 지우고 '${pick.c.clientName}' 견적으로 바꿀까요? (저장 전까지는 되돌릴 수 있음: 새로고침)`)) return
    onApply(draft.quote)
    setOpen(false)
    setPicked(null)
  }

  return (
    <section className="bg-background ring-1 ring-border">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 p-4 text-left">
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <History className="size-4" />
        <span className="font-semibold">지난 견적에서 시작</span>
        <span className="ml-auto text-xs text-muted-foreground">견적 사례 {cases.length}개</span>
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-border p-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="case-request">
              요청 내용 (공사명·하는 일)
            </label>
            <textarea
              id="case-request"
              rows={2}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="예: 공장 냉각수 SUS 100A 배관 교체, 주말 작업"
              className="border border-input bg-background p-2 text-sm"
            />
            <div className="flex flex-wrap gap-1.5 text-xs">
              {ALL_TAGS.map((t) => {
                const on = tags.includes(t) || auto.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={auto.includes(t)}
                    onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}
                    className={`border px-2 py-0.5 ${on ? 'border-electric bg-electric/10 text-foreground' : 'border-border text-muted-foreground'}`}
                    title={auto.includes(t) ? '요청 내용에서 자동으로 잡힘' : '눌러서 공사 종류 더하기'}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {cases.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 다른 업체 견적이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-2 py-2" />
                    <th className="px-2 py-2 text-left font-medium">업체 · 공사명</th>
                    <th className="px-2 py-2 text-left font-medium">공사 종류</th>
                    <th className="px-2 py-2 text-left font-medium">인력 (인·일 × 일당)</th>
                    <th className="w-16 px-2 py-2 text-right font-medium">기간</th>
                    <th className="w-28 px-2 py-2 text-right font-medium">공급가액</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <CaseRow key={m.c.key} m={m} on={picked === m.c.key} onPick={() => setPicked(picked === m.c.key ? null : m.c.key)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pick && draft && (
            <div className="flex flex-col gap-3 bg-secondary p-4">
              <p className="text-sm font-semibold">
                {pick.c.clientName} · {pick.c.quote.title} 견적으로 초안 만들기
              </p>
              <div className="grid gap-1.5 text-sm sm:grid-cols-2">
                {OPTION_LABELS.map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={opt[k]} onChange={(e) => setOpt({ ...opt, [k]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                사례 공급가액 {won(pick.pattern.supply)} ({rateText(pick.c.quote)}) → 초안 공급가액 <b className="text-foreground">{won(calcQuote(draft.quote).supply)}</b> (
                {rateText(draft.quote)})
              </p>
              {draft.changes.length > 0 && (
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {draft.changes.map((c, i) => (
                    <li key={i}>
                      {c.section} · {c.item}: {c.from ? `${won(c.from)} → ` : ''}
                      {won(c.to)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-xs">
                <p className="font-medium">초안을 넣은 뒤 꼭 고칠 것</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {DRAFT_CHECKS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Button className="rounded-none" onClick={apply}>
                  <Wand2 /> 이 견적으로 초안 넣기
                </Button>
              </div>
            </div>
          )}

          <div>
            <button type="button" onClick={() => setShowRates(!showRates)} className="flex items-center gap-1 text-sm font-medium">
              {showRates ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} 직종 일당 이력 (지난 견적에 넣은 값)
            </button>
            {showRates && (
              <table className="mt-2 w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">직종</th>
                    <th className="px-2 py-1 text-right font-medium">회사 기준</th>
                    <th className="px-2 py-1 text-left font-medium">견적에 넣은 값</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.trade.key} className="border-t border-border">
                      <td className="px-2 py-1">{h.trade.label}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {h.trade.price ? won(h.trade.price) : '-'}
                        {!h.trade.settled && <span className="text-muted-foreground"> (미정)</span>}
                      </td>
                      <td className="px-2 py-1 tabular-nums text-muted-foreground">
                        {h.uses.map((u) => `${u.clientName} ${won(u.price)}`).join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function CaseRow({ m, on, onPick }: { m: CaseMatch; on: boolean; onPick: () => void }) {
  const p = m.pattern
  return (
    <tr className={`cursor-pointer border-t border-border align-top ${on ? 'bg-electric/5' : 'hover:bg-secondary/60'}`} onClick={onPick}>
      <td className="px-2 py-2 text-center">
        <input type="radio" checked={on} onChange={onPick} aria-label="이 견적 고르기" />
      </td>
      <td className="px-2 py-2">
        <div className="font-medium">{m.c.clientName}</div>
        <div className="text-xs text-muted-foreground">
          {m.c.quote.title} · {m.c.source}
        </div>
      </td>
      <td className="px-2 py-2 text-xs">
        {p.tags.map((t) => (
          <span key={t} className={m.sharedTags.includes(t) ? 'font-semibold text-electric' : 'text-muted-foreground'}>
            {t}{' '}
          </span>
        ))}
      </td>
      <td className="px-2 py-2 text-xs tabular-nums text-muted-foreground">
        {p.crew.map((c) => `${c.label} ${c.manDays}×${c.prices.map((x) => Math.round(x / 10000)).join('/')}만`).join(' · ')}
        {p.indirectPct != null && ` · 간접 ${p.indirectPct}%`}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{p.days ? `${p.days}일` : '-'}</td>
      <td className="px-2 py-2 text-right tabular-nums">{won(p.supply)}</td>
    </tr>
  )
}
