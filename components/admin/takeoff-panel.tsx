'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, Copy, FileSearch, Loader2, Pencil, Plus, Ruler, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { cn } from '@/lib/utils'
import { deleteTakeoffTemplate, saveTakeoffTemplate } from '@/app/actions/takeoff'
import { ITEM_KINDS, newId, won, type ItemKind, type QuoteSection } from '@/lib/clients/quote'
import {
  applyTakeoff,
  blockFrom,
  blocksFromDrawing,
  calcBlock,
  fmt,
  normalizeTakeoff,
  takeoffItems,
  templateFrom,
  type DrawingResult,
  type Takeoff,
  type TakeoffBlock,
  type TakeoffLine,
  type TakeoffRounding,
  type TakeoffTemplate,
  type TakeoffVar,
} from '@/lib/clients/takeoff'

const NEW = '__new'
const ROUNDING: [TakeoffRounding, string][] = [
  ['ceil', '올림'],
  ['round', '반올림'],
  ['none', '소수 둘째'],
]

/** 이미지가 크면 긴 변 2400px JPEG 로 줄인다 (서버 본문 한도 4MB) */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.size < 1.5 * 1024 * 1024) return file
  const img = await createImageBitmap(file)
  const k = Math.min(1, 2400 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k)
  c.height = Math.round(img.height * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return new Promise((ok) => c.toBlob((b) => ok(b ?? file), 'image/jpeg', 0.88))
}

/**
 * 견적 화면의 적산 칸. 템플릿으로 블록을 만들고 측정값을 넣으면 물량이 나오고, 고른 공종에 견적 줄로 넣는다.
 * 도면 이미지·PDF를 올리면 Claude가 측정값을 읽어 블록을 채운다.
 */
export function TakeoffPanel({
  value,
  sections,
  templates: initialTemplates,
  onChange,
  onApply,
}: {
  value: Takeoff | undefined
  sections: QuoteSection[]
  templates: TakeoffTemplate[]
  onChange: (t: Takeoff) => void
  /** 바뀐 공종 목록 */
  onApply: (sections: QuoteSection[]) => void
}) {
  const t = useMemo(() => normalizeTakeoff(value), [value])
  const lines = useMemo(() => takeoffItems(t), [t])
  const [templates, setTemplates] = useState(initialTemplates)
  const [open, setOpen] = useState(t.blocks.length > 0)
  const [pick, setPick] = useState(initialTemplates[0]?.id ?? '')
  const [target, setTarget] = useState(sections[0]?.id ?? NEW)
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState<string[]>([])
  const [hint, setHint] = useState('')
  const [reading, setReading] = useState(false)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const setBlocks = (blocks: TakeoffBlock[]) => {
    onChange({ blocks })
    setMsg('')
  }
  const setBlock = (id: string, patch: Partial<TakeoffBlock>) => setBlocks(t.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const addBlock = () => {
    const tpl = templates.find((x) => x.id === pick)
    if (tpl) setBlocks([...t.blocks, blockFrom(tpl)])
  }

  const readDrawing = async (file: File) => {
    setReading(true)
    setMsg('')
    setNotes([])
    try {
      const body = new FormData()
      body.append('file', await shrink(file), file.name)
      body.append('hint', hint)
      const res = await fetch('/api/admin/takeoff/read', { method: 'POST', body })
      const data = (await res.json().catch(() => ({ error: '응답을 읽지 못했습니다.' }))) as DrawingResult & { error?: string }
      if (!res.ok || data.error) return setMsg(data.error || '도면을 읽지 못했습니다.')
      const added = blocksFromDrawing(data, templates)
      setBlocks([...t.blocks, ...added])
      setNotes(data.notes ?? [])
      setMsg(`도면에서 블록 ${added.length}개를 채움. 값과 근거를 확인해야 함.`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '도면을 읽지 못했습니다.')
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveAsTemplate = (b: TakeoffBlock) => {
    const own = templates.find((x) => x.id === b.template && !x.builtin)
    const name = window.prompt('템플릿 이름', own?.name ?? b.name)
    if (!name?.trim()) return
    const desc = window.prompt('언제 쓰는지 한 줄 (도면 읽기에도 쓰임)', own?.desc ?? '') ?? ''
    const same = templates.find((x) => x.name === name.trim() && !x.builtin)
    const tpl = { ...templateFrom(b, same?.id ?? own?.id ?? newId('tpl')), name: name.trim(), desc: desc.trim() }
    startTransition(async () => {
      const res = await saveTakeoffTemplate(tpl)
      if (!res.ok) return setMsg(res.error)
      setTemplates(res.templates)
      setBlock(b.id, { template: tpl.id })
      setMsg(`템플릿 '${tpl.name}' 저장함`)
    })
  }

  const removeTemplate = () => {
    const tpl = templates.find((x) => x.id === pick)
    if (!tpl || tpl.builtin || !confirm(`템플릿 '${tpl.name}'을 지울까요?`)) return
    startTransition(async () => {
      const res = await deleteTakeoffTemplate(tpl.id)
      setTemplates(res.templates)
      setPick(res.templates[0]?.id ?? '')
    })
  }

  const apply = () => {
    if (!lines.length) return setMsg('넣을 물량이 없음. 측정값을 먼저 넣어야 함.')
    const base: QuoteSection = sections.find((s) => s.id === target) ?? { id: newId('s'), name: '적산 자재', desc: '', items: [] }
    const { section, updated, added } = applyTakeoff(base, t)
    const exists = sections.some((s) => s.id === base.id)
    onApply(exists ? sections.map((s) => (s.id === base.id ? section : s)) : [...sections, section])
    if (!exists) setTarget(section.id)
    setMsg(`'${section.name || '공종'}'에 반영함: 수량 변경 ${updated}줄, 새 줄 ${added}줄`)
  }

  const picked = templates.find((x) => x.id === pick)

  return (
    <section className="bg-background ring-1 ring-border">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 p-4 text-left">
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Ruler className="size-4" />
        <span className="font-semibold">적산</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          블록 {t.blocks.length}개 · 견적 줄 {lines.length}개 · {won(lines.reduce((a, l) => a + Math.round(l.qty * l.price), 0))}원
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-border p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">템플릿으로 블록 추가</p>
              <div className="flex flex-wrap gap-2">
                <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-8 min-w-48 flex-1 border border-input bg-background px-2 text-sm">
                  {templates.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.builtin ? '' : ' (저장한 템플릿)'}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" className="rounded-none" onClick={addBlock}>
                  <Plus /> 추가
                </Button>
                {picked && !picked.builtin && (
                  <Button size="sm" variant="ghost" className="rounded-none" onClick={removeTemplate} disabled={pending} title="저장한 템플릿 삭제">
                    <Trash2 />
                  </Button>
                )}
              </div>
              {picked?.desc && <p className="text-xs text-muted-foreground">{picked.desc}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">도면 읽기 (이미지·PDF)</p>
              <div className="flex flex-wrap gap-2">
                <TextIn value={hint} onChange={setHint} placeholder="메모 (예: 빨간선만 신규 벽, 천장고 6m)" className="min-w-48 flex-1" />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && readDrawing(e.target.files[0])}
                />
                <Button size="sm" className="rounded-none" onClick={() => fileRef.current?.click()} disabled={reading}>
                  {reading ? <Loader2 className="animate-spin" /> : <FileSearch />} {reading ? '읽는 중' : '도면 올리기'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">템플릿을 골라 측정값을 채운 블록이 추가됨. 값은 꼭 확인해야 함.</p>
            </div>
          </div>

          {notes.length > 0 && (
            <ul className="list-disc border-l-2 border-electric bg-secondary py-2 pl-8 pr-3 text-xs">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}

          {t.blocks.map((b) => (
            <BlockCard
              key={b.id}
              block={b}
              onChange={(patch) => setBlock(b.id, patch)}
              onRemove={() => setBlocks(t.blocks.filter((x) => x.id !== b.id))}
              onCopy={() => {
                const i = t.blocks.findIndex((x) => x.id === b.id)
                const copy = { ...b, id: newId('b'), name: `${b.name} (복사)`, lines: b.lines.map((l) => ({ ...l, id: newId('t') })) }
                setBlocks([...t.blocks.slice(0, i + 1), copy, ...t.blocks.slice(i + 1)])
              }}
              onSaveTemplate={() => saveAsTemplate(b)}
              saving={pending}
            />
          ))}

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">견적에 넣을 줄</h3>
            {lines.length ? (
              <ul className="flex flex-col gap-1 text-xs tabular-nums">
                {lines.map((l) => (
                  <li key={l.id}>
                    <b>{l.name}</b> {l.spec && <span className="text-muted-foreground">{l.spec} </span>}
                    {fmt(l.qty)}
                    {l.unit} × {won(l.price)}원 = {won(Math.round(l.qty * l.price))}원 <span className="text-muted-foreground">({l.note})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">블록을 추가하고 측정값을 넣으면 여기에 줄이 생김.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 border border-input bg-background px-2 text-sm">
                {sections.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    공종 {i + 1}. {s.name || '(이름 없음)'}
                  </option>
                ))}
                <option value={NEW}>새 공종으로 추가</option>
              </select>
              <Button className="rounded-none" size="sm" onClick={apply}>
                견적에 반영
              </Button>
              <span className="text-xs text-muted-foreground">품명이 같은 줄은 수량·단가·근거만 바꾸고, 없는 줄은 끝에 붙임.</span>
            </div>
          </div>
          {msg && <p className="text-xs text-electric">{msg}</p>}
        </div>
      )}
    </section>
  )
}

function BlockCard({
  block: b,
  onChange,
  onRemove,
  onCopy,
  onSaveTemplate,
  saving,
}: {
  block: TakeoffBlock
  onChange: (patch: Partial<TakeoffBlock>) => void
  onRemove: () => void
  onCopy: () => void
  onSaveTemplate: () => void
  saving: boolean
}) {
  const [edit, setEdit] = useState(false)
  const r = useMemo(() => calcBlock(b), [b])
  const setVar = (i: number, patch: Partial<TakeoffVar>) => onChange({ vars: b.vars.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const setLine = (id: string, patch: Partial<TakeoffLine>) => onChange({ lines: b.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  const inputs = b.vars.filter((x) => !x.expr)
  const derived = b.vars.filter((x) => x.expr)
  const sel = 'h-8 w-full border border-input bg-background px-1 text-sm'

  return (
    <div className="ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary p-2">
        <TextIn value={b.name} onChange={(v) => onChange({ name: v })} className="max-w-72 font-semibold" />
        <span className="ml-auto" />
        <Button size="sm" variant={edit ? 'default' : 'ghost'} className="rounded-none" onClick={() => setEdit(!edit)} title="측정값·계산식 편집">
          <Pencil /> 식 편집
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onCopy} title="블록 복제">
          <Copy />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onSaveTemplate} disabled={saving} title="이 블록을 템플릿으로 저장">
          <Save />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => confirm(`'${b.name}' 블록을 지울까요?`) && onRemove()} title="블록 삭제">
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {b.memo && <p className="text-xs text-muted-foreground">도면 근거: {b.memo}</p>}

        {edit ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="w-28 px-1 py-1 text-left font-medium">이름 (식에서 씀)</th>
                  <th className="px-1 py-1 text-left font-medium">설명</th>
                  <th className="w-20 px-1 py-1 text-left font-medium">단위</th>
                  <th className="w-28 px-1 py-1 text-right font-medium">입력값</th>
                  <th className="px-1 py-1 text-left font-medium">계산식 (있으면 입력값 대신)</th>
                  <th className="w-24 px-1 py-1 text-right font-medium">결과</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {b.vars.map((x, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-1 py-1"><TextIn value={x.key} onChange={(v) => setVar(i, { key: v.replace(/\s/g, '') })} className="font-mono" /></td>
                    <td className="px-1 py-1"><TextIn value={x.label} onChange={(v) => setVar(i, { label: v })} /></td>
                    <td className="px-1 py-1"><TextIn value={x.unit} onChange={(v) => setVar(i, { unit: v })} /></td>
                    <td className="px-1 py-1">{!x.expr && <NumInput value={x.value} onChange={(n) => setVar(i, { value: n })} />}</td>
                    <td className="px-1 py-1">
                      <TextIn
                        value={x.expr ?? ''}
                        onChange={(v) => setVar(i, { expr: v || undefined })}
                        placeholder="비우면 입력값 사용"
                        className={cn('font-mono', r.varErrors[x.key] && 'border-destructive')}
                      />
                    </td>
                    <td className="px-1 py-1 text-right tabular-nums" title={r.varErrors[x.key]}>
                      {r.varErrors[x.key] ? <span className="text-destructive">오류</span> : fmt(r.values[x.key] ?? 0)}
                    </td>
                    <td className="px-1 py-1">
                      <Button variant="ghost" size="icon-xs" title="측정값 삭제" onClick={() => onChange({ vars: b.vars.filter((_, j) => j !== i) })}>
                        <X />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 rounded-none"
              onClick={() => onChange({ vars: [...b.vars, { key: `v${b.vars.length + 1}`, label: '', unit: '', value: 0 }] })}
            >
              <Plus /> 측정값 추가
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              계산식: + − × ÷ ^ ( ), ceil(올림) floor(내림) round(반올림) max min abs sqrt, if(조건, 참, 거짓). 규격·근거 글에는 {'{식}'} 을 넣으면 값으로 바뀜.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {inputs.map((x) => (
                <label key={x.key} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {x.label || x.key}
                  {x.unit && ` (${x.unit})`}
                  <NumInput value={x.value} onChange={(n) => setVar(b.vars.indexOf(x), { value: n })} />
                </label>
              ))}
            </div>
            {derived.length > 0 && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {derived.map((x, i) => (
                  <span key={x.key}>
                    {i > 0 && ' · '}
                    {x.label || x.key} <b className="text-foreground">{fmt(r.values[x.key] ?? 0)}</b>
                    {x.unit}
                  </span>
                ))}
              </p>
            )}
          </>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-secondary text-xs text-muted-foreground">
              <tr>
                {edit && <th className="w-24 px-1 py-1 text-left font-medium">구분</th>}
                <th className="px-1 py-1 text-left font-medium">품명</th>
                <th className="px-1 py-1 text-left font-medium">규격</th>
                {edit && <th className="px-1 py-1 text-left font-medium">수량식</th>}
                {edit && <th className="w-24 px-1 py-1 text-left font-medium">끝수</th>}
                <th className="w-20 px-1 py-1 text-right font-medium">수량</th>
                <th className="w-16 px-1 py-1 text-left font-medium">단위</th>
                <th className="w-28 px-1 py-1 text-right font-medium">단가</th>
                {!edit && <th className="w-28 px-1 py-1 text-right font-medium">금액</th>}
                <th className="px-1 py-1 text-left font-medium">근거</th>
                {edit && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {b.lines.map((l, i) => {
                const c = r.lines[i]
                return (
                  <tr key={l.id} className="border-t border-border">
                    {edit && (
                      <td className="px-1 py-1">
                        <select value={l.kind} onChange={(e) => setLine(l.id, { kind: e.target.value as ItemKind })} className={sel}>
                          {ITEM_KINDS.map((k) => (
                            <option key={k}>{k}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="px-1 py-1">{edit ? <TextIn value={l.name} onChange={(v) => setLine(l.id, { name: v })} /> : l.name}</td>
                    <td className="px-1 py-1">{edit ? <TextIn value={l.spec} onChange={(v) => setLine(l.id, { spec: v })} /> : c.spec}</td>
                    {edit && (
                      <td className="px-1 py-1">
                        <TextIn value={l.qty} onChange={(v) => setLine(l.id, { qty: v })} className={cn('font-mono', c.error && 'border-destructive')} />
                      </td>
                    )}
                    {edit && (
                      <td className="px-1 py-1">
                        <select value={l.rounding} onChange={(e) => setLine(l.id, { rounding: e.target.value as TakeoffRounding })} className={sel}>
                          {ROUNDING.map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="px-1 py-1 text-right tabular-nums" title={c.error}>
                      {c.error ? <span className="text-destructive">{c.error}</span> : fmt(c.qty)}
                    </td>
                    <td className="px-1 py-1">{edit ? <TextIn value={l.unit} onChange={(v) => setLine(l.id, { unit: v })} /> : l.unit}</td>
                    <td className="px-1 py-1">
                      <NumInput value={l.price} onChange={(n) => setLine(l.id, { price: n })} />
                    </td>
                    {!edit && <td className="px-1 py-1 text-right tabular-nums">{won(Math.round(c.qty * l.price))}</td>}
                    <td className="px-1 py-1 text-xs text-muted-foreground">
                      {edit ? <TextIn value={l.note} onChange={(v) => setLine(l.id, { note: v })} /> : c.note}
                    </td>
                    {edit && (
                      <td className="px-1 py-1">
                        <Button variant="ghost" size="icon-xs" title="줄 삭제" onClick={() => onChange({ lines: b.lines.filter((x) => x.id !== l.id) })}>
                          <X />
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {edit && (
          <div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              onClick={() =>
                onChange({
                  lines: [...b.lines, { id: newId('t'), kind: '재료비', name: '', spec: '', unit: '식', qty: '', rounding: 'ceil', price: 0, note: '' }],
                })
              }
            >
              <Plus /> 줄 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
