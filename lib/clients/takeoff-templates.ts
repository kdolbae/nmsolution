/**
 * 적산 템플릿 저장소. 기본 템플릿(BUILTIN_TEMPLATES)에 어드민에서 저장한 템플릿(site_content 'takeoff_templates')을 더한다.
 * 저장한 템플릿 id 가 기본 템플릿과 같으면 저장한 쪽이 기본을 덮는다.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { siteContent } from '@/lib/db/schema'
import { BUILTIN_TEMPLATES, normalizeTemplate, type TakeoffTemplate } from '@/lib/clients/takeoff'

const KEY = 'takeoff_templates'

async function savedTemplates(): Promise<TakeoffTemplate[]> {
  try {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, KEY)).limit(1)
    const items = (row?.data as { items?: unknown[] } | undefined)?.items
    return Array.isArray(items) ? items.map(normalizeTemplate).filter((t): t is TakeoffTemplate => !!t) : []
  } catch (e) {
    console.error('[takeoff] failed to load templates', e)
    return []
  }
}

export async function getTakeoffTemplates(): Promise<TakeoffTemplate[]> {
  const saved = await savedTemplates()
  const builtin = BUILTIN_TEMPLATES.map((b) => {
    const over = saved.find((s) => s.id === b.id)
    return over ? { ...over, builtin: true } : b
  })
  return [...builtin, ...saved.filter((s) => !BUILTIN_TEMPLATES.some((b) => b.id === s.id))]
}

async function write(items: TakeoffTemplate[]) {
  const data = { items: items.map(({ builtin: _b, ...t }) => t) }
  await db
    .insert(siteContent)
    .values({ key: KEY, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteContent.key, set: { data, updatedAt: new Date() } })
}

export async function upsertTakeoffTemplate(t: TakeoffTemplate) {
  const saved = await savedTemplates()
  const at = saved.findIndex((s) => s.id === t.id)
  if (at >= 0) saved[at] = t
  else saved.push(t)
  await write(saved)
}

/** 저장한 템플릿을 지운다. 기본 템플릿을 덮어쓴 것이면 기본으로 돌아간다 */
export async function removeTakeoffTemplate(id: string) {
  await write((await savedTemplates()).filter((s) => s.id !== id))
}
