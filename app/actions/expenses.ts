'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { normalizeExpense } from '@/lib/expenses/shared'
import { deleteExpense, insertExpense, updateExpense } from '@/lib/expenses/table'

/** 지출(원가) 기록 (lib/expenses). 어드민 전용 */
async function shown<T>(run: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    return { ok: true, ...(await run()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

const who = (u: { name?: string | null; email?: string | null }) => u.name?.trim() || u.email || ''

export async function saveClientExpense(clientId: number, id: number | null, input: unknown) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    const e = normalizeExpense(input)
    if (!e.title && !e.supplier) throw new Error('거래처나 내용을 적어 주세요.')
    const saved = id ? (await updateExpense(clientId, id, e, who(user)), id) : await insertExpense(clientId, e, who(user))
    return { id: saved }
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

export async function removeClientExpense(clientId: number, id: number) {
  await requireAdmin()
  const res = await shown(async () => {
    await deleteExpense(clientId, id)
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}
