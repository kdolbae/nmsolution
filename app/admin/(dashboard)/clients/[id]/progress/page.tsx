import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getClient } from '@/lib/clients/table'
import { KKT_CLIENT } from '@/lib/clients/seed-kkt'
import { getPortalInfo } from '@/lib/portal/members'
import { listReports, listTasks, todayKst } from '@/lib/portal/progress'
import { aiEnabled } from '@/lib/portal/ai'
import { mailEnabled } from '@/lib/mail'
import { ProgressSummary } from '@/components/progress/progress-summary'
import { TasksEditor } from '@/components/admin/progress/tasks-editor'
import { ReportsPanel } from '@/components/admin/progress/reports-panel'

export const dynamic = 'force-dynamic'

/** 업체별 공정 진행: 공정표 + 일일 현장 보고(사진·설명·AI 정리). 공개한 내용은 협력업체 포털 '공정 현황'에 보인다 */
export default async function AdminProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await getClient(Number(id))
  if (!client) notFound()
  const [tasks, reports, portal] = await Promise.all([listTasks(client.id), listReports(client.id), getPortalInfo(client.id)])
  const today = todayKst()

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/admin/clients/${client.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {client.name}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">공정 진행</h1>
        <p className="mt-1 text-sm text-muted-foreground">{client.name} · 공정표와 일일 현장 보고</p>
      </div>
      <ProgressSummary tasks={tasks} today={today} />
      <ReportsPanel
        clientId={client.id}
        tasks={tasks}
        reports={reports}
        today={today}
        ai={aiEnabled()}
        mail={mailEnabled()}
        members={portal?.members.filter((m) => m.status === 'approved').length ?? 0}
      />
      <TasksEditor clientId={client.id} tasks={tasks} today={today} canImportKkt={client.name === KKT_CLIENT.name} />
    </div>
  )
}
