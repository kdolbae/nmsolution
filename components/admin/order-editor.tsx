'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Download, Loader2, Plus, Printer, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/admin/form'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { PartyFields } from '@/components/admin/order-party-fields'
import { FlashingItems } from '@/components/admin/flashing-items'
import { FL_SEOUL_SET } from '@/lib/orders/flashing'
import { createOrder, deleteOrder, saveOrder } from '@/app/actions/orders'
import { calcOrder, emptyPoItem, itemAmount, itemMeters, PO_STATUSES, renderOrderHtml, type PoItem, type PoParty, type PoPartyRow, type PoStatus, type PurchaseOrder, PO_FORMS, type PoForm } from '@/lib/orders/doc'

const fmt = (n: number, d = 0) => (n ? n.toLocaleString('ko-KR', { maximumFractionDigits: d }) : '')

export function OrderEditor({ id, initial, parties }: { id: number; initial: PurchaseOrder; parties: PoPartyRow[] }) {
  const router = useRouter()
  const [o, setO] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const frame = useRef<HTMLIFrameElement>(null)

  const set = <K extends keyof PurchaseOrder>(k: K, v: PurchaseOrder[K]) => {
    setO((x) => ({ ...x, [k]: v }))
    setDirty(true)
    setMsg('')
  }
  // 판넬·자재 줄(plain)과 후레싱 절곡 줄(fls)을 한 발주서에 같이 둔다. 발주서에는 자재 → 후레싱 순서로 찍힌다
  const plain = o.items.filter((it) => !it.fl)
  const fls = o.items.filter((it) => it.fl)
  const setPlain = (v: PoItem[]) => set('items', [...v, ...fls])
  const setFls = (v: PoItem[]) => set('items', [...plain, ...v])
  const setItem = (idx: number, patch: Partial<PoItem>) => setPlain(plain.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const moveItem = (idx: number, d: -1 | 1) => {
    const j = idx + d
    if (j < 0 || j >= plain.length) return
    const next = [...plain]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setPlain(next)
  }

  const html = useMemo(() => renderOrderHtml(o), [o])
  const pages = (html.match(/<section class="sheet">/g) ?? []).length
  const { supply, vat, total } = calcOrder(o)

  const persist = () =>
    new Promise<PurchaseOrder>((resolve) =>
      start(async () => {
        const saved = await saveOrder(id, o)
        setO(saved)
        setDirty(false)
        setMsg('저장함')
        router.refresh()
        resolve(saved)
      }),
    )

  const print = () => frame.current?.contentWindow?.print()
  const pdf = async () => {
    if (dirty || !o.no) await persist()
    window.location.href = `/api/admin/orders/${id}/pdf`
  }
  const copy = () =>
    start(async () => {
      if (dirty) await saveOrder(id, o)
      const nid = await createOrder(o.form, null, id)
      router.push(`/admin/orders/${nid}`)
    })
  const del = () => {
    if (!confirm(`발주서 ${o.no} 를 지웁니다. 되돌릴 수 없습니다.`)) return
    start(async () => {
      await deleteOrder(id)
      router.push('/admin/orders')
    })
  }

  const pickParty = (kind: 'issuer' | 'supplier', pid: string) => {
    const p = parties.find((x) => String(x.id) === pid)
    if (!p) return
    const { name, ceo, bizNumber, address, phone, fax, email, manager, managerPhone, memo } = p
    set(kind, { name, ceo, bizNumber, address, phone, fax, email, manager, managerPhone, memo } satisfies PoParty)
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-5 mb-6 flex flex-wrap items-center gap-2 border-b bg-secondary/95 px-5 py-3 backdrop-blur lg:-mx-10 lg:px-10">
        <Link href="/admin/orders" className="mr-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> 발주서
        </Link>
        <h1 className="mr-auto text-lg font-bold">{o.no || '새 발주서'}</h1>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        {dirty && <span className="text-xs text-destructive">저장 안 됨</span>}
        <Button size="sm" onClick={() => persist()} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} 저장
        </Button>
        <Button size="sm" variant="outline" onClick={print}>
          <Printer /> 인쇄
        </Button>
        <Button size="sm" variant="outline" onClick={pdf} disabled={pending}>
          <Download /> PDF
        </Button>
        <Button size="sm" variant="ghost" onClick={copy} disabled={pending} title="이 발주서를 복사해 새 발주서를 만듦">
          <Copy /> 복사
        </Button>
        <Button size="sm" variant="ghost" onClick={del} disabled={pending}>
          <Trash2 />
        </Button>
      </div>

      <Section title="기본">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <L label="발주일자"><input type="date" value={o.date} onChange={(e) => set('date', e.target.value)} className="h-8 w-full border border-input bg-background px-2 text-sm" /></L>
          <L label="발주번호 (비우면 저장 때 PO-YYMM-순번)"><TextIn value={o.no} onChange={(v) => set('no', v)} /></L>
          <L label="발주 제품">
            <select value={o.form} onChange={(e) => set('form', e.target.value as PoForm)} className="h-8 w-full border border-input bg-background px-2 text-sm">
              {PO_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </L>
          <L label="상태">
            <select value={o.status} onChange={(e) => set('status', e.target.value as PoStatus)} className="h-8 w-full border border-input bg-background px-2 text-sm">
              {PO_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </L>
          <L label="현장명"><TextIn value={o.siteName} onChange={(v) => set('siteName', v)} placeholder="예) 서울 화곡동 상가 처마" /></L>
          <L label="납기"><TextIn value={o.deliveryDate} onChange={(v) => set('deliveryDate', v)} placeholder="예) 11월 5일 오전 도착" /></L>
          <L label="결제 조건"><TextIn value={o.payment} onChange={(v) => set('payment', v)} /></L>
          <div className="sm:col-span-3"><L label="납품 장소"><TextIn value={o.deliveryPlace} onChange={(v) => set('deliveryPlace', v)} placeholder="현장 주소" /></L></div>
          <L label="현장 담당"><TextIn value={o.receiver} onChange={(v) => set('receiver', v)} /></L>
          <L label="현장 담당 연락처"><TextIn value={o.receiverPhone} onChange={(v) => set('receiverPhone', v)} /></L>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:gap-6">
        <Section title="발주자 (발주 사업자)">
          <select value="" onChange={(e) => pickParty('issuer', e.target.value)} className="h-8 border border-input bg-background px-2 text-sm">
            <option value="">사업자 불러오기…</option>
            {parties.filter((p) => p.kind === 'issuer').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <PartyFields value={o.issuer} onChange={(v) => set('issuer', v)} />
        </Section>
        <Section title="수신 (발주처)">
          <select value="" onChange={(e) => pickParty('supplier', e.target.value)} className="h-8 border border-input bg-background px-2 text-sm">
            <option value="">발주처 불러오기…</option>
            {parties.filter((p) => p.kind === 'supplier').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <PartyFields value={o.supplier} onChange={(v) => set('supplier', v)} />
        </Section>
      </div>

      <Section
        title="판넬·자재 품목"
        description="판넬은 단가 기준 'm'(길이×수량×단가). 단가를 모르면 비워 두거나 '금액란 숨김'으로 수량만 발주."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-8 py-1">No</th>
                <th className="py-1">품명</th>
                <th className="py-1">규격·색상</th>
                <th className="w-20 py-1">길이(mm)</th>
                <th className="w-16 py-1">수량</th>
                <th className="w-14 py-1">단위</th>
                <th className="w-16 py-1 text-right">총길이</th>
                <th className="w-16 py-1">단가기준</th>
                <th className="w-24 py-1">단가</th>
                <th className="w-24 py-1 text-right">금액</th>
                <th className="py-1">비고</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {plain.map((it, i) => (
                <tr key={it.id} className="align-middle">
                  <td className="py-1 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="py-1 pr-1"><TextIn value={it.name} onChange={(v) => setItem(i, { name: v })} /></td>
                  <td className="py-1 pr-1"><TextIn value={it.spec} onChange={(v) => setItem(i, { spec: v })} /></td>
                  <td className="py-1 pr-1"><NumInput value={it.lengthMm} onChange={(v) => setItem(i, { lengthMm: v })} /></td>
                  <td className="py-1 pr-1"><NumInput value={it.qty} onChange={(v) => setItem(i, { qty: v })} /></td>
                  <td className="py-1 pr-1"><TextIn value={it.unit} onChange={(v) => setItem(i, { unit: v })} /></td>
                  <td className="py-1 pr-1 text-right tabular-nums text-xs">{fmt(itemMeters(it), 2)}</td>
                  <td className="py-1 pr-1">
                    <select value={it.basis} onChange={(e) => setItem(i, { basis: e.target.value as 'm' | 'ea' })} className="h-8 w-full border border-input bg-background px-1 text-sm">
                      <option value="m">m</option>
                      <option value="ea">수량</option>
                    </select>
                  </td>
                  <td className="py-1 pr-1"><NumInput value={it.price} onChange={(v) => setItem(i, { price: v })} /></td>
                  <td className="py-1 pr-1 text-right tabular-nums">{fmt(itemAmount(it))}</td>
                  <td className="py-1 pr-1"><TextIn value={it.note} onChange={(v) => setItem(i, { note: v })} /></td>
                  <td className="py-1 whitespace-nowrap">
                    <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => moveItem(i, -1)} aria-label="위로"><ChevronUp className="size-4" /></button>
                    <button type="button" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => moveItem(i, 1)} aria-label="아래로"><ChevronDown className="size-4" /></button>
                    <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => setPlain(plain.filter((_, j) => j !== i))} aria-label="삭제"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm" variant="outline" onClick={() => setPlain([...plain, emptyPoItem()])}>
            <Plus /> 품목 추가
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={o.hidePrice} onChange={(e) => set('hidePrice', e.target.checked)} /> 금액란 숨김 (수량만 발주)
          </label>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            공급가 {fmt(supply) || 0} · 부가세 {fmt(vat) || 0} · <b className="text-foreground">합계 {fmt(total) || 0}</b>
          </span>
        </div>
      </Section>

      {(o.form === 'panel' || fls.length > 0) && (
      <Section
        title="후레싱 (절곡)"
        description="판넬 발주처(새롬판넬 등)에 판넬과 같이 절곡 발주. 종류를 고르면 제안 치수가 들어가고, 치수·각도·벤딩 방향을 고치면 단면 그림과 발주서 뒤 '절곡 상세도' 장이 같이 바뀜."
      >
        <FlashingItems
          items={fls}
          startNo={plain.filter((it) => it.name || it.spec || it.qty || it.lengthMm || it.price || it.note).length}
          onChange={setFls}
          onSeoul={() => setFls([...fls, ...FL_SEOUL_SET.map((x) => ({ ...emptyPoItem(), name: x.name, note: x.note, fl: structuredClone(x.fl) }))])}
        />
      </Section>
      )}

      <Section title="특기사항" description="한 줄에 한 항목.">
        <textarea value={o.notes} onChange={(e) => set('notes', e.target.value)} rows={4} className="w-full border border-input bg-background p-2 text-sm" />
      </Section>

      <Section title={`미리보기 · A4 ${pages}장`} description="인쇄·PDF 가 이 모양 그대로 나옵니다. 품목이 많으면 장이 늘어납니다.">
        <iframe
          ref={frame}
          title="발주서 미리보기"
          srcDoc={html}
          className="w-full border-0 bg-[#E6E9EE]"
          style={{ height: pages * 1139 + 40 }}
        />
      </Section>
    </>
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
