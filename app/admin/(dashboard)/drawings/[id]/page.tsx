import { notFound } from 'next/navigation'
import { DrawingEditor } from '@/components/admin/drawing-editor'
import { getDrawing } from '@/lib/drawings/table'
import { listClients } from '@/lib/clients/table'

export const dynamic = 'force-dynamic'

export default async function AdminDrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const d = await getDrawing(Number((await params).id))
  if (!d) notFound()
  const clients = await listClients().catch(() => [])
  return (
    <DrawingEditor
      drawing={{ id: d.id, title: d.title, clientId: d.clientId, clientSlug: d.clientSlug, showOnPortal: d.showOnPortal }}
      clients={clients.map((c) => ({ id: c.id, name: c.name, slug: c.portalSlug || null }))}
    />
  )
}
