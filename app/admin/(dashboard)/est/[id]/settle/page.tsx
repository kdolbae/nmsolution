import { notFound } from 'next/navigation'
import { SettleView } from '@/components/est/settle-view'
import { Empty } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { getProject, kstToday, listVarianceFlags } from '@/lib/est/data'
import { settlementNumbers } from '@/lib/est/exec'
import { crewCompare } from '@/lib/est/settle'
import { atLeast } from '@/lib/est/perm'

export const dynamic = 'force-dynamic'

/** S11 정산(검토자 이상) */
export default async function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const pid = Number((await params).id)
  const [s, p] = await Promise.all([estPageSession(), getProject(pid)])
  if (!p) notFound()
  if (!atLeast(s?.estRole, 'reviewer')) return <Empty>정산은 검토자·대표만 볼 수 있음</Empty>
  if (!['EXEC', 'SETTLE', 'CLOSED'].includes(p.stage)) return <Empty>실행 단계부터 정산을 입력함. 지금 단계: {p.stage}</Empty>
  const [x, flags] = await Promise.all([settlementNumbers(pid), listVarianceFlags(null, pid)])
  const closed = p.stage === 'CLOSED'
  return (
    <SettleView
      projectId={pid}
      stage={p.stage}
      closed={closed}
      receipts={x.receipts}
      payments={x.payments}
      orders={x.orders.map((o) => ({ id: o.id, name: o.name }))}
      autoDays={x.autoDays}
      managerDays={x.managerDays}
      overridden={x.overridden}
      numbers={{
        supply: x.supply,
        received: x.settle.receivedTotal,
        paid: x.settle.paidTotal,
        managerCost: x.settle.managerCost,
        managerRate: x.managerRate,
        incentive: x.settle.incentiveAmount,
        before: x.settle.profitBeforeIncentive,
        final: x.settle.finalProfit,
        execProfit: x.exec.profit,
      }}
      crew={crewCompare(x.lines, x.crew)}
      candidates={x.variance}
      flags={flags}
      isCeo={s?.estRole === 'ceo'}
      today={kstToday()}
    />
  )
}
