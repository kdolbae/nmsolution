import { notFound } from 'next/navigation'
import { OrderEditor } from '@/components/admin/order-editor'
import { getOrder, listParties, listPrices } from '@/lib/orders/table'

export const dynamic = 'force-dynamic'

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const row = await getOrder(Number((await params).id))
  if (!row) notFound()
  const [parties, prices] = await Promise.all([listParties(), listPrices()])
  return <OrderEditor id={row.id} initial={row.order} parties={parties} prices={prices} />
}
