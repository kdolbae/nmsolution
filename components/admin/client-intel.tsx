'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronUp, ExternalLink, ImagePlus, Loader2, Lock, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/admin/form'
import { TextIn } from '@/components/admin/inputs'
import { shrink } from '@/components/photo-quote-form'
import { deleteCard, saveCardContact, saveClientSchedule } from '@/app/actions/client-intel'
import type { Card, CardContact } from '@/lib/clients/cards'
import type { ProfileRecord } from '@/lib/clients/profile'
import { STEP_STATUSES, STEP_STATUS_LABEL, type Schedule, type ScheduleLog, type ScheduleStep } from '@/lib/clients/schedule-shared'
import { cn } from '@/lib/utils'

/** 명함 사진을 줄여서 multipart 로 보낸다 (업체 추가 화면과 함께 씀) */
export async function uploadCards(clientId: number, files: File[], opts: { cardText?: string; research?: boolean; hint?: string }) {
  const fd = new FormData()
  for (const f of files) {
    const blob = await shrink(f)
    if (!blob) throw new Error(`'${f.name}' 사진을 열지 못했습니다. JPG·PNG로 다시 골라 주세요.`)
    fd.append('cards', blob, 'card.jpg')
  }
  if (opts.cardText?.trim()) fd.append('cardText', opts.cardText.trim())
  if (opts.research) fd.append('research', '1')
  if (opts.hint?.trim()) fd.append('hint', opts.hint.trim())
  const res = await fetch(`/api/admin/clients/${clientId}/cards`, { method: 'POST', body: fd })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(body.error || '명함을 올리지 못했습니다.')
}

const CONTACT_FIELDS: { key: keyof CardContact; label: string }[] = [
  { key: 'name', label: '이름' },
  { key: 'title', label: '직함' },
  { key: 'department', label: '부서' },
  { key: 'company', label: '회사' },
  { key: 'mobile', label: '휴대폰' },
  { key: 'phone', label: '전화' },
  { key: 'fax', label: '팩스' },
  { key: 'email', label: '이메일' },
  { key: 'address', label: '주소' },
  { key: 'website', label: '홈페이지' },
]

type Intel = { cards: Card[]; profile: ProfileRecord }

// ---------- 명함·업체 프로필 (내부자료) ----------

export function ClientIntel({ clientId, initial }: { clientId: number; initial: Intel }) {
  const router = useRouter()
  const [data, setData] = useState(initial)
  const [open, setOpen] = useState(true)
  const busy = data.profile.status === 'running' || data.cards.some((c) => c.status === 'reading')

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/clients/${clientId}/intel`, { cache: 'no-store' }).catch(() => null)
    if (res?.ok) setData((await res.json()) as Intel)
  }, [clientId])

  useEffect(() => {
    if (!busy) return
    const t = setInterval(reload, 4000)
    return () => clearInterval(t)
  }, [busy, reload])

  // 명함을 다 읽으면 위쪽 담당자·연락처 표시도 새로 고친다
  const [wasBusy, setWasBusy] = useState(busy)
  useEffect(() => {
    if (wasBusy && !busy) router.refresh()
    setWasBusy(busy)
  }, [busy, wasBusy, router])

  return (
    <section className="bg-background ring-1 ring-border">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-5 py-4 text-left lg:px-6">
        <Lock className="size-4 text-muted-foreground" />
        <span className="text-lg font-bold tracking-tight">업체 정보</span>
        <span className="text-xs text-muted-foreground">내부자료 · 업체·고객에게 보이지 않음</span>
        {busy && <Loader2 className="size-4 animate-spin text-electric" />}
        <span className="ml-auto">{open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-6 border-t border-border px-5 py-5 lg:px-6">
          <Contacts clientId={clientId} cards={data.cards} onChange={reload} />
          <Profile clientId={clientId} profile={data.profile} onChange={reload} />
        </div>
      )}
    </section>
  )
}

function Contacts({ clientId, cards, onChange }: { clientId: number; cards: Card[]; onChange: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [research, setResearch] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const add = () =>
    startTransition(async () => {
      setError('')
      try {
        await uploadCards(clientId, files, { cardText: text, research })
        setFiles([])
        setText('')
        onChange()
      } catch (e) {
        setError(e instanceof Error ? e.message : '명함을 올리지 못했습니다.')
      }
    })

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">담당자 (명함 {cards.length}장)</h3>
      {cards.length > 0 && (
        <ul className="divide-y divide-border ring-1 ring-border">
          {cards.map((c) => (
            <CardRow key={c.id} clientId={clientId} card={c} onChange={onChange} />
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-3 bg-secondary/40 p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <ImagePlus className="size-4" />
          <span className="font-medium">명함 사진 고르기 (여러 장)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, 10))}
          />
          {files.length > 0 && <span className="text-muted-foreground">{files.length}장 고름</span>}
          {files.length > 0 && (
            <button type="button" onClick={() => setFiles([])} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </label>
        <Field label="명함 글 (사진 대신 붙여 넣어도 됨)" value={text} onChange={setText} multiline rows={3} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} /> 명함을 읽은 뒤 업체 다시 조사
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div>
          <Button size="sm" className="rounded-none" onClick={add} disabled={pending || (!files.length && !text.trim())}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} 명함 추가
          </Button>
          <span className="ml-3 text-xs text-muted-foreground">넣을 때마다 읽어서 이름·직함·연락처를 저장함</span>
        </div>
      </div>
    </div>
  )
}

function CardRow({ clientId, card, onChange }: { clientId: number; card: Card; onChange: () => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<CardContact>(
    card.contact ?? { company: '', name: '', title: '', department: '', phone: '', mobile: '', fax: '', email: '', address: '', website: '' },
  )
  const [pending, startTransition] = useTransition()
  const c = card.contact

  const save = () =>
    startTransition(async () => {
      await saveCardContact(clientId, card.id, form)
      setEditing(false)
      onChange()
    })
  const remove = () => {
    if (!confirm('이 명함을 지울까요?')) return
    startTransition(async () => {
      await deleteCard(clientId, card.id)
      onChange()
    })
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
      {card.hasImage ? (
        <a href={`/api/admin/clients/${clientId}/cards/${card.id}`} target="_blank" rel="noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/admin/clients/${clientId}/cards/${card.id}`} alt="명함" className="h-16 w-28 border border-border object-cover" />
        </a>
      ) : (
        <div className="flex h-16 w-28 shrink-0 items-center justify-center border border-dashed border-border text-xs text-muted-foreground">글 명함</div>
      )}
      <div className="min-w-0 flex-1 text-sm">
        {card.status === 'reading' && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> 명함 읽는 중
          </p>
        )}
        {card.status === 'error' && <p className="text-destructive">{card.error}</p>}
        {c && !editing && (
          <>
            <p className="font-semibold">
              {c.name || '이름 없음'} <span className="font-medium text-electric">{c.title || '직함 없음'}</span>
              {c.department && <span className="font-normal text-muted-foreground"> · {c.department}</span>}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {[c.company, c.mobile && `휴대폰 ${c.mobile}`, c.phone && `전화 ${c.phone}`, c.email, c.address].filter(Boolean).join(' · ')}
            </p>
          </>
        )}
        {editing && (
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTACT_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-muted-foreground">{f.label}</span>
                <TextIn value={form[f.key]} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} className="flex-1" />
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        {editing ? (
          <>
            <Button size="sm" className="rounded-none" onClick={save} disabled={pending}>
              <Check /> 저장
            </Button>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => setEditing(false)}>
              취소
            </Button>
          </>
        ) : (
          card.status !== 'reading' && (
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => setEditing(true)}>
              <Pencil /> 고치기
            </Button>
          )
        )}
        <Button size="sm" variant="ghost" className="rounded-none" onClick={remove} disabled={pending}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

function Profile({ clientId, profile, onChange }: { clientId: number; profile: ProfileRecord; onChange: () => void }) {
  const [hint, setHint] = useState(profile.hint)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const p = profile.profile

  const run = () =>
    startTransition(async () => {
      setError('')
      const res = await fetch(`/api/admin/clients/${clientId}/intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) setError(body.error || '조사를 시작하지 못했습니다.')
      onChange()
    })

  const list = (xs: string[]) => (xs.length ? <ul className="list-disc pl-5">{xs.map((x, i) => <li key={i}>{x}</li>)}</ul> : <span className="text-muted-foreground">-</span>)
  const dash = (v: string) => v || <span className="text-muted-foreground">-</span>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold">업체 프로필</h3>
        {profile.status === 'running' && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> 웹에서 조사 중 (몇 분 걸림)
          </span>
        )}
        {profile.status === 'done' && profile.finishedAt && (
          <span className="text-xs text-muted-foreground">{profile.finishedAt.slice(0, 16).replace('T', ' ')} 조사</span>
        )}
      </div>
      {profile.status === 'error' && <p className="text-sm text-destructive">{profile.error}</p>}
      {profile.status === 'idle' && <p className="text-sm text-muted-foreground">아직 조사하지 않았음. 아래 조사 버튼을 누르면 업체명·명함으로 웹을 찾아 종합함.</p>}

      {p && (
        <div className="flex flex-col gap-4 text-sm">
          <p className="whitespace-pre-line leading-relaxed">{p.summary}</p>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold">주업종</dt>
            <dd>{dash(p.industry)}</dd>
            <dt className="font-semibold">주요 제품</dt>
            <dd>{list(p.products)}</dd>
            <dt className="font-semibold">주 고객사</dt>
            <dd>{p.customers.length ? list(p.customers.map((c) => (c.note ? `${c.name} (${c.note})` : c.name))) : dash('')}</dd>
            <dt className="font-semibold">재무상태</dt>
            <dd>
              <p>
                {[p.financials.year && `${p.financials.year} 기준`, p.financials.revenue && `매출 ${p.financials.revenue}`, p.financials.operatingProfit && `영업이익 ${p.financials.operatingProfit}`, p.financials.netIncome && `순이익 ${p.financials.netIncome}`]
                  .filter(Boolean)
                  .join(' · ') || '-'}
              </p>
              {p.financials.assessment && <p className="mt-1 text-muted-foreground">{p.financials.assessment}</p>}
            </dd>
            <dt className="font-semibold">규모</dt>
            <dd>
              {[p.scale.established && `설립 ${p.scale.established}`, p.scale.ceo && `대표 ${p.scale.ceo}`, p.scale.employees && `직원 ${p.scale.employees}`, p.scale.parent && `모회사 ${p.scale.parent}`]
                .filter(Boolean)
                .join(' · ') || '-'}
            </dd>
            <dt className="font-semibold">사업장</dt>
            <dd>{p.sites.length ? list(p.sites.map((s) => `${s.name}: ${s.address}`)) : dash('')}</dd>
            <dt className="font-semibold">사업자번호</dt>
            <dd>{dash(p.bizNumber)}</dd>
            <dt className="font-semibold">홈페이지</dt>
            <dd>
              {p.homepage ? (
                <a href={p.homepage} target="_blank" rel="noreferrer" className="text-electric hover:underline">
                  {p.homepage}
                </a>
              ) : (
                dash('')
              )}
            </dd>
            <dt className="font-semibold">영업 참고</dt>
            <dd>{list(p.salesPoints)}</dd>
            <dt className="font-semibold">조심할 점</dt>
            <dd>{list(p.risks)}</dd>
            <dt className="font-semibold">확인 못 함</dt>
            <dd>{list(p.unknowns)}</dd>
          </dl>
          {p.sources.length > 0 && (
            <div>
              <p className="mb-1 font-semibold">출처</p>
              <ol className="list-decimal pl-5 text-xs">
                {p.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-electric hover:underline">
                      {s.title || s.url} <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="조사 메모 (선택)" value={hint} onChange={setHint} placeholder="예: 화성 장안 공장, 전기 설비 공사 문의" />
        </div>
        <Button variant="outline" className="rounded-none" onClick={run} disabled={pending || profile.status === 'running'}>
          {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {p ? '다시 조사' : '조사'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// ---------- 상세 공정 ----------

const SOURCE_LABEL: Record<string, string> = { admin: '어드민', sbworks: 'SBworks' }

export function ClientSchedule({
  clientId,
  initial,
  log,
  fromQuote,
  locked,
}: {
  clientId: number
  initial: Schedule
  log: ScheduleLog[]
  /** 견적 공종으로 만든 공정 초안 */
  fromQuote: ScheduleStep[]
  locked?: boolean
}) {
  const [steps, setSteps] = useState(initial.steps)
  const [revision, setRevision] = useState(initial.revision)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const change = (next: ScheduleStep[]) => {
    setSteps(next)
    setDirty(true)
    setSaved(false)
  }
  const update = (id: string, patch: Partial<ScheduleStep>) => change(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const move = (i: number, d: number) => {
    const next = [...steps]
    const [x] = next.splice(i, 1)
    next.splice(i + d, 0, x)
    change(next)
  }
  const add = () =>
    change([...steps, { id: `st${Date.now().toString(36)}`, name: '', start: '', end: '', crew: '', status: 'planned', progress: 0, note: '' }])

  const save = () =>
    startTransition(async () => {
      setError('')
      const res = await saveClientSchedule(clientId, steps, revision)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setRevision(res.revision)
      setDirty(false)
      setSaved(true)
    })

  return (
    <section className="bg-background p-5 ring-1 ring-border lg:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold tracking-tight">상세 공정</h2>
        <span className="text-xs text-muted-foreground">
          {initial.updatedAt || revision
            ? `${revision}차 · ${initial.updatedBy || ''}${initial.source ? ` (${SOURCE_LABEL[initial.source] ?? initial.source})` : ''}`
            : '아직 저장 안 함'}{' '}
          · SBworks와 함께 고침
        </span>
      </div>
      {steps.length === 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          공정이 없음.
          {fromQuote.length > 0 && (
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => change(fromQuote)}>
              견적 공종 {fromQuote.length}개로 채우기
            </Button>
          )}
        </div>
      )}
      {steps.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="w-8 py-2" />
                <th className="py-2">공정</th>
                <th className="w-36 py-2">시작</th>
                <th className="w-36 py-2">종료</th>
                <th className="py-2">인원·장비</th>
                <th className="w-24 py-2">상태</th>
                <th className="w-20 py-2">진척 %</th>
                <th className="py-2">메모</th>
                <th className="w-16 py-2" />
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={s.id} className={cn('border-b border-border/60', s.status === 'done' && 'text-muted-foreground')}>
                  <td className="py-1.5 text-center text-xs text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 pr-2">
                    <TextIn value={s.name} onChange={(v) => update(s.id, { name: v })} placeholder="공정 이름" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="date" value={s.start} onChange={(e) => update(s.id, { start: e.target.value })} className="h-8 w-full border border-input bg-background px-1.5" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="date" value={s.end} onChange={(e) => update(s.id, { end: e.target.value })} className="h-8 w-full border border-input bg-background px-1.5" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <TextIn value={s.crew} onChange={(v) => update(s.id, { crew: v })} placeholder="기능공 2, 조공 2" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select
                      value={s.status}
                      onChange={(e) => {
                        const status = e.target.value as ScheduleStep['status']
                        update(s.id, { status, progress: status === 'done' ? 100 : s.progress })
                      }}
                      className="h-8 w-full border border-input bg-background px-1"
                    >
                      {STEP_STATUSES.map((x) => (
                        <option key={x} value={x}>
                          {STEP_STATUS_LABEL[x]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={s.progress}
                      onChange={(e) => update(s.id, { progress: Number(e.target.value) })}
                      className="h-8 w-full border border-input bg-background px-1.5 text-right"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <TextIn value={s.note} onChange={(v) => update(s.id, { note: v })} />
                  </td>
                  <td className="py-1.5">
                    <div className="flex">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 disabled:opacity-30">
                        <ChevronUp className="size-4" />
                      </button>
                      <button type="button" disabled={i === steps.length - 1} onClick={() => move(i, 1)} className="p-1 disabled:opacity-30">
                        <ChevronDown className="size-4" />
                      </button>
                      <button type="button" onClick={() => change(steps.filter((x) => x.id !== s.id))} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="rounded-none" onClick={add} disabled={locked}>
          <Plus /> 공정 추가
        </Button>
        <Button size="sm" className="rounded-none" onClick={save} disabled={pending || !dirty || locked}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} 공정 저장
        </Button>
        {saved && <span className="text-xs text-muted-foreground">저장함 ({revision}차)</span>}
      </div>
      {log.length > 0 && (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer">고친 기록 {log.length}건</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {log.slice(0, 20).map((l) => (
              <li key={l.revision}>
                {l.revision}차 · {l.at.slice(0, 16).replace('T', ' ')} · {l.by} ({SOURCE_LABEL[l.source] ?? l.source}) · {l.summary}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
