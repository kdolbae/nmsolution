import { db } from '@/lib/db'
import { projects, siteContent, type Project } from '@/lib/db/schema'
import { ncmsHomepageOrNull } from '@/lib/ncms'
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
 * 페이지 내용. 순서: N-CMS(마케팅 › 홈페이지, 5분 캐시) → 엔엠 DB site_content(어드민을 지우기 전 마지막 내용) → 코드 기본값.
 * 엔엠 어드민은 지우고 내용은 N-CMS 에서 고친다(kevin 2026-11-10, lib/ncms.ts).
 */
export async function getContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const base = CONTENT_DEFAULTS[key] as ContentMap[K]
  const ncms = await ncmsHomepageOrNull()
  const remote = ncms?.savedKeys?.includes(key) ? ncms.pages?.[key] : null
  if (remote && typeof remote === 'object' && !Array.isArray(remote)) return merge(base as Record<string, unknown>, remote) as ContentMap[K]
  try {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1)
    return merge(base as Record<string, unknown>, row?.data) as ContentMap[K]
  } catch (e) {
    console.error('[content] failed to load', key, e)
    return base
  }
}

/**
 * 공개 시공사례. N-CMS 에 공개 사례가 있으면 그것, 없으면(못 읽음·아직 안 가져옴) 엔엠 DB.
 * 그래서 N-CMS 에서 사례를 모두 내리면 엔엠 DB 의 옛 사례가 보인다 — 사례 칸을 숨기려면 사이트 설정의 「시공사례 보이기」를 끈다.
 */
export async function getPublishedProjects(): Promise<Project[]> {
  const remote = await ncmsHomepageOrNull()
  if (remote && remote.cases.length) {
    return remote.cases.map((c, i) => ({
      id: i + 1,
      title: c.title,
      category: c.category,
      location: c.location ?? '',
      year: c.year ?? '',
      duration: c.duration ?? '',
      description: c.description ?? '',
      imageUrl: c.imageUrl ?? '',
      published: true,
      sortOrder: c.sortOrder ?? 0,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.createdAt),
    }))
  }
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
