'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createKnowledge, removeKnowledge, saveKnowledgeAnswer } from '@/app/actions/knowledge'
import {
  CATEGORY_OPTIONS,
  COMMON,
  KIND_LABEL,
  LABOR_RATIO_REF,
  MANUAL_GROUPS,
  MANUAL_RULES,
  TOPICS,
  categoryLabel,
  type KnowledgeEntry,
  type KnowledgeKind,
  type ManualItem,
  type Topic,
} from '@/lib/knowledge/shared'

const day = (iso: string) => iso.slice(0, 10)

type View = 'open' | 'category' | 'deviation'

/** 지식 DB 화면 (어드민 전용): 답 대기 질문 · 공종별 매뉴얼과 쌓인 지식 · 매뉴얼 예외 기록 */
export function KnowledgeBoard({ entries }: { entries: KnowledgeEntry[] }) {
  const open = entries.filter((e) => e.kind === 'qa' && !e.body)
  const deviations = entries.filter((e) => e.kind === 'deviation')
  const [view, setView] = useState<View>(open.length ? 'open' : 'category')
  const [adding, setAdding] = useState(false)
  const byCategory = useMemo(() => {
    const m = new Map<string, KnowledgeEntry[]>()
    for (const e of entries) m.set(e.category, [...(m.get(e.category) ?? []), e])
    return m
  }, [entries])
  const tabs: { key: View; label: string }[] = [
    { key: 'open', label: `답 대기 ${open.length}` },
    { key: 'category', label: `공종별 ${entries.length - open.length}` },
    { key: 'deviation', label: `매뉴얼 예외 ${deviations.length}` },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={cn('border px-4 py-2 text-sm font-medium', view === t.key ? 'border-foreground bg-foreground text-background' : 'border-border bg-background')}
          >
            {t.label}
          </button>
        ))}
        <Button variant="outline" className="ml-auto rounded-none" onClick={() => setAdding((v) => !v)}>
          <Plus /> 기준·경험 남기기
        </Button>
      </div>

      {adding && <AddForm onDone={() => setAdding(false)} />}

      {view === 'open' && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            지난 견적을 보고 뽑은 질문임. 아는 대로 이유를 적어 저장하면 공종별 지식으로 옮겨지고, 누가 언제 답했는지 남음. 나중에 고쳐도 이전 답은 지워지지 않음.
          </p>
          {open.length === 0 && <p className="bg-background p-5 text-sm ring-1 ring-border">답을 기다리는 질문이 없음.</p>}
          {open.map((e) => (
            <EntryCard key={e.id} entry={e} showCategory />
          ))}
        </section>
      )}

      {view === 'category' && (
        <section className="flex flex-col gap-4">
          <details className="bg-background p-5 ring-1 ring-border">
            <summary className="cursor-pointer text-sm font-semibold">가격 기준 (회사 매뉴얼)</summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>자재비: 실매입가에 5% 인상을 기본으로 하고, 견적마다 인상률·여분율을 고름.</li>
              <li>인건비: 인원 × 일수로 넣거나, 공종별로 자재비 × 비율로 맞춤. 비싼 자재는 인건비도 올라가고 싼 자재는 내려감.</li>
              <li>영업이익: 원가 하한(실매입 + 실지급 인건비 + 보험 + 경비, 운영비 5%) 위에 10%.</li>
              <li>기준과 다르게 넣으면 업체 화면 &lsquo;매뉴얼과 다르게 한 점&rsquo;에 이유를 남김.</li>
            </ul>
            <table className="mt-4 w-full max-w-2xl text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">공종</th>
                  <th className="px-2 py-1.5 text-left font-medium">지난 견적 인건비 ÷ 자재비</th>
                  <th className="px-2 py-1.5 text-left font-medium">근거</th>
                </tr>
              </thead>
              <tbody>
                {LABOR_RATIO_REF.map((r) => (
                  <tr key={r.group} className="border-t border-border">
                    <td className="px-2 py-1.5">{r.group}</td>
                    <td className="px-2 py-1.5 tabular-nums">{r.ratio}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          {[{ code: COMMON, name: '공통 (모든 공사)', division: '', items: [] as ManualItem[] }, ...MANUAL_GROUPS].map((g) => {
            const list = (byCategory.get(g.code) ?? []).filter((e) => e.body)
            const waiting = (byCategory.get(g.code) ?? []).length - list.length
            return (
              <details key={g.code} className="bg-background ring-1 ring-border" open={list.length > 0}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-4 text-sm font-semibold">
                  {g.code !== COMMON && <span className="font-mono text-xs text-muted-foreground">{g.code}</span>}
                  {g.name}
                  {g.division && <span className="text-xs font-normal text-muted-foreground">{g.division}</span>}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    쌓인 지식 {list.length}
                    {waiting > 0 && ` · 답 대기 ${waiting}`}
                  </span>
                </summary>
                <div className="flex flex-col gap-4 border-t border-border p-4">
                  {g.items.map((it) => (
                    <ManualBlock key={it.code} item={it} />
                  ))}
                  {list.map((e) => (
                    <EntryCard key={e.id} entry={e} />
                  ))}
                  {g.items.length === 0 && list.length === 0 && <p className="text-sm text-muted-foreground">아직 남긴 내용이 없음.</p>}
                </div>
              </details>
            )
          })}
          <details className="bg-background p-5 ring-1 ring-border">
            <summary className="cursor-pointer text-sm font-semibold">자동으로 붙는 규칙 {MANUAL_RULES.length}</summary>
            <ul className="mt-3 space-y-1.5 text-sm">
              {MANUAL_RULES.map((r) => (
                <li key={r.id}>
                  <span className="font-mono text-xs text-muted-foreground">{r.id}</span> {r.when} → {r.add}
                  {r.status !== '확정' && <span className="ml-1 text-xs text-orange-600">({r.status})</span>}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {view === 'deviation' && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">회사 기준과 다르게 작성한 견적의 기록임. 업체 화면 아래 &lsquo;매뉴얼과 다르게 한 점&rsquo;에서 남김.</p>
          {deviations.length === 0 && <p className="bg-background p-5 text-sm ring-1 ring-border">아직 남긴 예외가 없음.</p>}
          {deviations.map((e) => (
            <EntryCard key={e.id} entry={e} showCategory />
          ))}
        </section>
      )}
    </div>
  )
}

function ManualBlock({ item }: { item: ManualItem }) {
  const rows: [string, string[]][] = [
    ['고려할 점', item.consider],
    ['고객에게 확인', item.ask],
    ['공정', item.steps],
    ['인원', item.crew],
    ['장비', item.equip],
    ['자재', item.materials],
  ]
  return (
    <div className="border-l-2 border-border pl-3">
      <p className="text-sm font-medium">
        <span className="font-mono text-xs text-muted-foreground">{item.code}</span> {item.name}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{item.status}</span>
      </p>
      <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[6rem_1fr]">
        {rows
          .filter(([, v]) => v.length > 0)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-xs text-muted-foreground sm:pt-0.5">{k}</dt>
              <dd>{k === '공정' ? v.join(' → ') : v.join(' · ')}</dd>
            </div>
          ))}
      </dl>
    </div>
  )
}

export function EntryCard({ entry, showCategory }: { entry: KnowledgeEntry; showCategory?: boolean }) {
  const router = useRouter()
  const [body, setBody] = useState(entry.body)
  const [editing, setEditing] = useState(!entry.body)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const save = () =>
    start(async () => {
      const res = await saveKnowledgeAnswer(entry.id, body)
      if (!res.ok) return setError(res.error)
      setError('')
      setEditing(!body.trim())
      router.refresh()
    })
  const remove = () =>
    confirm('이 기록을 지울까요? 이전 답까지 모두 지워집니다.') &&
    start(async () => {
      const res = await removeKnowledge(entry.id)
      if (!res.ok) return setError(res.error)
      router.refresh()
    })
  return (
    <article className="bg-background p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className={cn('px-1.5 py-0.5', entry.kind === 'deviation' ? 'bg-orange-100 text-orange-700' : 'bg-secondary')}>{KIND_LABEL[entry.kind]}</span>
        <span>{entry.topic}</span>
        {showCategory && <span>{categoryLabel(entry.category)}</span>}
        {(entry.clientName || entry.source) && <span>{[entry.clientName, entry.source].filter(Boolean).join(' · ')}</span>}
        <Button variant="ghost" size="icon-xs" className="ml-auto" title="지우기" onClick={remove} disabled={pending}>
          <Trash2 />
        </Button>
      </div>
      <p className="mt-2 text-sm font-semibold">{entry.title}</p>
      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="왜 그렇게 했는지, 어떤 조건이면 달라지는지 적음"
            className="w-full border border-input bg-background p-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-none" onClick={save} disabled={pending || body === entry.body}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />} 저장
            </Button>
            {entry.body && (
              <Button variant="ghost" size="sm" onClick={() => (setBody(entry.body), setEditing(false))}>
                취소
              </Button>
            )}
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap text-sm">{entry.body}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {entry.answeredBy || '기록자 없음'} · {day(entry.updatedAt)}
            <button className="underline" onClick={() => setEditing(true)}>
              고치기
            </button>
          </p>
        </>
      )}
      {entry.history.length > 0 && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">이전 답 {entry.history.length}</summary>
          <ul className="mt-1 space-y-1.5">
            {entry.history.map((h, i) => (
              <li key={i} className="whitespace-pre-wrap border-l-2 border-border pl-2">
                {h.by || '기록자 없음'} · {day(h.at)}
                {'\n'}
                {h.body}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}

/** 새 기록. fixed 를 주면 업체 화면의 매뉴얼 예외 메모로 쓴다(종류·업체 고정) */
export function AddForm({ onDone, fixed }: { onDone?: () => void; fixed?: { kind: KnowledgeKind; clientId: number; source: string } }) {
  const router = useRouter()
  const [kind, setKind] = useState<KnowledgeKind>(fixed?.kind ?? 'rule')
  const [category, setCategory] = useState(COMMON)
  const [topic, setTopic] = useState<Topic>('가격·여분율')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [source, setSource] = useState(fixed?.source ?? '')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const deviation = kind === 'deviation'
  const submit = () =>
    start(async () => {
      const res = await createKnowledge({ kind, category, topic, title, body, source, clientId: fixed?.clientId ?? null })
      if (!res.ok) return setError(res.error)
      setError('')
      setTitle('')
      setBody('')
      onDone?.()
      router.refresh()
    })
  const input = 'h-9 border border-input bg-background px-2 text-sm'
  return (
    <div className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border">
      <div className="grid gap-3 sm:grid-cols-4">
        {!fixed && (
          <select value={kind} onChange={(e) => setKind(e.target.value as KnowledgeKind)} className={input}>
            <option value="rule">기준·경험 (이유까지 바로 적음)</option>
            <option value="qa">질문 (답은 나중에)</option>
          </select>
        )}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className={input}>
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        {!fixed && <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="근거 현장·견적 (선택)" className={input} />}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={deviation ? '무엇이 회사 기준과 다른지 (예: 자재 인상률 5% → 0%)' : kind === 'qa' ? '질문' : '제목 (예: 지붕 판넬은 운송 길이 때문에 12m 넘기지 않음)'}
        className={input}
      />
      {kind !== 'qa' && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={deviation ? '왜 다르게 했는지 (고객 사정, 현장 조건, 경쟁 견적 등)' : '이유, 달라지는 조건'}
          className="w-full border border-input bg-background p-2 text-sm"
        />
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" className="rounded-none" onClick={submit} disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} 남기기
        </Button>
        <span className="text-xs text-muted-foreground">로그인한 이름과 날짜가 함께 기록됨.</span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  )
}
