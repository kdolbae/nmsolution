'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Ruler, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { newId, won, type QuoteSection } from '@/lib/clients/quote'
import { applyTakeoff, calcTakeoff, emptyTakeoff, lightsFor, normalizeTakeoff, takeoffItems, type Takeoff, type TakeoffRoom } from '@/lib/clients/takeoff'

const NEW = '__new'

/** 견적 화면의 적산 칸: 치수를 넣으면 판넬·스레드로드·등기구 물량을 계산하고, 고른 공종에 줄로 넣는다 */
export function TakeoffPanel({
  value,
  sections,
  onChange,
  onApply,
}: {
  value: Takeoff | undefined
  sections: QuoteSection[]
  onChange: (t: Takeoff) => void
  /** 바뀐 공종 목록 */
  onApply: (sections: QuoteSection[]) => void
}) {
  const t = useMemo(() => normalizeTakeoff(value) ?? emptyTakeoff(), [value])
  const c = useMemo(() => calcTakeoff(t), [t])
  const lines = useMemo(() => takeoffItems(t), [t])
  const [open, setOpen] = useState(!!value)
  const [target, setTarget] = useState(sections[0]?.id ?? NEW)
  const [msg, setMsg] = useState('')

  const set = (patch: Partial<Takeoff>) => {
    onChange({ ...t, ...patch })
    setMsg('')
  }
  const setRoom = (id: string, patch: Partial<TakeoffRoom>) => set({ rooms: t.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  const apply = () => {
    if (!lines.length) return setMsg('넣을 물량이 없음. 치수를 먼저 넣어야 함.')
    const base: QuoteSection =
      sections.find((s) => s.id === target) ?? { id: newId('s'), name: '판넬·천장·전기 자재', desc: '적산 물량', items: [] }
    const { section, updated, added } = applyTakeoff(base, t)
    const exists = sections.some((s) => s.id === base.id)
    onApply(exists ? sections.map((s) => (s.id === base.id ? section : s)) : [...sections, section])
    if (!exists) setTarget(section.id)
    setMsg(`'${section.name || '공종'}'에 반영함: 수량 변경 ${updated}줄, 새 줄 ${added}줄`)
  }

  const num = (label: string, k: keyof Takeoff) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <NumInput value={t[k] as number} onChange={(n) => set({ [k]: n } as Partial<Takeoff>)} />
    </label>
  )
  const text = (label: string, k: keyof Takeoff) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <TextIn value={t[k] as string} onChange={(v) => set({ [k]: v } as Partial<Takeoff>)} />
    </label>
  )

  return (
    <section className="bg-background ring-1 ring-border">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 p-4 text-left">
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Ruler className="size-4" />
        <span className="font-semibold">적산 (판넬 · 스레드로드 · 등기구)</span>
        {value && (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            판넬 {won(c.wallQty + c.ceilQty)}㎡ · 스레드로드 {won(c.rods)}개 · 등기구 {won(c.lights)}개
          </span>
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-border p-5">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">판넬</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {text('규격', 'panelSpec')}
              {num('판넬 폭 (m)', 'panelWidth')}
              {num('단가 (원/㎡)', 'panelPrice')}
              {num('손실률 (%)', 'loss')}
              {num('신규 벽 길이 합계 (m)', 'wallLength')}
              {num('벽 높이 (m)', 'wallHeight')}
              {num('문 개구부 면적 (㎡)', 'openings')}
              <span />
              {num('천장 가로 (m, 구조물 방향)', 'ceilW')}
              {num('천장 세로 (m, 구조물 간격 방향)', 'ceilD')}
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">
              벽 {c.wallArea}㎡ → <b className="text-foreground">{won(c.wallQty)}㎡</b> (약 {c.wallSheets}장) · 천장 {c.ceilArea}㎡ →{' '}
              <b className="text-foreground">{won(c.ceilQty)}㎡</b> (약 {c.ceilSheets}장, 장당 길이 {t.ceilD}m)
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">스레드로드 · 천장 구조물(C형강)</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {num('천정고 (m, 바닥~기존 천장)', 'slabHeight')}
              {num('스레드로드 간격 (m, 구조물 1m당 1개)', 'rodPitch')}
              {num('구조물 간격 최대 (m)', 'beamMax')}
              {num('스레드로드 단가 (원/개)', 'rodPrice')}
              {text('스레드로드 규격', 'rodSpec')}
              {text('구조물 규격', 'beamSpec')}
              {num('구조물 단가 (원/m, 0이면 제외)', 'beamPrice')}
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">
              구조물 {c.beams}열 (간격 {c.beamGap}m, 열당 {t.ceilW}m) × 열당 {c.rodsPerBeam}개 ={' '}
              <b className="text-foreground">스레드로드 {won(c.rods)}개</b>, 길이 {c.rodLength}m · 구조물 {won(c.beamLength)}m
              {c.rods > 0 && c.rodsIfTurned !== c.rods && <> · 구조물 방향을 바꾸면 {won(c.rodsIfTurned)}개 (천장 판넬 길이 {t.ceilW}m)</>}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">등기구</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {text('규격', 'lightSpec')}
              {num('배치 간격 (m)', 'lightPitch')}
              {num('단가 (원/개)', 'lightPrice')}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">실 이름</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">가로 (m)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">세로 (m)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">면적 (㎡)</th>
                    <th className="w-28 px-2 py-2 text-right font-medium" title="비우면 간격으로 계산">등기구 (직접)</th>
                    <th className="w-20 px-2 py-2 text-right font-medium">적용</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {t.rooms.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-1 py-1"><TextIn value={r.name} onChange={(v) => setRoom(r.id, { name: v })} placeholder="예: 사무실 A" /></td>
                      <td className="px-1 py-1"><NumInput value={r.w} onChange={(n) => setRoom(r.id, { w: n })} /></td>
                      <td className="px-1 py-1"><NumInput value={r.d} onChange={(n) => setRoom(r.id, { d: n })} /></td>
                      <td className="px-2 py-1 text-right tabular-nums">{Math.round(r.w * r.d * 10) / 10}</td>
                      <td className="px-1 py-1">
                        <input
                          inputMode="numeric"
                          value={r.lights ?? ''}
                          placeholder="자동"
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '')
                            setRoom(r.id, { lights: v === '' ? null : Number(v) })
                          }}
                          className="h-8 w-full border border-input bg-background px-2 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{lightsFor(r, t.lightPitch)}</td>
                      <td className="px-1 py-1">
                        <Button variant="ghost" size="icon-xs" title="실 삭제" onClick={() => set({ rooms: t.rooms.filter((x) => x.id !== r.id) })}>
                          <X />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums text-muted-foreground">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none"
                onClick={() => set({ rooms: [...t.rooms, { id: newId('r'), name: '', w: 0, d: 0, lights: null }] })}
              >
                <Plus /> 실 추가
              </Button>
              <span>
                바닥 {c.floorArea}㎡ (약 {c.pyeong}평) · <b className="text-foreground">등기구 {won(c.lights)}개</b>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">견적에 넣을 줄</h3>
            {lines.length ? (
              <ul className="flex flex-col gap-1 text-xs tabular-nums">
                {lines.map((l) => (
                  <li key={l.name}>
                    <b>{l.name}</b> {won(l.qty)}
                    {l.unit} × {won(l.price)}원 = {won(l.qty * l.price)}원 <span className="text-muted-foreground">({l.note})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">치수를 넣으면 여기에 줄이 생김.</p>
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
            {msg && <p className="text-xs text-electric">{msg}</p>}
          </div>
        </div>
      )}
    </section>
  )
}
