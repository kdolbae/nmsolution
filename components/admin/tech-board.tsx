'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { askMethodSuggestion, removeTechCard, saveTechCard } from '@/app/actions/tech'
import { CATEGORY_OPTIONS, COMMON, categoryLabel } from '@/lib/knowledge/shared'
import { COMPARE_KEYS, EMPTY_TECH, TECH_STATUS, groupBySet, type MethodPick, type TechCard, type TechInput, type TechStatus } from '@/lib/tech/shared'

const day = (iso: string) => iso.slice(0, 10)
const tone: Record<TechStatus, string> = { 확인됨: 'bg-emerald-100 text-emerald-800', '현장 경험': 'bg-sky-100 text-sky-800', 미확인: 'bg-orange-100 text-orange-800' }

export function StatusBadge({ status }: { status: TechStatus }) {
  return <span className={cn('whitespace-nowrap px-1.5 py-0.5 text-xs font-medium', tone[status])}>{status}</span>
}

/** 비교표: 방식을 가로로, 기준을 세로로. pick 을 주면 맨 위에서 방식을 고를 수 있다 */
export function CompareTable({ cards, pick, onPick }: { cards: TechCard[]; pick?: string; onPick?: (name: string) => void }) {
  const rows: [string, (c: TechCard) => string][] = [
    ...COMPARE_KEYS.map((k): [string, (c: TechCard) => string] => [k, (c) => c.compare[k] ?? '']),
    ['유리한 때', (c) => c.when],
    ['피할 때', (c) => c.avoid],
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-secondary text-xs">
            <th className="w-24 px-2 py-1.5 text-left font-medium text-muted-foreground">기준</th>
            {cards.map((c) => (
              <th key={c.id} className={cn('px-2 py-1.5 text-left font-semibold', pick === c.name && 'bg-foreground text-background')}>
                <label className="flex items-start gap-1.5">
                  {onPick && <input type="radio" className="mt-0.5" checked={pick === c.name} onChange={() => onPick(c.name)} />}
                  <span>{c.name}</span>
                </label>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, get]) => (
            <tr key={k} className="border-t border-border align-top">
              <td className="px-2 py-1.5 text-xs text-muted-foreground">{k}</td>
              {cards.map((c) => (
                <td key={c.id} className={cn('px-2 py-1.5', pick === c.name && 'bg-secondary/60')}>
                  {get(c)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-border">
            <td className="px-2 py-1.5 text-xs text-muted-foreground">확인 상태</td>
            {cards.map((c) => (
              <td key={c.id} className="px-2 py-1.5">
                <StatusBadge status={c.status} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** 카드 한 장의 자세한 내용 */
export function TechDetail({ card }: { card: TechCard }) {
  const rows: [string, string][] = [
    ['원리', card.summary],
    ['장점', card.pros],
    ['단점', card.cons],
    ['시공 요령·도구', card.tips],
    ['흔한 하자', card.defects],
    ['규격·수치', card.figures],
    ['출처', card.source],
  ]
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[7rem_1fr]">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-xs text-muted-foreground sm:pt-0.5">{k}</dt>
            <dd className="whitespace-pre-wrap">{v}</dd>
          </div>
        ))}
    </dl>
  )
}

function TechForm({ card, defaults, onDone }: { card?: TechCard; defaults?: Partial<TechInput>; onDone: () => void }) {
  const router = useRouter()
  const [v, setV] = useState<TechInput>(() => (card ? { ...card, compare: { ...card.compare } } : { ...EMPTY_TECH, ...defaults, compare: {} }))
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const set = <K extends keyof TechInput>(k: K, val: TechInput[K]) => setV((cur) => ({ ...cur, [k]: val }))
  const input = 'h-9 w-full border border-input bg-background px-2 text-sm'
  const area = 'w-full border border-input bg-background p-2 text-sm'
  const submit = () =>
    start(async () => {
      const res = await saveTechCard(card?.id ?? null, v)
      if (!res.ok) return setError(res.error)
      onDone()
      router.refresh()
    })
  const longs: [keyof TechInput, string, string, number][] = [
    ['summary', '원리', '어떻게 붙고 무엇이 막는지', 2],
    ['pros', '장점', '', 2],
    ['cons', '단점', '', 2],
    ['tips', '시공 요령·도구', '순서, 확인 방법, 쓰는 도구', 4],
    ['defects', '흔한 하자', '원인과 막는 법', 2],
    ['figures', '규격·수치', '압력·온도·관경·규격 번호. 출처가 있는 것만 적음', 2],
    ['source', '출처', '카탈로그 이름·링크, 또는 누가 어느 현장에서 겪었는지', 2],
  ]
  return (
    <div className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border">
      <div className="grid gap-3 sm:grid-cols-4">
        <input value={v.set} onChange={(e) => set('set', e.target.value)} placeholder="비교 세트 (예: 배관 이음 방식)" className={input} />
        <input value={v.name} onChange={(e) => set('name', e.target.value)} placeholder="방식 이름" className={input} />
        <select value={v.category} onChange={(e) => set('category', e.target.value)} className={input}>
          {CATEGORY_OPTIONS.filter((c) => c.code !== COMMON).map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={v.status} onChange={(e) => set('status', e.target.value as TechStatus)} className={input}>
          {TECH_STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {longs.map(([k, label, ph, rows]) => (
        <label key={k} className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-[7rem_1fr] sm:items-start">
          <span className="sm:pt-2">{label}</span>
          <textarea value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} rows={rows} placeholder={ph} className={cn(area, 'text-foreground')} />
        </label>
      ))}
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ['when', '이럴 때 유리'],
            ['avoid', '이럴 때 피함'],
          ] as const
        ).map(([k, label]) => (
          <input key={k} value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder={label} className={input} />
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold">비교표에 나올 한 줄</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COMPARE_KEYS.map((k) => (
            <label key={k} className="grid grid-cols-[5rem_1fr] items-center gap-2 text-xs text-muted-foreground">
              {k}
              <input value={v.compare[k] ?? ''} onChange={(e) => set('compare', { ...v.compare, [k]: e.target.value })} className={cn(input, 'text-foreground')} />
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="rounded-none" onClick={submit} disabled={pending || !v.name.trim() || !v.set.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} 저장
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          취소
        </Button>
        <span className="text-xs text-muted-foreground">로그인한 이름과 날짜가 기록되고, 고치기 전 내용은 남음.</span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  )
}

function TechCardView({ card }: { card: TechCard }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  if (editing) return <TechForm card={card} onDone={() => setEditing(false)} />
  const remove = () =>
    confirm(`'${card.name}' 카드를 지울까요? 고친 기록까지 모두 지워집니다.`) &&
    start(async () => {
      await removeTechCard(card.id)
      router.refresh()
    })
  return (
    <details className="bg-background ring-1 ring-border">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm font-semibold">
        {card.name}
        <StatusBadge status={card.status} />
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {card.updatedBy || '기록자 없음'} · {day(card.updatedAt)}
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-3">
        <TechDetail card={card} />
        <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <button className="underline" onClick={() => setEditing(true)}>
            고치기
          </button>
          <button className="underline" onClick={remove} disabled={pending}>
            지우기
          </button>
          {card.history.length > 0 && <span>고친 기록 {card.history.length}번 (마지막 {day(card.history[card.history.length - 1].at)})</span>}
        </p>
      </div>
    </details>
  )
}

/** 지식 DB '기술 자료' 탭: 비교 세트마다 비교표와 카드 */
export function TechBoard({ cards }: { cards: TechCard[] }) {
  const [adding, setAdding] = useState<string | null>(null)
  const sets = groupBySet(cards)
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          이음 방식·공법·자재마다 원리, 장단점, 시공 요령을 쌓아 둠. 같은 목적의 대안은 비교 세트로 묶여 견적 편집의 &lsquo;방식 고르기&rsquo;에 비교표로 뜸. 수치는 출처가 있는 것만 적고, 확인하지
          못한 내용은 &lsquo;미확인&rsquo;으로 둠.
        </p>
        <Button variant="outline" className="ml-auto rounded-none" onClick={() => setAdding(adding === '' ? null : '')}>
          <Plus /> 새 비교 세트·카드
        </Button>
      </div>
      {adding === '' && <TechForm onDone={() => setAdding(null)} />}
      {sets.length === 0 && <p className="bg-background p-5 text-sm ring-1 ring-border">아직 기술 자료가 없음.</p>}
      {sets.map((s) => {
        const key = `${s.category}\n${s.set}`
        return (
          <div key={key} className="flex flex-col gap-3 bg-secondary/40 p-4 ring-1 ring-border">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">{s.set}</h2>
              <span className="text-xs text-muted-foreground">
                {categoryLabel(s.category)} · 방식 {s.cards.length}
              </span>
              <button className="ml-auto text-xs underline" onClick={() => setAdding(adding === key ? null : key)}>
                + 이 세트에 방식 추가
              </button>
            </div>
            <div className="bg-background ring-1 ring-border">
              <CompareTable cards={s.cards} />
            </div>
            {adding === key && <TechForm defaults={{ set: s.set, category: s.category }} onDone={() => setAdding(null)} />}
            {s.cards.map((c) => (
              <TechCardView key={c.id} card={c} />
            ))}
          </div>
        )
      })}
    </section>
  )
}

/**
 * 견적 편집 '방식 고르기' (공종 하나의 비교 세트 하나): 비교표에서 방식을 고르고 이유를 적는다.
 * 'Claude 제안'은 이번 공종의 품목(금액 없음)과 '먼저 정할 것' 답, 회사 기술 자료를 보내 추천을 받는다. 참고용이고 저장되지 않는다.
 */
export function MethodPicker({
  set,
  category,
  cards,
  value,
  onChange,
  context,
}: {
  set: string
  category: string
  cards: TechCard[]
  value: MethodPick | undefined
  onChange: (v: MethodPick | undefined) => void
  context: { sectionName: string; items: { kind: string; name: string; spec: string; qty: number; unit: string }[]; checks: Record<string, string> }
}) {
  const [advice, setAdvice] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const picked = cards.find((c) => c.name === value?.pick)
  const ask = () =>
    start(async () => {
      const res = await askMethodSuggestion({ set, category, ...context })
      if (!res.ok) return setError(res.error)
      setError('')
      setAdvice(res.text)
    })
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('text-sm font-semibold', !value?.pick && 'text-orange-700')}>
          {set}
          {value?.pick ? `: ${value.pick}` : ' (아직 안 고름)'}
        </p>
        <Button variant="outline" size="sm" className="ml-auto rounded-none" onClick={ask} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} Claude 제안
        </Button>
        {value?.pick && (
          <button type="button" className="text-xs underline" onClick={() => onChange(undefined)}>
            선택 지우기
          </button>
        )}
      </div>
      {error && <p className="border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-800">{error}</p>}
      {advice && (
        <div className="border border-sky-300 bg-sky-50 px-3 py-2 text-sm">
          <p className="mb-1 text-xs font-semibold text-sky-800">Claude 제안 (참고용, 저장되지 않음)</p>
          <p className="whitespace-pre-wrap">{advice}</p>
        </div>
      )}
      <div className="bg-background ring-1 ring-border">
        <CompareTable cards={cards} pick={value?.pick} onPick={(name) => onChange({ pick: name, why: value?.why ?? '' })} />
      </div>
      {value?.pick && (
        <input
          value={value.why}
          onChange={(e) => onChange({ pick: value.pick, why: e.target.value })}
          placeholder="왜 이 방식을 골랐는지 (현장 조건, 고객 요청, 비용 등)"
          className={cn('h-9 w-full border bg-background px-2 text-sm', value.why.trim() ? 'border-input' : 'border-orange-400')}
        />
      )}
      {picked && (
        <details className="bg-background p-3 ring-1 ring-border">
          <summary className="cursor-pointer text-xs font-semibold">
            {picked.name} 자세히 (시공 요령·흔한 하자) <StatusBadge status={picked.status} />
          </summary>
          <div className="mt-2">
            <TechDetail card={picked} />
          </div>
        </details>
      )}
    </div>
  )
}
