'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { normalizeTemplate, type TakeoffTemplate } from '@/lib/clients/takeoff'
import { getTakeoffTemplates, removeTakeoffTemplate, upsertTakeoffTemplate } from '@/lib/clients/takeoff-templates'

/** 적산 템플릿 저장 (같은 id 면 고침). 바뀐 템플릿 목록을 돌려준다 */
export async function saveTakeoffTemplate(raw: TakeoffTemplate) {
  await requireAdmin()
  const t = normalizeTemplate(raw)
  if (!t) return { ok: false as const, error: '템플릿 이름이 필요합니다.' }
  await upsertTakeoffTemplate(t)
  revalidatePath('/admin/clients', 'layout')
  return { ok: true as const, templates: await getTakeoffTemplates() }
}

export async function deleteTakeoffTemplate(id: string) {
  await requireAdmin()
  await removeTakeoffTemplate(id)
  revalidatePath('/admin/clients', 'layout')
  return { ok: true as const, templates: await getTakeoffTemplates() }
}
