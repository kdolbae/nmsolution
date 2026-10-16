'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { diffLines, quoteSegments, sameLines, splitProposal, type Line, type Segment } from '@/lib/clients/compare'
import { won, type Quote } from '@/lib/clients/quote'
import { fmtAt } from '@/components/admin/client-versions'

type Side = { no: number; at: string; summary: string; supply: number; proposalHtml: string; quote: Quote }
type Status = 'same' | 'changed' | 'added' | 'removed'
type Entry = { key: string; doc: Segment['doc']; group: string; title: string; a?: Segment; b?: Segment; status: Status }

const STATUS: Record<Exclude<Status, 'same'>, { label: string; cls: string }> = {
  changed: { label: '변경', cls: 'bg-orange-100 text-orange-700' },
  added: { label: '추가', cls: 'bg-emerald-100 text-emerald-700' },
  removed: { label: '삭제', cls: 'bg-red-100 text-red-700' },
}

/** 두 버전의 조각을 이후 버전 순서로 합치고, 이전에만 있던 조각은 바로 앞 조각 뒤에 끼운다 */
function merge(a: Segment[], b: Segment[]): Entry[] {
  const inA = new Map(a.map((s) => [s.key, s]))
  const inB = new Map(b.map((s) => [s.key, s]))
  const keys = b.map((s) => s.key)
  a.forEach((s, i) => {
    if (inB.has(s.key)) return
    const prev = a.slice(0, i).reverse().find((p) => keys.includes(p.key))
    keys.splice(prev ? keys.indexOf(prev.key) + 1 : 0, 0, s.key)
  })
  return keys.map((key) => {
    const sa = inA.get(key)
    const sb = inB.get(key)
    const s = (sb ?? sa)!
    const status: Status = !sa ? 'added' : !sb ? 'removed' : sameLines(sa.lines, sb.lines) ? 'same' : 'changed'
    return { key, doc: s.doc, group: s.group, title: s.title, a: sa, b: sb, status }
  })
}

function LineView({ line, other, tone }: { line?: Line; other?: Line; tone: 'none' | 'del' | 'add' }) {
  const bg = tone === 'del' ? 'bg-red-50' : tone === 'add' ? 'bg-emerald-50' : ''
  if (!line) return <div className={cn('min-h-7 border-l border-border', tone !== 'none' && 'bg-secondary/60')} />
  // 바뀐 줄에서 상대 줄과 다른 칸만 진하게 표시한다
  const mark = (i: number) =>
    tone !== 'none' && other?.cells && line.cells && other.cells.length === line.cells.length && other.cells[i] !== line.cells[i]
      ? tone === 'del'
        ? 'bg-red-200/70 line-through decoration-red-700/60'
        : 'bg-emerald-200/80 font-semibold'
      : ''
  if (line.item && line.cells) {
    const [kind, name, spec, qty, unit, price, amount, note] = line.cells
    return (
      <div className={cn('flex flex-col gap-0.5 border-l border-border px-3 py-1.5 text-sm', bg)}>
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={cn('text-xs text-muted-foreground', mark(0))}>[{kind}]</span>
          <span className={cn('font-medium', mark(1))}>{name}</span>
          {spec && <span className={cn('text-xs text-muted-foreground', mark(2))}>{spec}</span>}
        </div>
        <div className="flex flex-wrap items-baseline justify-end gap-x-1 text-xs tabular-nums">
          <span className={mark(3)}>{qty}</span>
          <span className={mark(4)}>{unit}</span>
          <span className="text-muted-foreground">×</span>
          <span className={mark(5)}>{price}</span>
          <span className="text-muted-foreground">=</span>
          <span className={cn('text-sm font-semibold', mark(6))}>{amount}원</span>
        </div>
        {note && <div className={cn('text-xs text-muted-foreground', mark(7))}>{note}</div>}
      </div>
    )
  }
  if (line.cells) {
    const n = line.cells.length
    return (
      <div
        className={cn('grid gap-x-3 border-l border-border px-3 py-1 text-xs', bg)}
        style={{ gridTemplateColumns: n === 2 ? 'minmax(4rem,max-content) minmax(0,1fr)' : `repeat(${n}, minmax(0, 1fr))` }}
      >
        {line.cells.map((c, i) => (
          <span key={i} className={cn('min-w-0 break-words', /^[\d,.\s원−+-]+$/.test(c) && 'text-right tabular-nums', mark(i))}>
            {c || '\u00a0'}
          </span>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('border-l border-border px-3 py-1 text-sm leading-relaxed break-words', bg, tone === 'del' && 'text-red-900', tone === 'add' && 'text-emerald-900')}>
      {line.text}
    </div>
  )
}

function SegmentCompare({ e, a, b }: { e: Entry; a: Side; b: Side }) {
  const rows = useMemo(() => diffLines(e.a?.lines ?? [], e.b?.lines ?? []), [e])
  return (
    <section id={`cmp-${e.key}`} className="scroll-mt-4 bg-background ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {e.doc}
          {e.doc === '제안서' && ` › ${e.group}`}
        </span>
        <h3 className="text-sm font-semibold">{e.title}</h3>
        {e.status !== 'same' ? (
          <span className={cn('px-1.5 py-0.5 text-[11px] font-semibold', STATUS[e.status].cls)}>{STATUS[e.status].label}</span>
        ) : (
          <span className="text-xs text-muted-foreground">바뀐 것 없음</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-2">
          <div className="border-b border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            이전 v{a.no} · {fmtAt(a.at)}
          </div>
          <div className="border-b border-l border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            이후 v{b.no} · {fmtAt(b.at)}
          </div>
          {rows.map((r, i) => (
            <Fragment key={i}>
              <LineView line={r.a} other={r.b} tone={r.kind === 'same' ? 'none' : 'del'} />
              <LineView line={r.b} other={r.a} tone={r.kind === 'same' ? 'none' : 'add'} />
            </Fragment>
          ))}
          {!rows.length && <p className="col-span-2 px-3 py-4 text-sm text-muted-foreground">내용 없음</p>}
        </div>
      </div>
    </section>
  )
}

/**
 * 두 버전 비교. 왼쪽 목차(소제목 단위)에서 비교할 것만 체크하면 오른쪽에 이전·이후를 나란히 보여 준다.
 * 지워진 줄은 빨강, 더해진 줄은 초록, 내역 표에서 바뀐 칸은 진하게 표시한다.
 */
export function ClientCompare({
  clientId,
  clientName,
  finalizedVersion,
  versions,
  a,
  b,
}: {
  clientId: number
  clientName: string
  finalizedVersion: number | null
  versions: { no: number; at: string; summary: string }[]
  a: Side
  b: Side
}) {
  const router = useRouter()
  // 제안서는 DOMParser 로 나누므로 브라우저에서만 만든다
  const [proposal, setProposal] = useState<{ a: Segment[]; b: Segment[] } | null>(null)
  useEffect(() => setProposal({ a: splitProposal(a.proposalHtml), b: splitProposal(b.proposalHtml) }), [a.proposalHtml, b.proposalHtml])

  const entries = useMemo(
    () => [...merge(quoteSegments(a.quote), quoteSegments(b.quote)), ...(proposal ? merge(proposal.a, proposal.b) : [])],
    [a.quote, b.quote, proposal],
  )
  const changedKeys = useMemo(() => entries.filter((e) => e.status !== 'same').map((e) => e.key), [entries])

  const [checked, setChecked] = useState<Set<string> | null>(null)
  const sel = checked ?? new Set(changedKeys)
  const setSel = (next: Set<string>) => setChecked(new Set(next))
  const toggle = (keys: string[], on: boolean) => {
    const next = new Set(sel)
    keys.forEach((k) => (on ? next.add(k) : next.delete(k)))
    setSel(next)
  }
  const [onlyChanged, setOnlyChanged] = useState(false)

  const groups = useMemo(() => {
    const out: { doc: string; group: string; items: Entry[] }[] = []
    for (const e of entries) {
      if (onlyChanged && e.status === 'same') continue
      const last = out.at(-1)
      if (last && last.doc === e.doc && last.group === e.group) last.items.push(e)
      else out.push({ doc: e.doc, group: e.group, items: [e] })
    }
    return out
  }, [entries, onlyChanged])

  const go = (na: number, nb: number) => router.push(`/admin/clients/${clientId}/compare?a=${na}&b=${nb}`)
  const label = (v: { no: number; at: string; summary: string }) =>
    `v${v.no}${v.no === versions[0]?.no ? ' (최신)' : ''}${v.no === finalizedVersion ? ' (최종본)' : ''} · ${fmtAt(v.at)} · ${v.summary}`
  const diff = b.supply - a.supply
  const shown = entries.filter((e) => sel.has(e.key))

  return (
    // 나란히 비교하려면 넓어야 하므로 관리자 본문 폭(max-w-5xl)을 벗어나 화면 폭을 쓴다 (사이드바 w-60 제외)
    <div className="flex flex-col gap-5 lg:relative lg:left-1/2 lg:w-[calc(100vw-20rem)] lg:max-w-[1600px] lg:-translate-x-1/2">
      <div className="bg-background p-5 ring-1 ring-border lg:p-6">
        <h1 className="text-2xl font-bold tracking-tight">{clientName} · 버전 비교</h1>
        <div className="mt-4 grid items-end gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            이전
            <select value={a.no} onChange={(e) => go(Number(e.target.value), b.no)} className="h-9 w-full border border-input bg-background px-2 text-sm text-foreground">
              {versions.map((v) => (
                <option key={v.no} value={v.no}>
                  {label(v)}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" size="icon" className="rounded-none" title="앞뒤 바꾸기" onClick={() => go(b.no, a.no)}>
            <ArrowLeftRight />
          </Button>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            이후
            <select value={b.no} onChange={(e) => go(a.no, Number(e.target.value))} className="h-9 w-full border border-input bg-background px-2 text-sm text-foreground">
              {versions.map((v) => (
                <option key={v.no} value={v.no}>
                  {label(v)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm tabular-nums">
          공급가액 {won(a.supply)}원 → <b>{won(b.supply)}원</b>
          {diff !== 0 && (
            <span className={cn('ml-2 font-semibold', diff > 0 ? 'text-orange-600' : 'text-electric')}>
              ({diff > 0 ? '+' : '−'}
              {won(Math.abs(diff))}원)
            </span>
          )}
          <span className="ml-3 text-muted-foreground">바뀐 곳 {changedKeys.length}개</span>
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[260px_1fr]">
        <nav aria-label="비교 목차" className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            <Button size="xs" variant="outline" className="rounded-none" onClick={() => setSel(new Set(changedKeys))}>
              바뀐 곳만
            </Button>
            <Button size="xs" variant="outline" className="rounded-none" onClick={() => setSel(new Set(entries.map((e) => e.key)))}>
              전체
            </Button>
            <Button size="xs" variant="outline" className="rounded-none" onClick={() => setSel(new Set())}>
              해제
            </Button>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
            목차에 바뀐 곳만 보이기
          </label>
          {!proposal && <p className="text-xs text-muted-foreground">제안서 목차를 만드는 중…</p>}
          {groups.map((g, gi) => {
            const keys = g.items.map((e) => e.key)
            const all = keys.every((k) => sel.has(k))
            const newDoc = gi === 0 || groups[gi - 1].doc !== g.doc
            const single = g.doc === '견적서'
            return (
              <div key={`${g.doc}${g.group}${gi}`} className="flex flex-col gap-1">
                {newDoc && <p className="mt-1 border-b border-border pb-1 text-xs font-bold text-navy">{g.doc}</p>}
                {!single && (
                  <label className="flex items-start gap-2 text-sm font-semibold">
                    <input type="checkbox" className="mt-1" checked={all} onChange={(e) => toggle(keys, e.target.checked)} />
                    <span className="min-w-0">{g.group}</span>
                  </label>
                )}
                {g.items.map((e) => (
                  <label key={e.key} className={cn('flex items-start gap-2 text-sm', !single && 'pl-5')}>
                    <input type="checkbox" className="mt-1" checked={sel.has(e.key)} onChange={(ev) => toggle([e.key], ev.target.checked)} />
                    <span className="min-w-0 flex-1">{e.title}</span>
                    {e.status !== 'same' && <span className={cn('shrink-0 px-1 text-[10px] font-semibold', STATUS[e.status].cls)}>{STATUS[e.status].label}</span>}
                  </label>
                ))}
              </div>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          {shown.length ? (
            shown.map((e) => <SegmentCompare key={e.key} e={e} a={a} b={b} />)
          ) : (
            <p className="border border-dashed border-border bg-background px-6 py-16 text-center text-sm text-muted-foreground">
              {a.no === b.no ? '같은 버전을 골랐습니다. 위에서 다른 버전을 고르세요.' : '왼쪽 목차에서 비교할 소제목을 체크하세요.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
