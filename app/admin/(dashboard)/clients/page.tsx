import { PageHeader } from '@/components/admin/form'
import { ClientsList } from '@/components/admin/clients-list'
import { listClients, quoteLabelOf } from '@/lib/clients/table'
import { calcQuote } from '@/lib/clients/quote'
import { pendingCounts } from '@/lib/portal/members'

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
  let error = false
  const clients = await listClients().catch((e) => {
    console.error('[admin] 업체 조회 실패', e)
    error = true
    return []
  })
  const waiting = await pendingCounts().catch(() => new Map<number, number>())

  return (
    <>
      <PageHeader title="업체 관리" description="업체를 열면 제안서와 견적서를 함께 고치고 인쇄할 수 있습니다. 추가 공정은 업체 화면의 「견적서 추가」로 견적서를 더 만듭니다." />
      {error ? (
        <p className="border border-dashed border-destructive/40 bg-background px-6 py-10 text-center text-sm text-destructive">
          업체 목록을 불러오지 못했습니다. DB 연결을 확인해 주세요.
        </p>
      ) : (
        <ClientsList
          clients={clients.filter((c) => !c.parentId).map((c) => ({
            id: c.id,
            name: c.name,
            contactPerson: c.contactPerson,
            phone: c.phone,
            supply: calcQuote(c.quote).supply,
            quoteNumber: c.quote.number,
            updatedAt: c.updatedAt.toISOString(),
            finalizedVersion: c.finalized?.version ?? null,
            waiting: waiting.get(c.id) ?? 0,
            // 같은 업체의 추가 견적서 (추가 공정 등)
            extra: clients
              .filter((x) => x.parentId === c.id)
              .sort((a, b) => a.id - b.id)
              .map((x) => ({
                id: x.id,
                label: quoteLabelOf(x),
                quoteNumber: x.quote.number,
                supply: calcQuote(x.quote).supply,
                finalizedVersion: x.finalized?.version ?? null,
              })),
          }))}
        />
      )}
    </>
  )
}
