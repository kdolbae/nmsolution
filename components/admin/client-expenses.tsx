'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { removeClientExpense, saveClientExpense } from '@/app/actions/expenses'
import {
  EXPENSE_CATEGORIES,
  emptyExpense,
  emptyExpenseItem,
  fmtWon,
  itemAmount,
  itemsSupply,
  type Expense,
  type ExpenseInput,
  type ExpenseItem,
} from '@/lib/expenses/shared'
import { cn } from '@/lib/utils'

/**
 * 지출(원가) 칸 (전 업체 공통, 프로젝트 단계 '발주·지출'). 어드민 전용, 고객 자료에 안 나감.
 * 거래명세서·영수증 한 장 = 한 줄. 품목을 적으면 공급가는 품목 합계로 맞춘다. 위에 계약 공급가 대비 지출 합계.
 */
export function ClientExpenses({ clientId, contractSupply, initial }: { clientId: number; contractSupply: number; initial: Expense[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<{ id: number | null; value: ExpenseInput } | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  const supply = initial.reduce((a, e) => a + e.supply, 0)
  const unpaid = initial.filter((e) => !e.paid).reduce((a, e) => a + e.total, 0)
  const left = contractSupply - supply
  const pct = contractSupply ? Math.round((supply / contractSupply) * 1000) / 10 : 0

  const save = () => {
    if (!editing) return
    startTransition(async () => {
      const r = await saveClientExpense(clientId, editing.id, editing.value)
      setMessage(r.ok ? '지출을 저장했습니다.' : r.error)
      if (r.ok) setEditing(null)
      router.refresh()
    })
  }
  const remove = (e: Expense) => {
    if (!confirm(`${e.date} ${e.supplier} ${fmtWon(e.total)}원 지출 기록을 지웁니다.`)) return
    startTransition(async () => {
      const r = await removeClientExpense(clientId, e.id)
      setMessage(r.ok ? '지웠습니다.' : r.error)
      router.refresh()
    })
  }
  const togglePaid = (e: Expense) =>
    startTransition(async () => {
      const { id, total: _t, createdAt: _c, updatedAt: _u, updatedBy: _b, ...value } = e
      void _t
      void _c
      void _u
      void _b
      const r = await saveClientExpense(clientId, id, { ...value, paid: !e.paid, paidAt: !e.paid ? new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10) : '' })
      if (!r.ok) setMessage(r.error)
      router.refresh()
    })
  const startEdit = (e: Expense) => {
    const { id, total: _t, createdAt: _c, updatedAt: _u, updatedBy: _b, ...value } = e
    void _t
    void _c
    void _u
    void _b
    setEditing({ id, value })
  }

  return (
    <section id="expenses" className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Receipt className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-bold tracking-tight">지출 (원가)</h2>
        <span className="text-xs text-muted-foreground">어드민 전용 · 고객 자료에 안 나감 · {initial.length}건</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="rounded-none" onClick={() => setEditing({ id: null, value: emptyExpense() })} disabled={pending || !!editing}>
            <Plus /> 지출 추가
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border text-sm sm:grid-cols-4">
        <Stat label="계약 공급가 (VAT 별도)" value={contractSupply ? fmtWon(contractSupply) : '-'} />
        <Stat label={`지출 공급가 합계${contractSupply ? ` · ${pct}%` : ''}`} value={fmtWon(supply)} />
        <Stat label="남는 금액 (계약 − 지출)" value={contractSupply ? fmtWon(left) : '-'} tone={left < 0 ? 'bad' : 'good'} />
        <Stat label="미지급 (VAT 포함)" value={fmtWon(unpaid)} tone={unpaid ? 'warn' : undefined} />
      </div>

      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {editing && (
        <ExpenseEditor
          value={editing.value}
          onChange={(v) => setEditing({ ...editing, value: v })}
          onSave={save}
          onCancel={() => setEditing(null)}
          pending={pending}
          isNew={editing.id === null}
        />
      )}

      {initial.length === 0 && !editing && <p className="text-sm text-muted-foreground">거래명세서·영수증이 들어오면 한 건씩 적습니다. 공급가·부가세·지급 여부까지.</p>}
      {initial.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="py-1.5 pr-2 font-medium">일자</th>
                <th className="py-1.5 pr-2 font-medium">구분</th>
                <th className="py-1.5 pr-2 font-medium">거래처</th>
                <th className="py-1.5 pr-2 font-medium">내용</th>
                <th className="py-1.5 pr-2 text-right font-medium">공급가</th>
                <th className="py-1.5 pr-2 text-right font-medium">부가세</th>
                <th className="py-1.5 pr-2 text-right font-medium">합계</th>
                <th className="py-1.5 pr-2 font-medium">지급</th>
                <th className="w-20 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {initial.map((e) => (
                <Row key={e.id} e={e} open={open === e.id} onOpen={() => setOpen(open === e.id ? null : e.id)} onEdit={() => startEdit(e)} onRemove={() => remove(e)} onPaid={() => togglePaid(e)} pending={pending} />
              ))}
            </tbody>
            <tfoot className="text-sm font-semibold">
              <tr className="border-t border-border">
                <td colSpan={4} className="py-1.5 pr-2">합계</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtWon(supply)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtWon(initial.reduce((a, e) => a + e.vat, 0))}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtWon(initial.reduce((a, e) => a + e.total, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="bg-background p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn('text-base font-bold tabular-nums', tone === 'bad' && 'text-destructive', tone === 'warn' && 'text-amber-700')}>{value}</div>
    </div>
  )
}

function Row({ e, open, onOpen, onEdit, onRemove, onPaid, pending }: { e: Expense; open: boolean; onOpen: () => void; onEdit: () => void; onRemove: () => void; onPaid: () => void; pending: boolean }) {
  return (
    <>
      <tr className="border-b border-border/60 align-top">
        <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums">{e.date}</td>
        <td className="whitespace-nowrap py-1.5 pr-2">{e.category}</td>
        <td className="py-1.5 pr-2">{e.supplier}</td>
        <td className="py-1.5 pr-2">
          <button type="button" className="text-left hover:underline" onClick={onOpen} title={e.items.length ? '품목 보기' : undefined}>
            {e.title || '-'}
            {e.items.length > 0 && <span className="ml-1 text-xs text-muted-foreground">품목 {e.items.length}</span>}
          </button>
          {e.doc && <div className="text-[11px] text-muted-foreground">{e.doc}</div>}
        </td>
        <td className="py-1.5 pr-2 text-right tabular-nums">{fmtWon(e.supply)}</td>
        <td className="py-1.5 pr-2 text-right tabular-nums">{fmtWon(e.vat)}</td>
        <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{fmtWon(e.total)}</td>
        <td className="whitespace-nowrap py-1.5 pr-2">
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={e.paid} onChange={onPaid} disabled={pending} /> {e.paid ? `지급 ${e.paidAt}` : '미지급'}
          </label>
        </td>
        <td className="whitespace-nowrap py-1 text-right">
          <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={onEdit} title="편집"><Pencil className="size-3.5" /></button>
          <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={onRemove} title="삭제"><Trash2 className="size-3.5" /></button>
        </td>
      </tr>
      {open && (e.items.length > 0 || e.note) && (
        <tr className="border-b border-border/60 bg-muted/30">
          <td colSpan={9} className="px-2 py-2">
            {e.items.length > 0 && (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="py-1 pr-2 text-left font-medium">품목</th><th className="py-1 pr-2 text-left font-medium">규격</th><th className="py-1 pr-2 text-right font-medium">수량</th><th className="py-1 pr-2 text-left font-medium">단위</th><th className="py-1 pr-2 text-right font-medium">단가</th><th className="py-1 pr-2 text-right font-medium">금액</th></tr>
                </thead>
                <tbody>
                  {e.items.map((it) => (
                    <tr key={it.id} className="border-t border-border/40">
                      <td className="py-0.5 pr-2">{it.name}</td><td className="py-0.5 pr-2 text-muted-foreground">{it.spec}</td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">{it.qty.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}</td><td className="py-0.5 pr-2">{it.unit}</td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">{fmtWon(it.price)}</td><td className="py-0.5 pr-2 text-right tabular-nums">{fmtWon(itemAmount(it))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {e.note && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{e.note}</p>}
          </td>
        </tr>
      )}
    </>
  )
}

function ExpenseEditor({ value, onChange, onSave, onCancel, pending, isNew }: { value: ExpenseInput; onChange: (v: ExpenseInput) => void; onSave: () => void; onCancel: () => void; pending: boolean; isNew: boolean }) {
  const set = <K extends keyof ExpenseInput>(k: K, v: ExpenseInput[K]) => onChange({ ...value, [k]: v })
  const setItems = (items: ExpenseItem[]) => onChange({ ...value, items, supply: items.length ? itemsSupply(items) : value.supply, vat: Math.round((items.length ? itemsSupply(items) : value.supply) * 0.1) })
  const updateItem = (id: string, patch: Partial<ExpenseItem>) => setItems(value.items.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const hasItems = value.items.length > 0
  const total = value.supply + value.vat
  const field = 'flex flex-col gap-1'
  const lbl = 'text-xs text-muted-foreground'
  return (
    <div className="flex flex-col gap-3 border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {isNew ? '새 지출' : '지출 편집'}
        <span className="text-xs font-normal text-muted-foreground">거래명세서·영수증 한 장 기준. 품목을 적으면 공급가는 품목 합계로 맞춰집니다.</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <label className={field}><span className={lbl}>일자</span><input type="date" value={value.date} onChange={(e) => set('date', e.target.value)} className="h-8 border border-input bg-background px-2 text-sm" /></label>
        <label className={field}><span className={lbl}>구분</span>
          <select value={value.category} onChange={(e) => set('category', e.target.value as ExpenseInput['category'])} className="h-8 border border-input bg-background px-2 text-sm">
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className={field}><span className={lbl}>거래처</span><TextIn value={value.supplier} onChange={(v) => set('supplier', v)} placeholder="새롬판넬, 철물점 …" /></label>
        <label className={cn(field, 'col-span-2 sm:col-span-3 lg:col-span-3')}><span className={lbl}>내용</span><TextIn value={value.title} onChange={(v) => set('title', v)} placeholder="판넬·후레싱 (거래명세서 11/4)" /></label>
        <label className={field}><span className={lbl}>공급가 (VAT 별도){hasItems && ' · 품목 합계'}</span><NumInput value={value.supply} onChange={(n) => onChange({ ...value, supply: n, vat: Math.round(n * 0.1) })} className={cn(hasItems && 'opacity-60')} /></label>
        <label className={field}><span className={lbl}>부가세</span><NumInput value={value.vat} onChange={(n) => set('vat', n)} /></label>
        <div className={field}><span className={lbl}>합계</span><div className="flex h-8 items-center justify-end px-2 text-sm font-semibold tabular-nums">{fmtWon(total)}</div></div>
        <label className={field}><span className={lbl}>지급</span>
          <span className="flex h-8 items-center gap-2 text-sm">
            <input type="checkbox" checked={value.paid} onChange={(e) => onChange({ ...value, paid: e.target.checked, paidAt: e.target.checked ? value.paidAt || value.date : '' })} />
            {value.paid ? <input type="date" value={value.paidAt} onChange={(e) => set('paidAt', e.target.value)} className="h-8 border border-input bg-background px-2 text-sm" /> : '미지급'}
          </span>
        </label>
        <label className={cn(field, 'col-span-2')}><span className={lbl}>근거 서류</span><TextIn value={value.doc} onChange={(v) => set('doc', v)} placeholder="거래명세서 파일명·영수증 번호" /></label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border text-left">
              <th className="py-1 pr-2 font-medium">품목 (선택)</th><th className="py-1 pr-2 font-medium">규격</th>
              <th className="w-20 py-1 pr-2 text-right font-medium">수량</th><th className="w-16 py-1 pr-2 font-medium">단위</th>
              <th className="w-28 py-1 pr-2 text-right font-medium">단가</th><th className="w-28 py-1 pr-2 text-right font-medium">금액</th><th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {value.items.map((it) => (
              <tr key={it.id} className="border-b border-border/60">
                <td className="py-0.5 pr-2"><TextIn value={it.name} onChange={(v) => updateItem(it.id, { name: v })} /></td>
                <td className="py-0.5 pr-2"><TextIn value={it.spec} onChange={(v) => updateItem(it.id, { spec: v })} /></td>
                <td className="py-0.5 pr-2"><NumInput value={it.qty} onChange={(n) => updateItem(it.id, { qty: n })} /></td>
                <td className="py-0.5 pr-2"><TextIn value={it.unit} onChange={(v) => updateItem(it.id, { unit: v })} /></td>
                <td className="py-0.5 pr-2"><NumInput value={it.price} onChange={(n) => updateItem(it.id, { price: n })} /></td>
                <td className="py-0.5 pr-2 text-right tabular-nums">{fmtWon(itemAmount(it))}</td>
                <td className="py-0.5"><button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => setItems(value.items.filter((x) => x.id !== it.id))}><X className="size-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button size="sm" variant="ghost" className="mt-1 rounded-none" onClick={() => setItems([...value.items, emptyExpenseItem()])}><Plus /> 품목 줄</Button>
      </div>

      <label className={field}><span className={lbl}>메모</span><textarea value={value.note} onChange={(e) => set('note', e.target.value)} rows={2} className="w-full border border-input bg-background px-2 py-1 text-sm" /></label>

      <div className="flex items-center gap-2">
        <Button size="sm" className="rounded-none" onClick={onSave} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Check />} 저장</Button>
        <Button size="sm" variant="ghost" className="rounded-none" onClick={onCancel} disabled={pending}>취소</Button>
      </div>
    </div>
  )
}
