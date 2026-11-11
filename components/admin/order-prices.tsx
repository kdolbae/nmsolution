'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { deletePoPrice, savePoPrice } from '@/app/actions/orders'
import { emptyPrice, PO_PRICE_CATEGORIES, sameSupplier, type PoPrice, type PoPriceRow } from '@/lib/orders/prices'

const won = (n: number) => (n ? n.toLocaleString('ko-KR') : '')

/** 단가표에서 고를 때 거르는 글자: 품명·규격·구분·비고 어디든 들어 있으면 보임 */
function matches(p: PoPrice, q: string) {
  const t = q.trim().toLowerCase()
  if (!t) return true
  return t.split(/\s+/).every((w) => [p.name, p.spec, p.category, p.note, p.supplier].join(' ').toLowerCase().includes(w))
}

/** 발주서 목록 아래: 발주처 단가표 보기·고치기 */
export function PriceBook({ prices }: { prices: PoPriceRow[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const suppliers = useMemo(() => [...new Set(prices.map((p) => p.supplier).filter(Boolean))], [prices])
  const [supplier, setSupplier] = useState(suppliers[0] ?? '')
  const [q, setQ] = useState('')
  const [edits, setEdits] = useState<Record<number, PoPrice>>({})
  const [draft, setDraft] = useState<PoPrice | null>(null)

  const rows = prices.filter((p) => (!supplier || p.supplier === supplier) && matches(p, q))
  const val = (p: PoPriceRow) => edits[p.id] ?? p
  const edit = (p: PoPriceRow, patch: Partial<PoPrice>) => setEdits((e) => ({ ...e, [p.id]: { ...val(p), ...patch } }))

  const save = (id: number | null, p: PoPrice) =>
    start(async () => {
      await savePoPrice(id, p)
      if (id) setEdits(({ [id]: _, ...rest }) => rest)
      else setDraft(null)
      router.refresh()
    })
  const del = (p: PoPriceRow) => {
    if (!confirm(`단가표에서 '${p.name}' 줄을 지웁니다.`)) return
    start(async () => {
      await deletePoPrice(p.id)
      router.refresh()
    })
  }

  return (
    <section className="mb-8 bg-background p-6 ring-1 ring-border lg:p-8">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight">발주처 단가표</h2>
        <p className="text-sm text-muted-foreground">공급가(VAT 별도). 발주서 품목에서 &lsquo;단가표에서 추가&rsquo;로 골라 넣습니다. 단가 기준 m 는 길이×수량×단가(폭 1,000 판넬은 ㎡ 단가와 같음).</p>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-8 border border-input bg-background px-2 text-sm">
          <option value="">모든 업체</option>
          {suppliers.map((s) => <option key={s}>{s}</option>)}
        </select>
        <TextIn value={q} onChange={setQ} placeholder="찾기 (예: 준불연 50T, U바)" className="w-64" />
        <span className="text-xs text-muted-foreground">{rows.length}줄</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setDraft(emptyPrice(supplier))}>
          <Plus /> 단가 추가
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-24 py-1">업체</th>
              <th className="w-24 py-1">구분</th>
              <th className="py-1">품명</th>
              <th className="py-1">규격</th>
              <th className="w-14 py-1">단위</th>
              <th className="w-16 py-1">기준</th>
              <th className="w-24 py-1">단가</th>
              <th className="w-28 py-1">날짜</th>
              <th className="py-1">출처·비고</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {draft && <PriceRowInputs p={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} onSave={() => save(null, draft)} onCancel={() => setDraft(null)} pending={pending} />}
            {rows.map((p) => (
              <PriceRowInputs
                key={p.id}
                p={val(p)}
                dirty={!!edits[p.id]}
                onChange={(patch) => edit(p, patch)}
                onSave={() => save(p.id, val(p))}
                onDelete={() => del(p)}
                pending={pending}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PriceRowInputs({ p, dirty, onChange, onSave, onDelete, onCancel, pending }: {
  p: PoPrice
  dirty?: boolean
  onChange: (patch: Partial<PoPrice>) => void
  onSave: () => void
  onDelete?: () => void
  onCancel?: () => void
  pending: boolean
}) {
  return (
    <tr className="align-middle">
      <td className="py-1 pr-1"><TextIn value={p.supplier} onChange={(v) => onChange({ supplier: v })} /></td>
      <td className="py-1 pr-1">
        <select value={p.category} onChange={(e) => onChange({ category: e.target.value })} className="h-8 w-full border border-input bg-background px-1 text-sm">
          {[...new Set([...PO_PRICE_CATEGORIES, p.category])].map((c) => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td className="py-1 pr-1"><TextIn value={p.name} onChange={(v) => onChange({ name: v })} /></td>
      <td className="py-1 pr-1"><TextIn value={p.spec} onChange={(v) => onChange({ spec: v })} /></td>
      <td className="py-1 pr-1"><TextIn value={p.unit} onChange={(v) => onChange({ unit: v })} /></td>
      <td className="py-1 pr-1">
        <select value={p.basis} onChange={(e) => onChange({ basis: e.target.value as 'm' | 'ea' })} className="h-8 w-full border border-input bg-background px-1 text-sm">
          <option value="m">m</option>
          <option value="ea">수량</option>
        </select>
      </td>
      <td className="py-1 pr-1"><NumInput value={p.price} onChange={(v) => onChange({ price: v })} /></td>
      <td className="py-1 pr-1"><input type="date" value={p.date} onChange={(e) => onChange({ date: e.target.value })} className="h-8 w-full border border-input bg-background px-1 text-sm" /></td>
      <td className="py-1 pr-1">
        <TextIn value={[p.source, p.note].filter(Boolean).join(' · ')} onChange={(v) => {
          const [source, ...rest] = v.split(' · ')
          onChange({ source, note: rest.join(' · ') })
        }} />
      </td>
      <td className="py-1 whitespace-nowrap">
        {(dirty || onCancel) && (
          <button type="button" className="p-1 text-primary" onClick={onSave} disabled={pending} aria-label="저장">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          </button>
        )}
        {onCancel && <button type="button" className="p-1 text-xs text-muted-foreground" onClick={onCancel}>취소</button>}
        {onDelete && (
          <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={onDelete} disabled={pending} aria-label="삭제">
            <Trash2 className="size-4" />
          </button>
        )}
      </td>
    </tr>
  )
}

/** 발주서 화면: 발주처에 맞는 단가표 줄을 골라 품목으로 넣음 */
export function PricePicker({ prices, supplierName, onPick }: { prices: PoPriceRow[]; supplierName: string; onPick: (p: PoPriceRow) => void }) {
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const [q, setQ] = useState('')
  const mine = prices.filter((p) => sameSupplier(supplierName, p.supplier))
  const list = (all || mine.length === 0 ? prices : mine).filter((p) => matches(p, q))
  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={prices.length === 0}>
        <Plus /> 단가표에서 추가{mine.length ? ` (${mine[0].supplier} ${mine.length}줄)` : ''}
      </Button>
    )
  return (
    <div className="w-full border border-input p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TextIn value={q} onChange={setQ} placeholder="찾기 (예: 준불연 50T, 도어)" className="w-64" />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={all || mine.length === 0} disabled={mine.length === 0} onChange={(e) => setAll(e.target.checked)} />
          {mine.length ? '다른 업체 단가도 보기' : '이 발주처 단가표가 없어 모든 업체를 보여 줌'}
        </label>
        <button type="button" className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>닫기</button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/40">
                <td className="py-1 pr-2 text-xs text-muted-foreground">{p.category}</td>
                <td className="py-1 pr-2">{p.name}{p.spec && <span className="text-xs text-muted-foreground"> · {p.spec}</span>}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{won(p.price)}<span className="text-xs text-muted-foreground"> /{p.basis === 'm' ? 'm' : p.unit}</span></td>
                <td className="py-1 pr-2 text-xs text-muted-foreground">{p.date} {all && p.supplier}</td>
                <td className="py-1 text-right">
                  <button type="button" className="px-2 py-0.5 text-xs text-primary ring-1 ring-primary/40 hover:bg-primary/10" onClick={() => onPick(p)}>추가</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="py-4 text-center text-xs text-muted-foreground">맞는 단가가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
