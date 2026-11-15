'use server'

import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { deleteTech, saveTech } from '@/lib/tech/table'
import { suggestMethod, type SuggestInput } from '@/lib/tech/suggest'
import { COMPARE_KEYS, TECH_STATUS, type TechInput } from '@/lib/tech/shared'
import { CATEGORY_OPTIONS } from '@/lib/knowledge/shared'

/** 기술 자료 (lib/tech). 누가 고쳤는지는 로그인한 관리자 이름으로 서버에서 적는다 */
type Res<T> = ({ ok: true } & T) | { ok: false; error: string }

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

function refresh() {
  revalidatePath('/admin/knowledge')
  revalidatePath('/admin/clients', 'layout')
}

export async function saveTechCard(id: number | null, input: TechInput): Promise<Res<{ id: number }>> {
  const user = await requireAdmin()
  try {
    const name = text(input.name, 200)
    const set = text(input.set, 100)
    if (!name || !set) throw new Error('비교 세트와 방식 이름을 적어 주세요.')
    if (!CATEGORY_OPTIONS.some((c) => c.code === input.category)) throw new Error('공종을 골라 주세요.')
    const compare: TechInput['compare'] = {}
    for (const k of COMPARE_KEYS) compare[k] = text(input.compare?.[k], 200)
    const saved = await saveTech(
      id && Number.isSafeInteger(id) ? id : null,
      {
        set,
        category: input.category,
        name,
        summary: text(input.summary, 3000),
        pros: text(input.pros, 3000),
        cons: text(input.cons, 3000),
        when: text(input.when, 1000),
        avoid: text(input.avoid, 1000),
        tips: text(input.tips, 5000),
        defects: text(input.defects, 3000),
        figures: text(input.figures, 3000),
        source: text(input.source, 2000),
        status: TECH_STATUS.includes(input.status) ? input.status : '미확인',
        compare,
      },
      user.name?.trim() || user.email || '',
    )
    refresh()
    return { ok: true, id: saved }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

export async function removeTechCard(id: number): Promise<Res<object>> {
  await requireAdmin()
  try {
    await deleteTech(Number(id))
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

export async function askMethodSuggestion(input: SuggestInput): Promise<Res<{ text: string }>> {
  await requireAdmin()
  try {
    return {
      ok: true,
      text: await suggestMethod({
        set: text(input.set, 100),
        category: text(input.category, 20),
        sectionName: text(input.sectionName, 200),
        items: (Array.isArray(input.items) ? input.items : []).slice(0, 200).map((i) => ({
          kind: text(i.kind, 20),
          name: text(i.name, 200),
          spec: text(i.spec, 200),
          qty: Number(i.qty) || 0,
          unit: text(i.unit, 20),
        })),
        checks: Object.fromEntries(Object.entries(input.checks ?? {}).slice(0, 60).map(([k, v]) => [text(k, 300), text(v, 500)])),
      }),
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: 'Claude API 키가 맞지 않음. 사이트 설정의 키를 확인해야 함.' }
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: '요청이 많아 잠시 뒤 다시 시도해야 함.' }
    if (e instanceof Anthropic.APIError) return { ok: false, error: `Claude 요청이 실패함 (${e.status ?? '연결'}). 잠시 뒤 다시 시도해 주기 바람.` }
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}
