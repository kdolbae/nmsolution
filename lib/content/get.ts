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
 * 관리자에서 사업소개를 저장해 둔 경우, 그 뒤에 기본값에 추가한 사업(대형플랜트 설비)은 저장본에 없어 안 보인다.
 * 저장본에 없으면 기본값 항목을 공장 개보수 바로 뒤에 끼워 넣는다. 관리자에서 저장하면 그대로 저장본에 들어간다.
 */
const ADDED_SERVICE_SLUGS = ['plant', 'rebuild', 'pipework', 'automation']
function withNewServices(c: ContentMap['services']): ContentMap['services'] {
  const items = [...c.items]
  // 공장 개보수 뒤에 적힌 순서대로(대형플랜트 → 공장 개축 → 배관 → 설비 개발)
  let after = 'factory'
  for (const slug of ADDED_SERVICE_SLUGS) {
    if (!items.some((s) => s.slug === slug)) {
      const def = CONTENT_DEFAULTS.services.items.find((s) => s.slug === slug)
      if (!def) continue
      const at = items.findIndex((s) => s.slug === after)
      items.splice(at === -1 ? 0 : at + 1, 0, def)
    }
    after = slug
  }
  return { ...c, items }
}

/**
 * 홈페이지에서 가린 사업. 내용(N-CMS·엔엠 DB·기본값)은 지우지 않고 화면·메뉴·사이트맵에서만 뺀다. 되살리려면 여기서 slug 를 빼면 된다.
 * kevin 2026-11-18 "나노코팅, 코팅제 판매는 가리자" → coating·products,
 * 같은 날 "시공교육도 단열 곰팡이 누수도 빼고" → academy·insulation·recovery.
 */
export const HIDDEN_SERVICE_SLUGS: readonly string[] = ['coating', 'products', 'academy', 'insulation', 'recovery']
export const isHiddenService = (slug: string) => HIDDEN_SERVICE_SLUGS.includes(slug)

/** 가린 사업을 뺀 사업소개. 저장본 소개 글이 가린 사업(누수·단열·코팅·교육)을 말하는 옛 문장이면 새 기본 문장으로 바꾼다. */
export function publicServices(c: ContentMap['services']): ContentMap['services'] {
  const description = /코팅 솔루션과 제품|누수 복구, 단열/.test(c.description) ? CONTENT_DEFAULTS.services.description : c.description
  return { ...c, description, items: c.items.filter((s) => !isHiddenService(s.slug)) }
}

/**
 * 페이지 내용. 순서: N-CMS(플랜트사업부 › 홈페이지, 5분 캐시) → 엔엠 DB site_content(어드민을 지우기 전 마지막 내용) → 코드 기본값.
 * 엔엠 어드민은 지우고 내용은 N-CMS 에서 고친다(kevin 2026-11-10, lib/ncms.ts).
 */
export async function getContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const base = CONTENT_DEFAULTS[key] as ContentMap[K]
  const ncms = await ncmsHomepageOrNull()
  const remote = ncms?.savedKeys?.includes(key) ? ncms.pages?.[key] : null
  const fix = (out: ContentMap[K]) => (key === 'services' ? withNewServices(out as ContentMap['services']) : out) as ContentMap[K]
  if (remote && typeof remote === 'object' && !Array.isArray(remote)) return fix(merge(base as Record<string, unknown>, remote) as ContentMap[K])
  try {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1)
    return fix(merge(base as Record<string, unknown>, row?.data) as ContentMap[K])
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
