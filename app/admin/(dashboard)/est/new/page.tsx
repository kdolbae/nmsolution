import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/admin/form'
import { ProjectForm } from '@/components/est/project-form'
import { estPageSession } from '@/lib/session'
import { listClasses, listClientsForPick, listEstUsers, listQuoteRequestsForPick } from '@/lib/est/data'

export const dynamic = 'force-dynamic'
export const metadata = { title: '새 견적 건 | NM SOLUTION 관리자' }

/** S2 접수(P1) */
export default async function NewProject() {
  const s = await estPageSession()
  if (!s?.estRole) redirect('/admin/est')
  const [users, classes, clients, requests] = await Promise.all([listEstUsers(), listClasses(), listClientsForPick(), listQuoteRequestsForPick('')])
  return (
    <>
      <PageHeader title="새 견적 건" description="저장하면 번호가 붙고 견적 건 화면으로 넘어감" />
      <ProjectForm
        mode="create"
        users={users}
        classes={classes.filter((c) => c.isActive)}
        clients={clients}
        quoteRequests={requests}
        me={s.userId}
      />
    </>
  )
}
