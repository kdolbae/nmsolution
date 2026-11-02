'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { createSend, restoreSend, setPortalHidden, setQuoteCodes, withdrawSend } from '@/lib/clients/sends'
import { setPortalVersion } from '@/lib/clients/exposure'

/** 고객 화면 노출(lib/clients/exposure.ts)·발송 기록(lib/clients/sends.ts). 오류 문구는 화면에 보여 주려고 값으로 돌려준다 */
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

/** 내부 버전(없으면 최신)을 고객에게 보냈다고 기록한다(장부). 고객 화면은 바뀌지 않는다 */
export async function confirmSend(clientId: number, version: number | null, note: string) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    const s = await createSend(clientId, who(user), { version: version ?? undefined, note: String(note ?? '').trim().slice(0, 300) })
    return { number: s.number, no: s.no }
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 발송 기록 취소 표시 */
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

/** 발송 견적번호 재료: 업체 영문 이니셜, 대표 공종 코드 */
export async function saveQuoteCodes(clientId: number, code: string, work: string) {
  await requireAdmin()
  const res = await shown(async () => {
    await setQuoteCodes(clientId, code, work)
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 고객 화면을 버전 하나로 고정하거나(version), 최신 자동으로 돌린다(null) */
export async function savePortalVersion(clientId: number, version: number | null) {
  await requireAdmin()
  const res = await shown(async () => {
    await setPortalVersion(clientId, version)
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 업체 페이지 공개 켜기·끄기. 끄면 업체에는 '준비 중'만 보인다 */
export async function savePortalHidden(clientId: number, hidden: boolean) {
  await requireAdmin()
  await setPortalHidden(clientId, !!hidden)
  revalidatePath('/admin/clients', 'layout')
  return { ok: true as const }
}
