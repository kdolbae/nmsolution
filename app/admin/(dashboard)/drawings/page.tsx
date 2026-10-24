import { PageHeader } from '@/components/admin/form'
import { DrawingsList } from '@/components/admin/drawings-list'
import { listDrawings } from '@/lib/drawings/table'
import { listClients } from '@/lib/clients/table'

export const dynamic = 'force-dynamic'

export default async function AdminDrawingsPage() {
  let error = false
  const [drawings, clients] = await Promise.all([
    listDrawings().catch((e) => {
      console.error('[admin] 도면 조회 실패', e)
      error = true
      return []
    }),
    listClients().catch(() => []),
  ])
  return (
    <>
      <PageHeader
        title="배관 도면 작성"
        description="3D 화면에서 점·배관·부속·장비를 고치거나 말로 고칩니다. 업체에 붙여 표시를 켜면 그 업체 페이지에 보기 전용으로 나옵니다."
      />
      {error ? (
        <p className="border border-dashed border-destructive/40 bg-background px-6 py-10 text-center text-sm text-destructive">
          도면 목록을 불러오지 못했습니다. DB 연결을 확인해 주세요.
        </p>
      ) : (
        <DrawingsList
          drawings={drawings.map((d) => ({
            id: d.id,
            title: d.title,
            clientName: d.clientName,
            clientSlug: d.clientSlug,
            showOnPortal: d.showOnPortal,
            rev: d.rev,
            summary: d.summary,
            updatedAt: d.updatedAt.toISOString(),
            updatedBy: d.updatedBy,
          }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
    </>
  )
}
