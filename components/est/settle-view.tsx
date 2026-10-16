'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { addPayment, addReceipt, closeSettlement, deletePayment, deleteReceipt, setManagerDays } from '@/app/actions/est-exec'
import { decideVariance } from '@/app/actions/est-admin'
import { Badge, Btn, Card, ErrorLine, inputCls, selectCls, Stat, tdCls, thCls, won } from './ui'
import { useAct } from './use-act'

type Receipt = { id: number; kind: string; amount: number; receivedOn: string; note: string | null }
type Payment = { id: number; orderId: number | null; kind: string; amount: number; paidOn: string; vendor: string | null; evidencePath: string | null; note: string | null }
type Flag = { id: number; itemCode: string; itemName: string; estimatePrice: number; actualPrice: number; variancePct: number; status: string }
type Cand = { itemCode: string; name: string; estimatePrice: number; actualPrice: number; variancePct: number; flagged: boolean }

const RECEIPT: Record<string, string> = { advance: '선금', interim: '중도금', balance: '잔금', extra: '추가', refund: '환불' }
const PAY_KINDS = ['자재', '용역', '장비', '노무', '경비']

/** S11 정산: 수금·실지출·담당자 일수·인센티브·최종이익·비교·마스터 갱신 후보·마감 */
export function SettleView(props: {
  projectId: number
  stage: string
  closed: boolean
  receipts: Receipt[]
  payments: Payment[]
  orders: { id: number; name: string }[]
  autoDays: number
  managerDays: number
  overridden: boolean
  numbers: { supply: number; received: number; paid: number; managerCost: number; managerRate: number; incentive: number; before: number; final: number; execProfit: number }
  crew: { rows: { key: string; name: string; estimate: number; actual: number; diff: number }[]; totalEst: number; totalAct: number; diff: number }
  candidates: Cand[]
  flags: Flag[]
  isCeo: boolean
  today: string
}) {
  const { pending, error, run } = useAct()
  const [note, setNote] = useState('')
  const n = props.numbers
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <Receipts projectId={props.projectId} receipts={props.receipts} closed={props.closed} today={props.today} />
        <Payments projectId={props.projectId} payments={props.payments} orders={props.orders} closed={props.closed} today={props.today} />
        <ManagerDays projectId={props.projectId} autoDays={props.autoDays} managerDays={props.managerDays} overridden={props.overridden} rate={n.managerRate} closed={props.closed} />
        <Card title="견적 vs 실투입 인·일">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thCls}>품목</th>
                <th className={thCls + ' text-right'}>견적</th>
                <th className={thCls + ' text-right'}>실투입</th>
                <th className={thCls + ' text-right'}>차이</th>
              </tr>
            </thead>
            <tbody>
              {props.crew.rows.map((r) => (
                <tr key={r.key}>
                  <td className={tdCls}>{r.name}</td>
                  <td className={tdCls + ' text-right font-mono'}>{r.estimate}</td>
                  <td className={tdCls + ' text-right font-mono'}>{r.actual}</td>
                  <td className={tdCls + ' text-right font-mono'}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={tdCls}>합계</td>
                <td className={tdCls + ' text-right font-mono'}>{props.crew.totalEst}</td>
                <td className={tdCls + ' text-right font-mono'}>{props.crew.totalAct}</td>
                <td className={tdCls + ' text-right font-mono'}>{props.crew.diff > 0 ? `+${props.crew.diff}` : props.crew.diff}</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <Card title="단가 차이(마스터 갱신 후보)" description="완료 발주의 실단가(발주금액 ÷ 수량) vs 견적단가. 기준 % 이상이면 정산 마감 때 후보로 올라감">
          {props.closed ? (
            <FlagTable flags={props.flags} isCeo={props.isCeo} />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={thCls}>품목</th>
                  <th className={thCls + ' text-right'}>견적단가</th>
                  <th className={thCls + ' text-right'}>실단가</th>
                  <th className={thCls + ' text-right'}>차이</th>
                </tr>
              </thead>
              <tbody>
                {props.candidates.map((c) => (
                  <tr key={c.itemCode} className={c.flagged ? 'bg-[color:var(--sb-warn)]/10' : ''}>
                    <td className={tdCls}>{c.name}</td>
                    <td className={tdCls + ' text-right font-mono'}>{won(c.estimatePrice)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{won(c.actualPrice)}</td>
                    <td className={tdCls + ' text-right font-mono'}>{c.variancePct}%</td>
                  </tr>
                ))}
                {!props.candidates.length && (
                  <tr>
                    <td colSpan={4} className={tdCls + ' text-muted-foreground'}>
                      완료된 발주가 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <aside className="flex flex-col gap-3 xl:sticky xl:top-[calc(var(--sb-topbar-h)+1rem)] xl:self-start">
        <Card title="정산 패널">
          <div className="flex flex-col gap-3">
            <Stat label="공급가" value={won(n.supply)} />
            <Stat label="수금 합계" value={won(n.received)} />
            <Stat label="실지출(담당자·인센티브 제외)" value={won(n.paid)} />
            <Stat label="담당자 원가" value={won(n.managerCost)} sub={`${props.managerDays}일 × ${won(n.managerRate)}`} />
            <Stat label="인센티브" value={won(n.incentive)} sub={`인센티브 전 이익 ${won(n.before)}`} />
            <Stat label="최종이익" value={won(n.final)} sub={n.supply ? `${Math.round((n.final / n.supply) * 1000) / 10}%` : undefined} tone={n.final < 0 ? 'danger' : 'ok'} />
            <Stat label="실행이익(참고)" value={won(n.execProfit)} />
          </div>
        </Card>
        {props.closed ? (
          <p className="bg-background p-3 text-sm ring-1 ring-border">정산 마감됨</p>
        ) : props.stage === 'SETTLE' ? (
          <div className="flex flex-col gap-2 bg-background p-3 ring-1 ring-border">
            <input className={inputCls} placeholder="마감 메모" value={note} onChange={(e) => setNote(e.target.value)} />
            <Btn variant="accent" disabled={pending} onClick={() => confirm('정산을 마감할까요? 숫자가 확정되고 단가 차이 후보·실단가 관측이 쌓임') && run(() => closeSettlement(props.projectId, note))}>
              정산 마감
            </Btn>
            <ErrorLine error={error} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">실행 탭에서 발주를 모두 완료·취소하고 &ldquo;정산 단계로&rdquo; 넘기면 마감할 수 있음</p>
        )}
      </aside>
    </div>
  )
}

export function FlagTable({ flags, isCeo, showProject }: { flags: (Flag & { projectNumber?: string })[]; isCeo: boolean; showProject?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            {showProject && <th className={thCls}>건</th>}
            <th className={thCls}>품목</th>
            <th className={thCls + ' text-right'}>견적단가</th>
            <th className={thCls + ' text-right'}>실단가</th>
            <th className={thCls + ' text-right'}>차이</th>
            <th className={thCls}>처리</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <FlagRow key={f.id} f={f} isCeo={isCeo} showProject={showProject} />
          ))}
          {!flags.length && (
            <tr>
              <td colSpan={6} className={tdCls + ' text-muted-foreground'}>
                후보 없음
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function FlagRow({ f, isCeo, showProject }: { f: Flag & { projectNumber?: string }; isCeo: boolean; showProject?: boolean }) {
  const { pending, error, run } = useAct()
  const [price, setPrice] = useState(String(f.actualPrice))
  return (
    <tr>
      {showProject && <td className={tdCls + ' font-mono text-xs'}>{f.projectNumber}</td>}
      <td className={tdCls}>
        {f.itemName} <span className="font-mono text-xs text-muted-foreground">{f.itemCode}</span>
        {error && <span className="block text-xs text-destructive">{error}</span>}
      </td>
      <td className={tdCls + ' text-right font-mono'}>{won(f.estimatePrice)}</td>
      <td className={tdCls + ' text-right font-mono'}>{won(f.actualPrice)}</td>
      <td className={tdCls + ' text-right font-mono'}>{f.variancePct}%</td>
      <td className={tdCls}>
        {f.status !== 'new' ? (
          <Badge tone={f.status === 'applied' ? 'ok' : 'muted'}>{f.status === 'applied' ? '적용' : '무시'}</Badge>
        ) : isCeo ? (
          <span className="flex flex-wrap items-center gap-1">
            <input className={inputCls + ' h-8 w-28 text-right font-mono'} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} aria-label="새 견적단가" />
            <Btn size="sm" variant="accent" disabled={pending} onClick={() => run(() => decideVariance(f.id, 'apply', Number(price) || undefined))}>
              견적단가로 적용
            </Btn>
            <Btn size="sm" variant="ghost" disabled={pending} onClick={() => run(() => decideVariance(f.id, 'ignore'))}>
              무시
            </Btn>
          </span>
        ) : (
          <Badge tone="warn">대표 확인 대기</Badge>
        )}
      </td>
    </tr>
  )
}

function Receipts({ projectId, receipts, closed, today }: { projectId: number; receipts: Receipt[]; closed: boolean; today: string }) {
  const { pending, error, run } = useAct()
  const [f, setF] = useState({ kind: 'advance', amount: '', receivedOn: today, note: '' })
  return (
    <Card title="수금">
      <ul className="flex flex-col">
        {receipts.map((r) => (
          <li key={r.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
            <span>
              <span className="font-mono text-xs text-muted-foreground">{r.receivedOn}</span> {RECEIPT[r.kind] ?? r.kind} {r.note && <span className="text-xs text-muted-foreground">· {r.note}</span>}
            </span>
            <span className="flex items-center gap-2 font-mono">
              {r.kind === 'refund' ? '−' : ''}
              {won(r.amount)}
              {!closed && (
                <button type="button" aria-label="지우기" className="text-muted-foreground hover:text-destructive" onClick={() => confirm('지울까요?') && run(() => deleteReceipt(r.id))}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {!closed && (
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          <select className={selectCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} aria-label="구분">
            {Object.entries(RECEIPT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input className={inputCls} placeholder="금액" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} />
          <input type="date" className={inputCls} value={f.receivedOn} onChange={(e) => setF({ ...f, receivedOn: e.target.value })} aria-label="수금일" />
          <input className={inputCls} placeholder="메모" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <Btn disabled={pending} onClick={() => run(() => addReceipt(projectId, { ...f, amount: Number(f.amount) || 0 }), () => setF({ ...f, amount: '', note: '' }))}>
            수금 추가
          </Btn>
        </div>
      )}
      <ErrorLine error={error} />
    </Card>
  )
}

function Payments({ projectId, payments, orders, closed, today }: { projectId: number; payments: Payment[]; orders: { id: number; name: string }[]; closed: boolean; today: string }) {
  const { pending, error, run } = useAct()
  const [f, setF] = useState({ kind: '자재', amount: '', paidOn: today, vendor: '', orderId: '', evidence: '', note: '' })
  return (
    <Card title="실지출" description="증빙은 보관 위치·번호를 적음(파일 보관은 2단계)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={thCls}>지급일</th>
              <th className={thCls}>비목</th>
              <th className={thCls}>업체</th>
              <th className={thCls}>발주</th>
              <th className={thCls}>증빙</th>
              <th className={thCls + ' text-right'}>금액</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className={tdCls + ' font-mono text-xs'}>{p.paidOn}</td>
                <td className={tdCls}>{p.kind}</td>
                <td className={tdCls}>{p.vendor ?? '-'}</td>
                <td className={tdCls + ' text-xs'}>{orders.find((o) => o.id === p.orderId)?.name ?? '-'}</td>
                <td className={tdCls + ' text-xs'}>{p.evidencePath ?? '-'}</td>
                <td className={tdCls + ' text-right font-mono'}>{won(p.amount)}</td>
                <td className={tdCls}>
                  {!closed && (
                    <button type="button" aria-label="지우기" className="text-muted-foreground hover:text-destructive" onClick={() => confirm('지울까요?') && run(() => deletePayment(p.id))}>
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
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <select className={selectCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} aria-label="비목">
            {PAY_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="금액" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} />
          <input type="date" className={inputCls} value={f.paidOn} onChange={(e) => setF({ ...f, paidOn: e.target.value })} aria-label="지급일" />
          <input className={inputCls} placeholder="업체" value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} />
          <select className={selectCls} value={f.orderId} onChange={(e) => setF({ ...f, orderId: e.target.value })} aria-label="발주">
            <option value="">(발주 연결 없음)</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input className={inputCls} placeholder="증빙(계산서 번호 등)" value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })} />
          <input className={inputCls} placeholder="메모" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <Btn disabled={pending} onClick={() => run(() => addPayment(projectId, { ...f, amount: Number(f.amount) || 0, orderId: f.orderId ? Number(f.orderId) : null }), () => setF({ ...f, amount: '', vendor: '', evidence: '', note: '' }))}>
            지출 추가
          </Btn>
        </div>
      )}
      <ErrorLine error={error} />
    </Card>
  )
}

function ManagerDays({ projectId, autoDays, managerDays, overridden, rate, closed }: { projectId: number; autoDays: number; managerDays: number; overridden: boolean; rate: number; closed: boolean }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState(String(managerDays))
  return (
    <Card title="담당자 실제 일수" description={`방문 기록 합계 ${autoDays}일(자동). 다르면 고쳐 넣음 · 1일 내부 원가 ${won(rate)}원`}>
      <div className="flex flex-wrap items-center gap-2">
        <input className={inputCls + ' w-28'} inputMode="decimal" value={v} disabled={closed} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ''))} />
        <span className="text-sm">일 {overridden ? <Badge tone="warn">수정함</Badge> : <Badge tone="muted">자동</Badge>}</span>
        {!closed && (
          <>
            <Btn size="sm" variant="primary" disabled={pending} onClick={() => run(() => setManagerDays(projectId, Number(v) || 0))}>
              저장
            </Btn>
            {overridden && (
              <Btn size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setManagerDays(projectId, null), () => setV(String(autoDays)))}>
                자동으로
              </Btn>
            )}
          </>
        )}
      </div>
      <ErrorLine error={error} />
    </Card>
  )
}
