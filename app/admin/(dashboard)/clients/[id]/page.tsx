import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarRange, ChevronLeft } from 'lucide-react'
import { ClientWorkspace } from '@/components/admin/client-workspace'
import { ClientPortal } from '@/components/admin/client-portal'
import { formatCode, getPortalInfo } from '@/lib/portal/members'
import { mailEnabled } from '@/lib/mail'
import { clientFiles } from '@/lib/clients/files'
import { getClient, getVersion, listVersions } from '@/lib/clients/table'

export const dynamic = 'force-dynamic'

export default async function AdminClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; v?: string }>
}) {
  const [{ id }, { tab, v }] = await Promise.all([params, searchParams])
  const client = await getClient(Number(id))
  if (!client) notFound()
  const [versions, portal] = await Promise.all([listVersions(client.id), getPortalInfo(client.id)])
  // 최신본이 아닌 버전을 고르면 그 버전을 읽기 전용으로 보여 준다
  const picked = v && Number(v) !== versions[0]?.no ? await getVersion(client.id, Number(v)) : null

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> 업체 목록
        </Link>
        <Link
          href={`/admin/clients/${client.id}/progress`}
          className="inline-flex h-9 items-center gap-1.5 bg-electric px-4 text-sm font-semibold text-white hover:bg-electric/90"
        >
          <CalendarRange className="size-4" /> 공정 진행 · 현장 보고
        </Link>
      </div>
      {portal && (
        <div className="mb-5">
          <ClientPortal
            clientId={client.id}
            code={formatCode(portal.code)}
            open={portal.open}
            mail={mailEnabled()}
            members={portal.members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
          />
        </div>
      )}
      <ClientWorkspace
        initialTab={tab === 'quote' ? 'quote' : 'proposal'}
        client={{
          id: client.id,
          name: client.name,
          contactPerson: client.contactPerson,
          phone: client.phone,
          email: client.email,
          siteAddress: client.siteAddress,
          memo: client.memo,
        }}
        proposalHtml={client.proposalHtml}
        quote={client.quote}
        files={(clientFiles(client.name)?.files ?? []).map((f) => ({ file: f.file, label: f.label }))}
        versions={versions.map((x) => ({ ...x, at: x.at.toISOString() }))}
        finalized={client.finalized && { ...client.finalized, at: client.finalized.at.toISOString() }}
        view={
          picked && {
            no: picked.no,
            at: picked.at.toISOString(),
            summary: picked.summary,
            proposalHtml: picked.proposalHtml,
            quote: picked.quote,
          }
        }
      />
    </>
  )
}
