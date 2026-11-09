'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/admin/form'
import { PartyFields } from '@/components/admin/order-party-fields'
import { createOrder, deleteOrderParty, saveOrderParty } from '@/app/actions/orders'
import { emptyParty, PO_FORMS, type PoForm, type PoParty, type PoPartyRow } from '@/lib/orders/doc'

type OrderSummary = { id: number; no: string; date: string; status: string; issuer: string; supplier: string; siteName: string; total: number; items: number }

export function OrdersList({ orders, parties }: { orders: OrderSummary[]; parties: PoPartyRow[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const suppliers = parties.filter((p) => p.kind === 'supplier')
  const [supplierId, setSupplierId] = useState<number | null>(suppliers[0]?.id ?? null)
  const [product, setProduct] = useState<PoForm>('panel')
  const make = () =>
    start(async () => {
      const id = await createOrder(product, supplierId)
      router.push(`/admin/orders/${id}`)
    })

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-2 bg-background p-4 ring-1 ring-border">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">1. 발주 제품</span>
          <select value={product} onChange={(e) => setProduct(e.target.value as PoForm)} className="h-9 min-w-48 border border-input bg-background px-2 text-sm">
            {PO_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">2. 업체 (발주처)</span>
          <select value={supplierId ?? ''} onChange={(e) => setSupplierId(Number(e.target.value) || null)} className="h-9 min-w-56 border border-input bg-background px-2 text-sm">
            {suppliers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <Button onClick={make} disabled={pending || !supplierId}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} 발주서 만들기
        </Button>
      </div>

      <section className="mb-8 bg-background ring-1 ring-border">
        {orders.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">아직 발주서가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">발주번호</th>
                <th className="px-4 py-2">발주일</th>
                <th className="px-4 py-2">발주처</th>
                <th className="hidden px-4 py-2 md:table-cell">현장</th>
                <th className="hidden px-4 py-2 sm:table-cell">발주 사업자</th>
                <th className="px-4 py-2 text-right">합계(VAT 포함)</th>
                <th className="px-4 py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <FileText className="size-4 text-muted-foreground" />
                      {o.no}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tabular-nums">{o.date}</td>
                  <td className="px-4 py-2">{o.supplier}</td>
                  <td className="hidden px-4 py-2 md:table-cell">{o.siteName}</td>
                  <td className="hidden px-4 py-2 sm:table-cell">{o.issuer}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{o.total ? o.total.toLocaleString('ko-KR') : '-'}</td>
                  <td className="px-4 py-2">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Section title="발주 사업자" description="발주서 '발주자' 칸에 찍히는 사업자. 새 발주서는 맨 위 사업자로 시작하고, 발주서 화면에서 바꿀 수 있습니다.">
        <PartyList kind="issuer" rows={parties.filter((p) => p.kind === 'issuer')} />
      </Section>
      <Section title="발주처 (공급처)" description="발주서 '수신' 칸에 찍히는 공급처.">
        <PartyList kind="supplier" rows={parties.filter((p) => p.kind === 'supplier')} />
      </Section>
    </>
  )
}

function PartyList({ kind, rows }: { kind: 'issuer' | 'supplier'; rows: PoPartyRow[] }) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <PartyCard key={r.id} kind={kind} id={r.id} initial={r} />
      ))}
      {adding ? (
        <PartyCard kind={kind} id={null} initial={emptyParty()} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)}>
          <Plus /> {kind === 'issuer' ? '발주 사업자 추가' : '발주처 추가'}
        </Button>
      )}
    </div>
  )
}

function PartyCard({ kind, id, initial, onDone }: { kind: 'issuer' | 'supplier'; id: number | null; initial: PoParty; onDone?: () => void }) {
  const router = useRouter()
  const [p, setP] = useState<PoParty>(() => {
    const { name, ceo, bizNumber, address, phone, fax, email, manager, managerPhone, memo } = initial
    return { name, ceo, bizNumber, address, phone, fax, email, manager, managerPhone, memo }
  })
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const save = () =>
    start(async () => {
      await saveOrderParty(id, kind, p)
      setMsg('저장함')
      onDone?.()
      router.refresh()
    })
  const del = () => {
    if (!id || !confirm(`${p.name} 을(를) 목록에서 지웁니다. 이미 만든 발주서에는 영향 없습니다.`)) return
    start(async () => {
      await deleteOrderParty(id)
      router.refresh()
    })
  }
  return (
    <div className="border p-4">
      <PartyFields value={p} onChange={(v) => { setP(v); setMsg('') }} />
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={pending || !p.name.trim()}>
          {pending && <Loader2 className="animate-spin" />} 저장
        </Button>
        {id ? (
          <Button size="sm" variant="ghost" onClick={del} disabled={pending}>
            <Trash2 /> 삭제
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onDone}>취소</Button>
        )}
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  )
}
