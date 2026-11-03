'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { deleteWorkOrder, setWorkOrderStatus, updateWorkOrder, type WorkOrderStatus } from '@/lib/work-orders/table'

/** 업무 지시서 (lib/work-orders). 초안 생성은 /api/admin/clients/[id]/work-orders (오래 걸려 API 로) */
async function shown<T>(run: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    return { ok: true, ...(await run()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

export async function saveWorkOrder(clientId: number, no: number, markdown: string) {
  await requireAdmin()
  const res = await shown(async () => {
    await updateWorkOrder(clientId, no, { markdown: String(markdown ?? '').slice(0, 200000) })
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

export async function setWorkOrderState(clientId: number, no: number, status: WorkOrderStatus) {
  await requireAdmin()
  const res = await shown(async () => {
    await setWorkOrderStatus(clientId, no, status === 'issued' ? 'issued' : 'draft')
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

export async function removeWorkOrder(clientId: number, no: number) {
  await requireAdmin()
  const res = await shown(async () => {
    await deleteWorkOrder(clientId, no)
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}
