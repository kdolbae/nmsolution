'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { addKnowledge, answerKnowledge, deleteKnowledge } from '@/lib/knowledge/table'
import { CATEGORY_OPTIONS, COMMON, KNOWLEDGE_KINDS, TOPICS, type KnowledgeKind, type Topic } from '@/lib/knowledge/shared'

/** 지식 DB (lib/knowledge). 누가 남겼는지는 로그인한 관리자 이름으로 서버에서 적는다 */
async function shown<T>(run: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    return { ok: true, ...(await run()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

const who = (u: { name?: string | null; email?: string | null }) => u.name?.trim() || u.email || ''
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

function refresh() {
  revalidatePath('/admin/knowledge')
  revalidatePath('/admin/clients', 'layout')
}

export async function createKnowledge(input: { kind: KnowledgeKind; category: string; topic: Topic; title: string; body: string; source: string; clientId?: number | null }) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    const title = text(input.title, 500)
    if (!title) throw new Error('제목(질문)을 적어 주세요.')
    const kind = KNOWLEDGE_KINDS.includes(input.kind) ? input.kind : 'rule'
    const body = text(input.body, 20000)
    if (kind === 'deviation' && !body) throw new Error('왜 다르게 했는지 이유를 적어 주세요.')
    const id = await addKnowledge(
      {
        kind,
        category: CATEGORY_OPTIONS.some((c) => c.code === input.category) ? input.category : COMMON,
        topic: TOPICS.includes(input.topic) ? input.topic : '기타',
        title,
        body,
        source: text(input.source, 300),
        clientId: Number.isSafeInteger(input.clientId) && Number(input.clientId) > 0 ? Number(input.clientId) : null,
      },
      who(user),
    )
    return { id }
  })
  refresh()
  return res
}

export async function saveKnowledgeAnswer(id: number, body: string) {
  const user = await requireAdmin()
  const res = await shown(async () => {
    await answerKnowledge(id, text(body, 20000), who(user))
    return {}
  })
  refresh()
  return res
}

export async function removeKnowledge(id: number) {
  await requireAdmin()
  const res = await shown(async () => {
    await deleteKnowledge(id)
    return {}
  })
  refresh()
  return res
}
