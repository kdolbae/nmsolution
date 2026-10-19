import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/admin/form'
import { Badge, Card, Empty, LinkBtn, Money, Tabs, TableWrap, tdCls, thCls } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { ensureEstWithSample } from '@/lib/est/table'
import { ESTIMATE_STATUS_LABEL, STAGE_LABEL, STAGES, listPendingApprovals, listProjects, type ProjectListRow } from '@/lib/est/data'
import { getSettings } from '@/lib/est/settings'
import { profitView } from '@/lib/est/perm'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: '견적 현황 | NM SOLUTION 관리자' }

const BOARD = ['P1', 'P2', 'P3', 'P5', 'P6', 'WON', 'EXEC', 'SETTLE'] as const

/** S1 견적 현황: 단계별 칸반·목록, 내 담당 건, 결재 대기 */
export default async function EstHome({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'board' } = await searchParams
  const s = await estPageSession()
  await ensureEstWithSample()
  const [projects, pending, settings] = await Promise.all([listProjects(), listPendingApprovals(s.estRole, s.userId), getSettings()])
  const view = profitView(s.estRole, settings)
  const mine = projects.filter((p) => p.managers.some((m) => m.id === s.userId))

  const tabs = [
    { key: 'board', label: '단계별', href: '/admin/est' },
    { key: 'list', label: '전체 목록', href: '/admin/est?tab=list' },
    { key: 'mine', label: '내 담당', href: '/admin/est?tab=mine', badge: mine.length || undefined },
    { key: 'approval', label: '결재 대기', href: '/admin/est?tab=approval', badge: pending.length || undefined },
  ]

  return (
    <>
      <PageHeader title="견적 현황" description="접수부터 정산까지 견적 건을 단계별로 봄">
        <LinkBtn href="/admin/est/new" variant="accent">
          <Plus className="size-4" />새 견적 건
        </LinkBtn>
      </PageHeader>
      <Tabs items={tabs} current={tab} />
      <div className="mt-5">
        {!projects.length && tab !== 'approval' ? (
          <Empty>
            아직 견적 건이 없음 — <Link href="/admin/est/new?from=quote" className="text-electric underline">문의에서 만들기</Link> /{' '}
            <Link href="/admin/est/new" className="text-electric underline">직접 만들기</Link>
          </Empty>
        ) : tab === 'approval' ? (
          <Approvals rows={pending} />
        ) : tab === 'list' || tab === 'mine' ? (
          <ProjectTable rows={tab === 'mine' ? projects.filter((p) => mine.includes(p)) : projects} view={view} />
        ) : (
          <Board projects={projects} view={view} />
        )}
      </div>
    </>
  )
}

function ProfitCell({ p, view }: { p: ProjectListRow; view: string }) {
  if (!p.current || view === 'none') return <span className="text-muted-foreground">-</span>
  return (
    <span className={cn('font-mono tabular-nums', p.current.marginPct < 0 && 'text-destructive')}>
      {view === 'amount' ? `${p.current.expectedProfit.toLocaleString('ko-KR')} · ` : ''}
      {p.current.marginPct}%
    </span>
  )
}

function Board({ projects, view }: { projects: ProjectListRow[]; view: string }) {
  const closed = projects.filter((p) => !BOARD.includes(p.stage as (typeof BOARD)[number]))
  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        {BOARD.map((st) => {
          const list = projects.filter((p) => p.stage === st)
          return (
            <div key={st} className="flex w-60 shrink-0 flex-col gap-2">
              <div className="flex items-center justify-between border-b-2 border-navy pb-1.5">
                <span className="text-sm font-bold">{STAGE_LABEL[st]}</span>
                <span className="font-mono text-xs text-muted-foreground">{list.length}</span>
              </div>
              {list.map((p) => (
                <Link key={p.id} href={`/admin/est/${p.id}`} className="flex flex-col gap-1.5 bg-background p-3 ring-1 ring-border transition-colors hover:ring-electric">
                  <span className="font-mono text-[11px] text-muted-foreground">{p.number}</span>
                  <span className="text-sm font-semibold leading-snug">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.clientName ?? '발주처 미정'}</span>
                  {p.current && (
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <Money value={p.current.supply} />
                      <ProfitCell p={p} view={view} />
                    </span>
                  )}
                  <span className="flex flex-wrap gap-1">
                    {p.current && <Badge tone="muted">{p.current.label} · {ESTIMATE_STATUS_LABEL[p.current.status] ?? p.current.status}</Badge>}
                    {p.pendingApprovals > 0 && <Badge tone="accent">결재 대기</Badge>}
                  </span>
                </Link>
              ))}
            </div>
          )
        })}
      </div>
      {closed.length > 0 && (
        <Card title="마감·실패·보류">
          <ProjectTable rows={closed} view={view} />
        </Card>
      )}
    </div>
  )
}

function ProjectTable({ rows, view }: { rows: ProjectListRow[]; view: string }) {
  if (!rows.length) return <Empty>해당 견적 건이 없음</Empty>
  const order = (st: string) => STAGES.indexOf(st as (typeof STAGES)[number])
  return (
    <TableWrap>
      <table className="w-full min-w-[720px] border-collapse bg-background text-sm ring-1 ring-border">
        <thead>
          <tr>
            <th className={thCls}>번호</th>
            <th className={thCls}>제목</th>
            <th className={thCls}>발주처</th>
            <th className={thCls}>단계</th>
            <th className={thCls}>담당</th>
            <th className={thCls + ' text-right'}>공급가</th>
            <th className={thCls + ' text-right'}>예상이익</th>
          </tr>
        </thead>
        <tbody>
          {[...rows]
            .sort((a, b) => order(a.stage) - order(b.stage))
            .map((p) => (
              <tr key={p.id} className="hover:bg-secondary/60">
                <td className={tdCls + ' font-mono text-xs'}>{p.number}</td>
                <td className={tdCls}>
                  <Link href={`/admin/est/${p.id}`} className="font-medium hover:text-electric">
                    {p.title}
                  </Link>
                </td>
                <td className={tdCls}>{p.clientName ?? '-'}</td>
                <td className={tdCls}>
                  <Badge tone={p.stage === 'LOST' ? 'danger' : p.stage === 'CLOSED' ? 'ok' : 'neutral'}>{STAGE_LABEL[p.stage]}</Badge>
                </td>
                <td className={tdCls + ' text-xs'}>{p.managers.map((m) => m.name).join(', ') || '-'}</td>
                <td className={tdCls + ' text-right'}>{p.current ? <Money value={p.current.supply} /> : '-'}</td>
                <td className={tdCls + ' text-right'}>
                  <ProfitCell p={p} view={view} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </TableWrap>
  )
}

function Approvals({ rows }: { rows: Awaited<ReturnType<typeof listPendingApprovals>> }) {
  if (!rows.length) return <Empty>결재할 차례인 판이 없음</Empty>
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <Link key={r.stepId} href={`/admin/est/${r.projectId}/approval`} className="flex flex-wrap items-center justify-between gap-3 bg-background p-4 ring-1 ring-border hover:ring-electric">
          <span className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-muted-foreground">{r.number} · {r.label}</span>
            <span className="font-semibold">{r.title}</span>
          </span>
          <span className="flex items-center gap-3 text-sm">
            <Money value={r.supply} />
            <Badge tone="accent">{r.stepRole === 'ceo' ? '대표 결재' : '검토'}</Badge>
          </span>
        </Link>
      ))}
    </div>
  )
}
