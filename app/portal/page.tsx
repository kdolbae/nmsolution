import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portal/portal-header'
import { PortalDocs } from '@/components/portal/portal-docs'
import { clientFiles } from '@/lib/clients/files'
import { PortalProgress } from '@/components/portal/portal-progress'
import { getPortalUser, portalDocs } from '@/lib/portal/access'
import { listReports, listTasks, todayKst } from '@/lib/portal/progress'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: '내 업체' }

export default async function PortalHomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { session, membership } = await getPortalUser()
  if (!session?.user) redirect('/portal/login')
  if (!membership) redirect('/admin') // 관리자 (협력업체 계정인데 업체가 없는 경우는 아래에서 안내)

  const header = <PortalHeader clientName={membership.clientName} userName={membership.name} />

  if (membership.status !== 'approved') {
    return (
      <>
        {header}
        <main className="mx-auto max-w-2xl px-5 py-16">
          <div className="bg-background p-8 ring-1 ring-border">
            <h1 className="text-xl font-bold">{membership.status === 'pending' ? '승인을 기다리고 있습니다' : '이용이 중지된 계정입니다'}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {membership.status === 'pending'
                ? `${membership.clientName} 관계자로 가입되었습니다. 엔엠솔루션 관리자가 승인하면 이 화면에서 제안서·견적서를 볼 수 있습니다.`
                : '엔엠솔루션(010-2369-3691)에 문의해 주세요.'}
            </p>
          </div>
        </main>
      </>
    )
  }

  const [client, tasks, reports, { tab }] = await Promise.all([
    portalDocs(membership.clientId),
    listTasks(membership.clientId),
    listReports(membership.clientId, { publishedOnly: true }),
    searchParams,
  ])
  if (!client) redirect('/portal/login')
  // 공정표나 보고가 있으면 공정 현황이 첫 화면
  const view = tab === 'docs' || tab === 'progress' ? tab : tasks.length || reports.length ? 'progress' : 'docs'
  const tabs = [
    { key: 'progress', label: '공정 현황', href: '/portal?tab=progress' },
    { key: 'docs', label: '제안서 · 견적서', href: '/portal?tab=docs' },
  ]
  return (
    <>
      {header}
      <nav className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl gap-1 px-5">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={cn(
                '-mb-px border-b-2 px-3 py-3 text-sm font-semibold',
                view === t.key ? 'border-electric text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-5 py-8 lg:py-10">
        {view === 'progress' ? (
          <PortalProgress tasks={tasks} reports={reports} today={todayKst()} />
        ) : (
        <PortalDocs
          clientName={client.name}
          label={client.label}
          updatedAt={(client.finalized?.at ?? client.updatedAt).toISOString().slice(0, 10)}
          proposalHtml={client.proposalHtml}
          quote={client.quote}
          recipient={{ name: client.name, contactPerson: client.contactPerson, phone: client.phone, siteAddress: client.siteAddress }}
          files={(clientFiles(client.name)?.files ?? []).map((f) => ({ file: f.file, label: f.label }))}
        />
        )}
      </main>
    </>
  )
}
