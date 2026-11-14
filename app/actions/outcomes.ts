'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { deleteOutcome, saveOutcome } from '@/lib/outcomes/table'
import { OUTCOME_REASONS, OUTCOME_RESULTS, type OutcomeResult } from '@/lib/outcomes/shared'

/** 수주·실주 기록 (lib/outcomes). 누가 남겼는지는 로그인한 관리자 이름으로 서버에서 적는다 */
async function shown(run: () => Promise<void>): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await run()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

function refresh() {
  revalidatePath('/admin/knowledge')
  revalidatePath('/admin/clients', 'layout')
}

export async function recordOutcome(clientId: number, input: { result: OutcomeResult; reasons: string[]; note: string; rivalPrice: number | null }) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    if (!OUTCOME_RESULTS.includes(input.result)) throw new Error('결과를 골라 주세요.')
    const reasons = (Array.isArray(input.reasons) ? input.reasons : []).filter((r) => OUTCOME_REASONS[input.result].includes(r))
    const note = String(input.note ?? '').trim().slice(0, 5000)
    if (!reasons.length && !note) throw new Error('이유를 하나 이상 고르거나 메모를 적어 주세요.')
    const rival = Number(input.rivalPrice)
    await saveOutcome(
      Number(clientId),
      { result: input.result, reasons, note, rivalPrice: input.rivalPrice !== null && Number.isSafeInteger(rival) && rival > 0 ? rival : null },
      user.name?.trim() || user.email || '',
    )
  })
  refresh()
  return res
}

export async function removeOutcome(clientId: number) {
  await requireAdmin()
  const res = await shown(() => deleteOutcome(Number(clientId)))
  refresh()
  return res
}
