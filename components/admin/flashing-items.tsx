'use client'

import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { emptyPoItem, itemAmount, itemMeters, poItemId, type PoItem } from '@/lib/orders/doc'
import { FL_COLORS, FL_MATERIALS, FL_PRESETS, FL_THICKNESS, emptyFlashing, flSvg, flWidth, type Flashing, type FlSeg } from '@/lib/orders/flashing'

const fmt = (n: number, d = 0) => (n ? n.toLocaleString('ko-KR', { maximumFractionDigits: d }) : '')
const sel = 'h-8 w-full border border-input bg-background px-2 text-sm'

/** 후레싱 발주서 품목 편집: 종류(제안 목록) 선택, 재질·두께·색상, 절곡 구간(치수·각도·방향), 길이·수량·단가 */
export function FlashingItems({ items, onChange }: { items: PoItem[]; onChange: (items: PoItem[]) => void }) {
  const setAt = (i: number, patch: Partial<PoItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const setFl = (i: number, patch: Partial<Flashing>) => setAt(i, { fl: { ...(items[i].fl ?? emptyFlashing()), ...patch } })
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <datalist id="fl-materials">{FL_MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>
      <datalist id="fl-colors">{FL_COLORS.map((m) => <option key={m} value={m} />)}</datalist>
      {items.map((it, i) => {
        const fl = it.fl ?? emptyFlashing()
        const segs = fl.segs
        const setSeg = (k: number, patch: Partial<FlSeg>) => setFl(i, { segs: segs.map((g, j) => (j === k ? { ...g, ...patch } : g)) })
        return (
          <div key={it.id} className="border p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">No.{i + 1}</span>
              <select
                value=""
                onChange={(e) => {
                  const p = FL_PRESETS.find((x) => x.kind === e.target.value)
                  if (!p) return
                  setAt(i, { name: it.name || p.kind, fl: { kind: p.kind, ...structuredClone(p.fl) } })
                }}
                className="h-8 border border-input bg-background px-2 text-sm"
              >
                <option value="">종류 선택 (제안 목록)…</option>
                {FL_PRESETS.map((p) => (
                  <option key={p.kind} value={p.kind}>{p.kind} — {p.hint}</option>
                ))}
              </select>
              <span className="ml-auto" />
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => move(i, -1)} aria-label="위로"><ChevronUp className="size-4" /></button>
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => move(i, 1)} aria-label="아래로"><ChevronDown className="size-4" /></button>
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => onChange([...items.slice(0, i + 1), { ...structuredClone(it), id: poItemId() }, ...items.slice(i + 1)])} aria-label="복사"><Copy className="size-4" /></button>
              <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="삭제"><Trash2 className="size-4" /></button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <L label="품명"><TextIn value={it.name} onChange={(v) => setAt(i, { name: v })} placeholder={fl.kind} /></L>
                  <L label="종류"><TextIn value={fl.kind} onChange={(v) => setFl(i, { kind: v })} /></L>
                  <L label="재질"><input list="fl-materials" value={fl.material} onChange={(e) => setFl(i, { material: e.target.value })} className={sel} /></L>
                  <L label="두께 (t)">
                    <select value={String(fl.thickness)} onChange={(e) => setFl(i, { thickness: Number(e.target.value) })} className={sel}>
                      {[...new Set([...FL_THICKNESS, fl.thickness])].sort((a, b) => a - b).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </L>
                  <L label="색상"><input list="fl-colors" value={fl.color} onChange={(e) => setFl(i, { color: e.target.value })} className={sel} /></L>
                  <L label="1장 길이 (mm)"><NumInput value={it.lengthMm} onChange={(v) => setAt(i, { lengthMm: v })} /></L>
                  <L label="수량"><NumInput value={it.qty} onChange={(v) => setAt(i, { qty: v })} /></L>
                  <L label="단위"><TextIn value={it.unit} onChange={(v) => setAt(i, { unit: v })} /></L>
                  <L label="단가 (원/m)"><NumInput value={it.price} onChange={(v) => setAt(i, { price: v, basis: 'm' })} /></L>
                  <div className="col-span-2 sm:col-span-3"><L label="비고"><TextIn value={it.note} onChange={(v) => setAt(i, { note: v })} /></L></div>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    절곡 구간 (첫 구간에서 오른쪽으로 출발, 각도 = 두 면 사이 안쪽 각, 90 = 직각)
                    <b className="ml-auto text-foreground">전개폭 {fmt(flWidth(fl)) || 0} mm</b>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr><th className="w-10">구간</th><th>치수 (mm)</th><th>각도 (°)</th><th>벤딩 방향</th><th className="w-8" /></tr>
                    </thead>
                    <tbody>
                      {segs.map((g, k) => (
                        <tr key={k}>
                          <td className="py-0.5 text-xs text-muted-foreground">{k + 1}</td>
                          <td className="py-0.5 pr-1"><NumInput value={g.len} onChange={(v) => setSeg(k, { len: v })} /></td>
                          <td className="py-0.5 pr-1">{k === 0 ? <span className="text-xs text-muted-foreground">시작</span> : <NumInput value={g.angle} onChange={(v) => setSeg(k, { angle: v })} />}</td>
                          <td className="py-0.5 pr-1">
                            {k === 0 ? null : (
                              <select value={g.dir} onChange={(e) => setSeg(k, { dir: e.target.value as FlSeg['dir'] })} className={sel}>
                                <option value="down">↓ 아래로 (시계)</option>
                                <option value="up">↑ 위로 (반시계)</option>
                              </select>
                            )}
                          </td>
                          <td>
                            <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => setFl(i, { segs: segs.filter((_, j) => j !== k) })} aria-label="구간 삭제"><Trash2 className="size-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button size="xs" variant="outline" className="mt-1" onClick={() => setFl(i, { segs: [...segs, { len: 50, angle: 90, dir: 'down' }] })}>
                    <Plus /> 구간 추가
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  총길이 {fmt(itemMeters(it), 2) || 0} m{itemAmount(it) ? ` · 금액 ${fmt(itemAmount(it))}원` : ''}
                </p>
              </div>
              <div className="border bg-white" dangerouslySetInnerHTML={{ __html: flSvg(fl, 300, 220, { font: 13 }) }} />
            </div>
          </div>
        )
      })}
      <Button size="sm" variant="outline" className="self-start" onClick={() => onChange([...items, { ...emptyPoItem(), fl: emptyFlashing() }])}>
        <Plus /> 후레싱 추가
      </Button>
    </div>
  )
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
