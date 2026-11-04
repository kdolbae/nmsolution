'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { emptyOrder, emptyPoItem, type PoParty, type PurchaseOrder } from '@/lib/orders/doc'
import { deleteParty, getOrder, insertOrder, listParties, removeOrder, saveParty, updateOrder } from '@/lib/orders/table'

/** 서울 상가 처마 판넬 발주처럼 판넬 두 줄을 미리 채운 새 발주서. 길이·수량은 비워 둔다 */
const PANEL_PRESET = [
  { name: '지붕판넬', spec: '100T · 청색 · 난연(성적서 無)' },
  { name: '벽체판넬 (소골)', spec: '100T · 아이보리 · 난연(성적서 無)' },
]

/** 새 발주서: 발주처(supplierId)를 고르면 그 발주처 양식으로 시작한다. 판넬 양식이면 지붕·소골 벽체 두 줄을 미리 채움 */
export async function createOrder(supplierId: number | null, copyFrom?: number | null) {
  await requireAdmin()
  let order: PurchaseOrder
  if (copyFrom) {
    const src = await getOrder(copyFrom)
    if (!src) throw new Error('없는 발주서')
    order = { ...src.order, no: '', status: '작성 중', date: emptyOrder().date }
  } else {
    order = emptyOrder()
    const parties = await listParties()
    const issuer = parties.find((p) => p.kind === 'issuer')
    const supplier = parties.find((p) => p.kind === 'supplier' && p.id === supplierId) ?? parties.find((p) => p.kind === 'supplier')
    if (issuer) order.issuer = strip(issuer)
    if (supplier) order.supplier = strip(supplier)
    order.form = supplier?.form ?? 'panel'
    order.items = order.form === 'panel' ? PANEL_PRESET.map((p) => ({ ...emptyPoItem(), ...p, unit: '장', basis: 'm' as const })) : [emptyPoItem()]
  }
  const id = await insertOrder(order)
  revalidatePath('/admin/orders')
  return id
}

export async function saveOrder(id: number, order: PurchaseOrder) {
  await requireAdmin()
  const saved = await updateOrder(id, order)
  revalidatePath('/admin/orders')
  return saved
}

export async function deleteOrder(id: number) {
  await requireAdmin()
  await removeOrder(id)
  revalidatePath('/admin/orders')
}

export async function saveOrderParty(id: number | null, kind: 'issuer' | 'supplier', party: PoParty) {
  await requireAdmin()
  const newId = await saveParty(id, kind, party)
  revalidatePath('/admin/orders')
  return newId
}

export async function deleteOrderParty(id: number) {
  await requireAdmin()
  await deleteParty(id)
  revalidatePath('/admin/orders')
}

function strip(p: PoParty & { id?: number; kind?: string; sortOrder?: number }): PoParty {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, kind, sortOrder, ...rest } = p
  return rest
}
