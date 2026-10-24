'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createDrawing, deleteDrawing, getDrawing, updateDrawingMeta, type DrawingModel } from '@/lib/drawings/table'

/** 배관 도면 작성: 새 도면. from 이 있으면 그 도면을 복사, json 이 있으면 그 모양으로 시작 */
export async function createDrawingAction(input: { title: string; clientId: number | null; from?: number | null; json?: string }) {
  const user = await requireAdmin()
  const title = input.title.trim() || '새 배관 도면'
  let model: DrawingModel = { nodes: {}, lines: [], valves: [], equipment: [], labels: {}, draw_od: 150 }
  if (input.from) {
    const src = await getDrawing(input.from)
    if (src) model = src.model
  } else if (input.json?.trim()) {
    try {
      const parsed = JSON.parse(input.json)
      model = (parsed && typeof parsed === 'object' && 'model' in parsed ? parsed.model : parsed) as DrawingModel
    } catch {
      return { ok: false as const, error: 'JSON 형식이 맞지 않습니다.' }
    }
    if (!model || typeof model !== 'object' || typeof model.nodes !== 'object') return { ok: false as const, error: 'nodes 가 있는 도면 JSON 이 아닙니다.' }
  }
  const id = await createDrawing(title, input.clientId, model, user.name || user.email)
  revalidatePath('/admin/drawings')
  return { ok: true as const, id }
}

export async function updateDrawingMetaAction(id: number, meta: { title?: string; clientId?: number | null; showOnPortal?: boolean }) {
  await requireAdmin()
  await updateDrawingMeta(id, { ...meta, title: meta.title === undefined ? undefined : meta.title.trim() || '배관 도면' })
  revalidatePath('/admin/drawings')
  revalidatePath(`/admin/drawings/${id}`)
  return { ok: true as const }
}

export async function deleteDrawingAction(id: number) {
  await requireAdmin()
  await deleteDrawing(id)
  revalidatePath('/admin/drawings')
  return { ok: true as const }
}
