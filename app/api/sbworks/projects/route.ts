import { getAllProjects } from '@/lib/content/get'
import { siteUrl } from '@/lib/site'
import { checkKey, json, SOURCE_NAME } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

/** 시공사례(홈페이지 "시공사례" 목록). 사진 주소는 절대 주소로 바꿔 준다. SBworks 가 홍보 사진으로 모은다. */
export async function GET(req: Request) {
  const denied = checkKey(req)
  if (denied) return denied
  const base = siteUrl().replace(/\/$/, '')
  const projects = (await getAllProjects()).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    location: p.location,
    year: p.year,
    duration: p.duration,
    description: p.description,
    imageUrl: !p.imageUrl ? '' : /^https?:\/\//.test(p.imageUrl) ? p.imageUrl : `${base}${p.imageUrl.startsWith('/') ? '' : '/'}${p.imageUrl}`,
    published: p.published,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))
  return json({ source: SOURCE_NAME, at: new Date().toISOString(), projects })
}
