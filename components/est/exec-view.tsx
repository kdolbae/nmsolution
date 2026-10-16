'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { addCrewDay, addOrder, deleteCrewDay, deleteOrder, ordersFromLines, updateOrder } from '@/app/actions/est-exec'
import { addEvent } from '@/app/actions/est'
import { Badge, Btn, Card, ErrorLine, FieldRow, inputCls, selectCls, tdCls, thCls, won } from './ui'
import { useAct } from './use-act'

type Order = { id: number; lineId: number | null; itemCode: string | null; kind: string; name: string; vendor: string | null; qty: number; plannedAmount: number; orderedAmount: number; negotiationNote: string | null; status: string }
type Line = { id: number; kind: string; name: string; qty: number; unit: string; itemCode: string | null }
type Crew = { id: number; workDate: string; itemCode: string | null; laborClass: string; headcount: number; hours: number; overtimeHours: number; night: boolean; note: string | null }
type Ev = { id: number; kind: string; title: string; body: string; costImpact: number; occurredOn: string }

const STATUS: Record<string, string> = { draft: '준비', ordered: '발주', done: '완료', canceled: '취소' }
const LABOR: Record<string, string> = { our_staff: '우리 직원', daily: '일용', partner: '협력사' }
const EVENT: Record<string, string> = { site: '현장', client: '발주처', weather: '날씨', safety: '안전', design: '설계 변경', other: '기타' }
const KINDS = ['자재', '용역', '장비', '노무', '경비']

/** S10 수주·실행: 발주 표(줄에서 끌어오기·절충금액), 실투입 인·일, 변수 기록 */
export function ExecView({
  projectId,
  orders,
  lines,
  crew,
  events,
  laborItems,
  seeCost,
  closed,
  today,
}: {
  projectId: number
  orders: Order[]
  lines: Line[]
  crew: Crew[]
  events: Ev[]
  laborItems: { code: string; name: string }[]
  seeCost: boolean
  closed: boolean
  today: string
}) {
  return (
    <div className="flex flex-col gap-5">
      <Orders projectId={projectId} orders={orders} lines={lines} seeCost={seeCost} closed={closed} />
      <CrewDays projectId={projectId} crew={crew} laborItems={laborItems} closed={closed} today={today} />
      <Events projectId={projectId} events={events} closed={closed} today={today} />
    </div>
  )
}

function Orders({ projectId, orders, lines, seeCost, closed }: { projectId: number; orders: Order[]; lines: Line[]; seeCost: boolean; closed: boolean }) {
  const { pending, error, run } = useAct()
  const taken = new Set(orders.map((o) => o.lineId))
  const free = lines.filter((l) => !taken.has(l.id))
  const [pick, setPick] = useState<number[]>([])
  const [m, setM] = useState({ kind: '자재', name: '', qty: '1', plannedAmount: '', orderedAmount: '', vendor: '' })
  return (
    <Card title="발주" description="견적 줄에서 끌어오면 계획금액 = 예상원가(typ). 절충해서 낮춘 금액을 발주금액에 적음">
      {!closed && free.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 border border-dashed border-border p-3">
          <span className="text-sm font-medium">견적 줄에서 끌어오기</span>
          <div className="flex flex-wrap gap-2">
            {free.map((l) => (
              <label key={l.id} className="flex items-center gap-1.5 border border-border px-2 py-1 text-xs">
                <input type="checkbox" checked={pick.includes(l.id)} onChange={(e) => setPick(e.target.checked ? [...pick, l.id] : pick.filter((x) => x !== l.id))} />
                {l.kind} · {l.name} ({l.qty}
                {l.unit})
              </label>
            ))}
          </div>
          <Btn size="sm" className="w-fit" disabled={!pick.length || pending} onClick={() => run(() => ordersFromLines(projectId, pick), () => setPick([]))}>
            고른 줄 발주로
          </Btn>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={thCls}>비목·이름</th>
              <th className={thCls}>업체</th>
              <th className={thCls + ' text-right'}>수량</th>
              {seeCost && <th className={thCls + ' text-right'}>계획</th>}
              <th className={thCls + ' text-right'}>발주금액</th>
              <th className={thCls}>절충 메모</th>
              <th className={thCls}>상태</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <OrderRow key={o.id} o={o} seeCost={seeCost} closed={closed} />
            ))}
            {!orders.length && (
              <tr>
                <td className={tdCls + ' text-muted-foreground'} colSpan={8}>
                  발주 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!closed && (
        <div className="mt-4 grid gap-2 sm:grid-cols-7">
          <select className={selectCls} value={m.kind} onChange={(e) => setM({ ...m, kind: e.target.value })} aria-label="비목">
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input className={inputCls + ' sm:col-span-2'} placeholder="이름(견적 밖 발주)" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
          <input className={inputCls} placeholder="업체" value={m.vendor} onChange={(e) => setM({ ...m, vendor: e.target.value })} />
          <input className={inputCls} placeholder="계획금액" inputMode="numeric" value={m.plannedAmount} onChange={(e) => setM({ ...m, plannedAmount: e.target.value.replace(/\D/g, '') })} />
          <input className={inputCls} placeholder="발주금액" inputMode="numeric" value={m.orderedAmount} onChange={(e) => setM({ ...m, orderedAmount: e.target.value.replace(/\D/g, '') })} />
          <Btn
            disabled={pending}
            onClick={() =>
              run(
                () => addOrder(projectId, { kind: m.kind, name: m.name, qty: Number(m.qty) || 1, plannedAmount: Number(m.plannedAmount) || 0, orderedAmount: Number(m.orderedAmount) || 0, vendor: m.vendor }),
                () => setM({ ...m, name: '', plannedAmount: '', orderedAmount: '', vendor: '' }),
              )
            }
          >
            발주 추가
          </Btn>
        </div>
      )}
      <ErrorLine error={error} />
    </Card>
  )
}

function OrderRow({ o, seeCost, closed }: { o: Order; seeCost: boolean; closed: boolean }) {
  const { pending, error, run } = useAct()
  const [f, setF] = useState({ vendor: o.vendor ?? '', orderedAmount: String(o.orderedAmount), negotiationNote: o.negotiationNote ?? '', status: o.status })
  const dirty = f.vendor !== (o.vendor ?? '') || Number(f.orderedAmount) !== o.orderedAmount || f.negotiationNote !== (o.negotiationNote ?? '') || f.status !== o.status
  return (
    <tr>
      <td className={tdCls}>
        <span className="text-xs text-muted-foreground">{o.kind}</span> {o.name}
        {error && <span className="block text-xs text-destructive">{error}</span>}
      </td>
      <td className={tdCls}>
        <input className={inputCls + ' h-8'} value={f.vendor} disabled={closed} onChange={(e) => setF({ ...f, vendor: e.target.value })} />
      </td>
      <td className={tdCls + ' text-right font-mono'}>{o.qty}</td>
      {seeCost && <td className={tdCls + ' text-right font-mono'}>{won(o.plannedAmount)}</td>}
      <td className={tdCls}>
        <input className={inputCls + ' h-8 text-right font-mono'} inputMode="numeric" value={f.orderedAmount} disabled={closed} onChange={(e) => setF({ ...f, orderedAmount: e.target.value.replace(/\D/g, '') })} />
      </td>
      <td className={tdCls}>
        <input className={inputCls + ' h-8'} value={f.negotiationNote} disabled={closed} onChange={(e) => setF({ ...f, negotiationNote: e.target.value })} />
      </td>
      <td className={tdCls}>
        <select className={selectCls + ' h-8'} value={f.status} disabled={closed} onChange={(e) => setF({ ...f, status: e.target.value })}>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td className={tdCls + ' whitespace-nowrap'}>
        {!closed && dirty && (
          <Btn size="sm" variant="primary" disabled={pending} onClick={() => run(() => updateOrder(o.id, { vendor: f.vendor, orderedAmount: Number(f.orderedAmount) || 0, negotiationNote: f.negotiationNote, status: f.status }))}>
            저장
          </Btn>
        )}
        {!closed && (
          <Btn size="sm" variant="ghost" aria-label="발주 지우기" disabled={pending} onClick={() => confirm('이 발주를 지울까요?') && run(() => deleteOrder(o.id))}>
            <Trash2 className="size-3.5" />
          </Btn>
        )}
      </td>
    </tr>
  )
}

function CrewDays({ projectId, crew, laborItems, closed, today }: { projectId: number; crew: Crew[]; laborItems: { code: string; name: string }[]; closed: boolean; today: string }) {
  const { pending, error, run } = useAct()
  const [f, setF] = useState({ workDate: today, itemCode: laborItems[0]?.code ?? '', laborClass: 'daily', headcount: '', hours: '8', overtimeHours: '0', night: false, note: '' })
  const name = (c: string | null) => laborItems.find((x) => x.code === c)?.name ?? c ?? '품목 미지정'
  return (
    <Card title="실투입 인·일" description="날짜·인원·시간·연장·야간. 정산에서 견적 인·일과 비교함">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={thCls}>날짜</th>
              <th className={thCls}>품목</th>
              <th className={thCls}>구분</th>
              <th className={thCls + ' text-right'}>인원</th>
              <th className={thCls + ' text-right'}>시간</th>
              <th className={thCls + ' text-right'}>연장</th>
              <th className={thCls}>야간</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {crew.map((c) => (
              <tr key={c.id}>
                <td className={tdCls + ' font-mono'}>{c.workDate}</td>
                <td className={tdCls}>{name(c.itemCode)}</td>
                <td className={tdCls}>{LABOR[c.laborClass] ?? c.laborClass}</td>
                <td className={tdCls + ' text-right font-mono'}>{c.headcount}</td>
                <td className={tdCls + ' text-right font-mono'}>{c.hours}</td>
                <td className={tdCls + ' text-right font-mono'}>{c.overtimeHours}</td>
                <td className={tdCls}>{c.night ? <Badge tone="warn">야간</Badge> : ''}</td>
                <td className={tdCls}>
                  {!closed && (
                    <button type="button" aria-label="지우기" className="text-muted-foreground hover:text-destructive" onClick={() => confirm('지울까요?') && run(() => deleteCrewDay(c.id))}>
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!closed && (
        <div className="mt-4 grid gap-2 sm:grid-cols-8">
          <input type="date" className={inputCls + ' sm:col-span-2'} value={f.workDate} onChange={(e) => setF({ ...f, workDate: e.target.value })} aria-label="날짜" />
          <select className={selectCls + ' sm:col-span-2'} value={f.itemCode} onChange={(e) => setF({ ...f, itemCode: e.target.value })} aria-label="품목">
            <option value="">(품목 미지정)</option>
            {laborItems.map((i) => (
              <option key={i.code} value={i.code}>
                {i.name}
              </option>
            ))}
          </select>
          <select className={selectCls} value={f.laborClass} onChange={(e) => setF({ ...f, laborClass: e.target.value })} aria-label="구분">
            {Object.entries(LABOR).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input className={inputCls} placeholder="인원" inputMode="decimal" value={f.headcount} onChange={(e) => setF({ ...f, headcount: e.target.value.replace(/[^\d.]/g, '') })} />
          <input className={inputCls} placeholder="연장h" inputMode="decimal" value={f.overtimeHours} onChange={(e) => setF({ ...f, overtimeHours: e.target.value.replace(/[^\d.]/g, '') })} />
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={f.night} onChange={(e) => setF({ ...f, night: e.target.checked })} />
            야간
          </label>
          <Btn
            className="sm:col-span-8 sm:w-fit"
            disabled={pending}
            onClick={() =>
              run(
                () => addCrewDay(projectId, { ...f, headcount: Number(f.headcount) || 0, hours: Number(f.hours) || 8, overtimeHours: Number(f.overtimeHours) || 0 }),
                () => setF({ ...f, headcount: '', note: '' }),
              )
            }
          >
            인·일 추가
          </Btn>
        </div>
      )}
      <ErrorLine error={error} />
    </Card>
  )
}

function Events({ projectId, events, closed, today }: { projectId: number; events: Ev[]; closed: boolean; today: string }) {
  const { pending, error, run } = useAct()
  const [f, setF] = useState({ kind: 'site', title: '', body: '', costImpact: '', occurredOn: today })
  return (
    <Card title="변수 기록" description="견적 밖 상황(날씨·설계 변경 등). 정산 때 원가 차이 설명·마스터 보완 근거">
      <ul className="flex flex-col">
        {events.map((e) => (
          <li key={e.id} className="border-b border-border py-2 text-sm last:border-0">
            <span className="font-mono text-xs text-muted-foreground">{e.occurredOn}</span> <Badge tone="muted">{EVENT[e.kind] ?? e.kind}</Badge> <b>{e.title}</b>
            {e.costImpact ? <span className="ml-2 font-mono text-xs">원가 영향 {won(e.costImpact)}</span> : null}
            {e.body && <p className="text-xs text-muted-foreground">{e.body}</p>}
          </li>
        ))}
        {!events.length && <li className="text-sm text-muted-foreground">기록 없음</li>}
      </ul>
      {!closed && (
        <div className="mt-3 grid gap-2 sm:grid-cols-6">
          <select className={selectCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} aria-label="종류">
            {Object.entries(EVENT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input type="date" className={inputCls} value={f.occurredOn} onChange={(e) => setF({ ...f, occurredOn: e.target.value })} aria-label="날짜" />
          <input className={inputCls + ' sm:col-span-2'} placeholder="제목" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className={inputCls} placeholder="원가 영향(원)" inputMode="numeric" value={f.costImpact} onChange={(e) => setF({ ...f, costImpact: e.target.value.replace(/[^\d-]/g, '') })} />
          <Btn disabled={pending} onClick={() => run(() => addEvent(projectId, { ...f, costImpact: Number(f.costImpact) || 0 }), () => setF({ ...f, title: '', body: '', costImpact: '' }))}>
            기록
          </Btn>
          <FieldRow label="내용" className="sm:col-span-6">
            <input className={inputCls} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          </FieldRow>
        </div>
      )}
      <ErrorLine error={error} />
    </Card>
  )
}
