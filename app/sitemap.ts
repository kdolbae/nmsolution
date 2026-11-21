import type { MetadataRoute } from 'next'
import { getContent, publicServices } from '@/lib/content/get'
import { siteUrl } from '@/lib/site'
import { WORK_LANDINGS } from '@/lib/work-landings'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = siteUrl()
  const services = publicServices(await getContent('services'))
  const now = new Date()

  return [
    { url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${url}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // 누수 광고 랜딩(/leak)은 사업소개에서 누수를 뺀 뒤(kevin 2026-11-18) 사이트맵에서도 뺌. 광고 주소로는 그대로 열린다.
    // 작업별 검색광고 랜딩(출장용접 · 배관/펌프 · 철골/캐노피 · 장비 · R&D)
    ...WORK_LANDINGS.map((w) => ({
      url: `${url}/services/${w.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    ...services.items.map((s) => ({
      url: `${url}/services/${s.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      // 공장 개보수(본업)와 대형플랜트를 우선한다
      priority: s.slug === 'factory' || s.slug === 'plant' ? 0.9 : 0.7,
    })),
  ]
}
