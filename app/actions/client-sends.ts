'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { createSend, restoreSend, withdrawSend } from '@/lib/clients/sends'

/** 고객 발송본 (lib/clients/sends.ts). 오류 문구는 화면에 보여 주려고 값으로 돌려준다 */
async function shown<T>(run: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    return { ok: true, ...(await run()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

function who(user: { name?: string | null; email?: string | null }) {
  return user.name?.trim() || user.email || ''
}

/** 내부 버전(없으면 최신)을 고객 발송본으로 확정한다. 이때부터 업체 페이지에 이 견적이 최신으로 보인다 */
export async function confirmSend(clientId: number, version: number | null, note: string) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    const s = await createSend(clientId, who(user), { version: version ?? undefined, note: String(note ?? '').trim().slice(0, 300) })
    return { number: s.number, no: s.no }
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 발송 취소: 고객 화면에서만 내린다 */
export async function cancelSend(clientId: number, no: number) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    await withdrawSend(clientId, no, who(user))
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

export async function undoCancelSend(clientId: number, no: number) {
  await requireAdmin()
  const res = await shown(async () => {
    await restoreSend(clientId, no)
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}
