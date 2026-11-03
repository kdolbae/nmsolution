'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/admin/form'
import { PartyFields } from '@/components/admin/order-party-fields'
import { createOrder, deleteOrderParty, saveOrderParty } from '@/app/actions/orders'
import { emptyParty, type PoParty, type PoPartyRow } from '@/lib/orders/doc'

type OrderSummary = { id: number; no: string; date: string; status: string; issuer: string; supplier: string; siteName: string; total: number; items: number }

export function OrdersList({ orders, parties }: { orders: OrderSummary[]; parties: PoPartyRow[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const make = (preset: 'blank' | 'panel' | 'flashing' | 'flashing-seoul') =>
    start(async () => {
      const id = await createOrder(preset)
      router.push(`/admin/orders/${id}`)
    })

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => make('panel')} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} 판넬 발주서 (지붕·소골 벽체)
        </Button>
        <Button variant="outline" onClick={() => make('flashing')} disabled={pending}>
          <Plus /> 후레싱(절곡) 발주서
        </Button>
        <Button variant="outline" onClick={() => make('flashing-seoul')} disabled={pending} title="처마 막음·물끊기·마구리 캡·L자 받침·물받이 등 9종이 미리 들어감">
          <Plus /> 후레싱 · 서울 처마 9종
        </Button>
        <Button variant="outline" onClick={() => make('blank')} disabled={pending}>
          <Plus /> 빈 발주서
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
    const { name, ceo, bizNumber, address, phone, fax, email, manager, managerPhone } = initial
    return { name, ceo, bizNumber, address, phone, fax, email, manager, managerPhone }
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
