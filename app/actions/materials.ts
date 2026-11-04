'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { getClient } from '@/lib/clients/table'
import { materialsFromQuote, normalizeMaterials } from '@/lib/materials/shared'
import { getMaterials, saveMaterials } from '@/lib/materials/table'

/** 자재 리스트 (lib/materials). 부자재 보강은 /api/admin/clients/[id]/materials (오래 걸려 API 로) */
async function shown<T>(run: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    return { ok: true, ...(await run()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

const who = (u: { name?: string | null; email?: string | null }) => u.name?.trim() || u.email || ''

export async function saveClientMaterials(clientId: number, items: unknown) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    await saveMaterials(clientId, normalizeMaterials(items), who(user))
    return {}
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}

/** 견적서 재료비 줄을 가져와 리스트에 더한다(이미 있는 이름은 건너뜀) */
export async function importMaterialsFromQuote(clientId: number) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    const client = await getClient(clientId)
    if (!client) throw new Error('업체를 찾지 못했습니다.')
    const cur = await getMaterials(clientId)
    const have = new Set(cur.items.map((x) => x.name.replace(/\s+/g, '').toLowerCase()))
    const added = materialsFromQuote(client.quote).filter((x) => !have.has(x.name.replace(/\s+/g, '').toLowerCase()))
    await saveMaterials(clientId, [...cur.items, ...added], who(user))
    return { added: added.length }
  })
  revalidatePath('/admin/clients', 'layout')
  return res
}
