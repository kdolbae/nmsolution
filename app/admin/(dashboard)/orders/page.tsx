import { PageHeader } from '@/components/admin/form'
import { OrdersList } from '@/components/admin/orders-list'
import { calcOrder } from '@/lib/orders/doc'
import { listOrders, listParties } from '@/lib/orders/table'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  let error = false
  const [orders, parties] = await Promise.all([listOrders(), listParties()]).catch((e) => {
    console.error('[admin] 발주서 조회 실패', e)
    error = true
    return [[], []] as [Awaited<ReturnType<typeof listOrders>>, Awaited<ReturnType<typeof listParties>>]
  })
  return (
    <>
      <PageHeader title="발주서" description="자재 공급처에 보내는 발주서를 만들고 A4 장 단위로 인쇄·PDF 저장합니다. 발주 사업자와 발주처는 아래에서 한 번 넣어 두면 새 발주서에 그대로 들어갑니다." />
      {error ? (
        <p className="border border-dashed border-destructive/40 bg-background px-6 py-10 text-center text-sm text-destructive">발주서를 불러오지 못했습니다. DB 연결을 확인해 주세요.</p>
      ) : (
        <OrdersList
          orders={orders.map((r) => ({
            id: r.id,
            no: r.order.no,
            date: r.order.date,
            status: r.order.status,
            issuer: r.order.issuer.name,
            supplier: r.order.supplier.name,
            siteName: r.order.siteName,
            total: calcOrder(r.order).total,
            items: r.order.items.length,
          }))}
          parties={parties}
        />
      )}
    </>
  )
}
