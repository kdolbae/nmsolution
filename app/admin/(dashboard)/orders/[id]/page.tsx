import { notFound } from 'next/navigation'
import { OrderEditor } from '@/components/admin/order-editor'
import { getOrder, listParties } from '@/lib/orders/table'

export const dynamic = 'force-dynamic'

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const row = await getOrder(Number((await params).id))
  if (!row) notFound()
  const parties = await listParties()
  return <OrderEditor id={row.id} initial={row.order} parties={parties} />
}
