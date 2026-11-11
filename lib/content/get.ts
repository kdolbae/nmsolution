import { db } from '@/lib/db'
import { projects, siteContent } from '@/lib/db/schema'
import { and, asc, desc, eq } from 'drizzle-orm'
import { CONTENT_DEFAULTS, type ContentKey, type ContentMap } from './defaults'

/** 얕은 병합: 저장된 값이 없는 필드는 기본값으로 채움 */
function merge<T extends Record<string, unknown>>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object') return base
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k]
    if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = merge(b as Record<string, unknown>, v)
    } else if (v !== undefined) {
      out[k] = v
    }
  }
  return out as T
}

/**
 * 관리자에서 사업소개를 저장해 둔 경우, 그 뒤에 기본값에 추가한 사업(대형플랜트 설비)은 저장본에 없어 안 보인다.
 * 저장본에 없으면 기본값 항목을 공장 개보수 바로 뒤에 끼워 넣는다. 관리자에서 저장하면 그대로 저장본에 들어간다.
 */
const ADDED_SERVICE_SLUGS = ['plant']
function withNewServices(c: ContentMap['services']): ContentMap['services'] {
  const items = [...c.items]
  for (const slug of ADDED_SERVICE_SLUGS) {
    if (items.some((s) => s.slug === slug)) continue
    const def = CONTENT_DEFAULTS.services.items.find((s) => s.slug === slug)
    if (!def) continue
    const at = items.findIndex((s) => s.slug === 'factory')
    items.splice(at === -1 ? 0 : at + 1, 0, def)
  }
  return { ...c, items }
}

export async function getContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const base = CONTENT_DEFAULTS[key] as ContentMap[K]
  try {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1)
    const out = merge(base as Record<string, unknown>, row?.data) as ContentMap[K]
    return (key === 'services' ? withNewServices(out as ContentMap['services']) : out) as ContentMap[K]
  } catch (e) {
    console.error('[content] failed to load', key, e)
    return base
  }
}

export async function getPublishedProjects() {
  try {
    return await db
      .select()
      .from(projects)
      .where(and(eq(projects.published, true)))
      .orderBy(asc(projects.sortOrder), desc(projects.createdAt))
  } catch (e) {
    console.error('[content] failed to load projects', e)
    return []
  }
}

export async function getAllProjects() {
  return db.select().from(projects).orderBy(asc(projects.sortOrder), desc(projects.createdAt))
}
