import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProjectForm } from '@/components/est/project-form'
import { StageControl } from '@/components/est/stage-control'
import { Badge, Card, Empty, Money } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { ESTIMATE_STATUS_LABEL, STAGE_LABEL, getProject, listClasses, listClientsForPick, listEstUsers, listEstimates } from '@/lib/est/data'

export const dynamic = 'force-dynamic'

/** S3 개요 탭 */
export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const pid = Number((await params).id)
  const [s, p] = await Promise.all([estPageSession(), getProject(pid)])
  if (!p || !s) notFound()
  const [users, classes, clients, estimates] = await Promise.all([listEstUsers(), listClasses(), listClientsForPick(), listEstimates(pid)])
  const writer = p.members.find((m) => m.role === 'writer')

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <ProjectForm
          mode="edit"
          projectId={pid}
          me={s.userId}
          users={users}
          classes={classes}
          clients={clients}
          initial={{
            title: p.title,
            clientId: p.clientId,
            clientType: p.clientType,
            siteAddress: p.siteAddress,
            inquiryText: p.inquiryText,
            class1Id: p.class1Id,
            class2Id: p.class2Id,
            managerIds: p.members.filter((m) => m.role === 'manager').map((m) => m.userId),
            writerId: writer?.userId ?? s.userId,
            siteSummary: p.siteSummary,
            managerVisitsPlanned: p.managerVisitsPlanned,
          }}
        />
      </div>
      <div className="flex flex-col gap-5">
        <Card title="단계" description={`지금: ${STAGE_LABEL[p.stage]}`}>
          <StageControl projectId={pid} stage={p.stage} />
        </Card>
        <Card title="판" actions={<Link href={`/admin/est/${pid}/v/new`} className="text-sm font-medium text-electric hover:underline">새 판</Link>}>
          {estimates.length ? (
            <ul className="flex flex-col">
              {estimates.map((e) => (
                <li key={e.id} className="border-b border-border last:border-0">
                  <Link href={`/admin/est/${pid}/v/${e.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-electric">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{e.label || `v${e.versionNo}`}</span>
                      <Badge tone={e.status === 'approved' || e.status === 'submitted' ? 'ok' : e.status === 'rejected' ? 'danger' : 'muted'}>{ESTIMATE_STATUS_LABEL[e.status] ?? e.status}</Badge>
                      {p.currentEstimateId === e.id && <Badge tone="accent">대표</Badge>}
                    </span>
                    <Money value={e.supply} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>아직 판이 없음</Empty>
          )}
        </Card>
      </div>
    </div>
  )
}
