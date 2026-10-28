'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { cleanContact, removeCard, updateCardContact, type CardContact } from '@/lib/clients/cards'
import { normalizeSteps, saveSchedule, ScheduleConflict, type ScheduleStep } from '@/lib/clients/schedule'
import { notifySbworks } from '@/lib/sbworks'

function who(user: { name?: string | null; email?: string | null }) {
  return user.name?.trim() || user.email || ''
}

export async function deleteCard(clientId: number, cardId: number) {
  await requireAdmin()
  await removeCard(clientId, cardId)
  after(() => notifySbworks(clientId, 'contacts'))
  return { ok: true as const }
}

export async function saveCardContact(clientId: number, cardId: number, contact: CardContact) {
  await requireAdmin()
  await updateCardContact(clientId, cardId, cleanContact(contact))
  after(() => notifySbworks(clientId, 'contacts'))
  return { ok: true as const }
}

/** 상세 공정 저장. 그 사이 SBworks 에서 고쳤으면 덮어쓰지 않고 알려 준다 */
export async function saveClientSchedule(clientId: number, steps: ScheduleStep[], expectedRevision: number, summary?: string) {
  const user = await requireAdmin()
  try {
    const revision = await saveSchedule(clientId, normalizeSteps(steps), { by: who(user), source: 'admin', summary, expectedRevision })
    after(() => notifySbworks(clientId, 'schedule'))
    revalidatePath(`/admin/clients/${clientId}`)
    return { ok: true as const, revision }
  } catch (e) {
    if (e instanceof ScheduleConflict) return { ok: false as const, error: e.message }
    if (e instanceof Error && !(e as { code?: string }).code) return { ok: false as const, error: e.message }
    throw e
  }
}
