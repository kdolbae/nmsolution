import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { ClientWorkspace } from '@/components/admin/client-workspace'
import { ClientPortal } from '@/components/admin/client-portal'
import { formatCode, getPortalInfo } from '@/lib/portal/members'
import { mailEnabled } from '@/lib/mail'
import { clientFiles } from '@/lib/clients/files'
import { clientVideos } from '@/lib/clients/media'
import { getClient, getVersion, listQuoteSet, listVersions, quoteLabelOf } from '@/lib/clients/table'
import { calcQuote } from '@/lib/clients/quote'
import { QuoteSet } from '@/components/admin/quote-set'
import { getTakeoffTemplates } from '@/lib/clients/takeoff-templates'
import { ClientIntel, ClientSchedule } from '@/components/admin/client-intel'
import { listCards } from '@/lib/clients/cards'
import { getProfile } from '@/lib/clients/profile'
import { getSchedule, listScheduleLog, stepsFromQuote } from '@/lib/clients/schedule'

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
  const [versions, portal, takeoffTemplates, cards, profile, schedule, scheduleLog, quoteSet] = await Promise.all([
    listVersions(client.id),
    // 업체용 링크·협력업체 포털은 본 견적(업체)에만 있다
    client.parentId ? null : getPortalInfo(client.id),
    getTakeoffTemplates(),
    // 명함·내부 프로필은 업체(본 견적) 것을 같이 쓴다
    listCards(client.parentId ?? client.id),
    getProfile(client.parentId ?? client.id),
    getSchedule(client.id),
    listScheduleLog(client.id),
    listQuoteSet(client.id),
  ])
  // 최신본이 아닌 버전을 고르면 그 버전을 읽기 전용으로 보여 준다
  const picked = v && Number(v) !== versions[0]?.no ? await getVersion(client.id, Number(v)) : null

  return (
    <>
      <Link href="/admin/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> 업체 목록
      </Link>
      <div className="mb-5">
        <ClientIntel clientId={client.parentId ?? client.id} initial={{ cards, profile }} />
      </div>
      <QuoteSet
        currentId={client.id}
        quotes={quoteSet.map((q) => ({
          id: q.id,
          label: quoteLabelOf(q),
          number: q.quote.number,
          supply: calcQuote(q.quote).supply,
          finalizedVersion: q.finalized?.version ?? null,
          main: !q.parentId,
        }))}
      />
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
          bizNumber: client.bizNumber,
          contactPerson: client.contactPerson,
          phone: client.phone,
          email: client.email,
          siteAddress: client.siteAddress,
          memo: client.memo,
          portalSlug: client.portalSlug,
          portalLogin: client.portalLogin,
          portalPasswordSet: client.portalPasswordSet,
        }}
        proposalHtml={client.proposalHtml}
        quote={client.quote}
        files={(clientFiles(client.name)?.files ?? []).map((f) => ({ file: f.file, label: f.label }))}
        videos={clientVideos(client.name)}
        takeoffTemplates={takeoffTemplates}
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
      <div className="mt-5">
        <ClientSchedule clientId={client.id} initial={schedule} log={scheduleLog} fromQuote={stepsFromQuote(client.quote)} />
      </div>
    </>
  )
}
