import { notFound } from 'next/navigation'
import { ExecView } from '@/components/est/exec-view'
import { StageControl } from '@/components/est/stage-control'
import { Card, Empty, Stat, won } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { getProject, kstToday, listEvents, listItems } from '@/lib/est/data'
import { settlementNumbers } from '@/lib/est/exec'
import { getSettings } from '@/lib/est/settings'
import { canSeeCost, profitView } from '@/lib/est/perm'

export const dynamic = 'force-dynamic'

/** S10 수주·실행: 결과 입력, 발주·절충, 실투입, 변수. 패널: 실행이익·절충이익 */
export default async function ExecPage({ params }: { params: Promise<{ id: string }> }) {
  const pid = Number((await params).id)
  const [s, p, settings] = await Promise.all([estPageSession(), getProject(pid), getSettings()])
  if (!p) notFound()
  if (!['P6', 'WON', 'EXEC', 'SETTLE', 'CLOSED', 'HOLD'].includes(p.stage))
    return <Empty>제출 단계부터 수주·실행을 입력함. 지금 단계: {p.stage}</Empty>
  const [x, events, items] = await Promise.all([settlementNumbers(pid), listEvents(pid), listItems(true)])
  const view = profitView(s?.estRole, settings)
  const seeCost = canSeeCost(s?.estRole, settings)
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card title="결과·단계">
          <StageControl projectId={pid} stage={p.stage} />
        </Card>
        <ExecView
          projectId={pid}
          orders={x.orders}
          lines={x.lines.filter((l) => !l.removed && l.grade !== 'manager').map((l) => ({ id: Number(l.id), kind: l.kind, name: l.name, qty: l.qty, unit: l.unit, itemCode: l.itemCode }))}
          crew={x.crew}
          events={events}
          laborItems={items.filter((i) => i.kind === '노무').map((i) => ({ code: i.code, name: i.name }))}
          seeCost={seeCost}
          closed={p.stage === 'CLOSED'}
          today={kstToday()}
        />
      </div>
      <aside className="flex flex-col gap-3 xl:sticky xl:top-[calc(var(--sb-topbar-h)+1rem)] xl:self-start">
        <Card title="실행 패널">
          <div className="flex flex-col gap-3">
            <Stat label="공급가(실행 기준 판)" value={won(x.supply)} />
            {view === 'amount' && <Stat label="실행이익" value={won(x.exec.profit)} sub={`${x.exec.marginPct}%`} tone={x.exec.profit < 0 ? 'danger' : undefined} />}
            {view === 'pct' && <Stat label="실행이익률" value={`${x.exec.marginPct}%`} />}
            {view !== 'none' && <Stat label="절충이익(계획 − 발주)" value={view === 'amount' ? won(x.exec.negotiationGain) : x.exec.negotiationGain >= 0 ? '이득' : '손해'} />}
            <p className="text-xs text-muted-foreground">실행이익 = 공급가 − (발주금액 + 발주 없는 줄 예상원가 + 보험료 + 담당자 + 인센티브)</p>
          </div>
        </Card>
      </aside>
    </div>
  )
}
