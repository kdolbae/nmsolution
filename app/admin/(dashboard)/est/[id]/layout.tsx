import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { ProjectTabs } from '@/components/est/project-tabs'
import { Badge, Money } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { getEstimate, getProject, ESTIMATE_STATUS_LABEL, STAGE_LABEL } from '@/lib/est/data'
import { getSettings } from '@/lib/est/settings'
import { profitView } from '@/lib/est/perm'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** S3 프로젝트 상세: 상단 요약(번호·단계·발주처·담당자·대표 판 금액·이익) + 탭 */
export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const pid = Number(id)
  if (!Number.isInteger(pid) || pid <= 0) notFound()
  const [s, p, settings] = await Promise.all([estPageSession(), getProject(pid), getSettings()])
  if (!p) notFound()
  const current = p.currentEstimateId ? await getEstimate(p.currentEstimateId) : null
  const view = profitView(s?.estRole, settings)
  const [{ rows: pend }, { rows: open }] = await Promise.all([
    pool.query(`SELECT count(*)::int AS c FROM est_approval a JOIN est_estimate e ON e.id = a.estimate_id WHERE e.project_id = $1 AND a.status = 'pending' AND e.status = 'approving'`, [pid]),
    pool.query(`SELECT count(*)::int AS c FROM est_comment c JOIN est_estimate e ON e.id = c.estimate_id WHERE e.project_id = $1 AND c.resolved_at IS NULL`, [pid]),
  ])
  const managers = p.members.filter((m) => m.role === 'manager')

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/est" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-3.5" />
        견적 현황
      </Link>
      <header className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border lg:flex-row lg:items-end lg:justify-between lg:p-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{p.number}</span>
            <Badge tone={p.stage === 'LOST' ? 'danger' : p.stage === 'CLOSED' ? 'ok' : 'navy'}>{STAGE_LABEL[p.stage]}</Badge>
            {p.result && p.resultReason && <span className="text-xs text-muted-foreground">({p.resultReason})</span>}
          </span>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{p.title}</h1>
          <span className="text-sm text-muted-foreground">
            {p.client?.name ?? '발주처 미정'} · 담당 {managers.map((m) => m.name).join(', ') || <span className="text-destructive">없음</span>}
          </span>
        </div>
        {current && (
          <div className="flex flex-wrap gap-5 text-sm">
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                대표 판 {current.label} · {ESTIMATE_STATUS_LABEL[current.status] ?? current.status}
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                <Money value={current.supply} /> 원
              </span>
              <span className="text-xs text-muted-foreground">VAT 포함 {current.total.toLocaleString('ko-KR')}원</span>
            </span>
            {view !== 'none' && (
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">예상이익</span>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {view === 'amount' ? `${current.expectedProfit.toLocaleString('ko-KR')} · ` : ''}
                  {current.marginPct}%
                </span>
              </span>
            )}
          </div>
        )}
      </header>
      <ProjectTabs id={pid} badges={{ approval: pend[0]?.c ?? 0, discuss: open[0]?.c ?? 0 }} />
      <div className="pt-2">{children}</div>
    </div>
  )
}
