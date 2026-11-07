import type { MetadataRoute } from 'next'
import { getContent } from '@/lib/content/get'
import { siteUrl } from '@/lib/site'
import { WORK_LANDINGS } from '@/lib/work-landings'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = siteUrl()
  const services = await getContent('services')
  const now = new Date()

  return [
    { url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${url}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // 안성 · 평택 누수 사진 견적 광고 랜딩
    { url: `${url}/leak`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    // 작업별 검색광고 랜딩(출장용접 · 배관/펌프 · 철골/캐노피 · 판넬)
    // 큰 공사(장비·탱크, 배관, 철골)를 앞에, 판넬 같은 소규모 공종은 뒤로 둔다
    ...WORK_LANDINGS.map((w) => ({
      url: `${url}/services/${w.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: w.slug === 'panel' ? 0.6 : 0.9,
    })),
    ...services.items.map((s) => ({
      url: `${url}/services/${s.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      // 공장 개보수(본업)와 누수 피해복구(광고 랜딩)를 우선한다
      priority: s.slug === 'factory' || s.slug === 'recovery' ? 0.9 : 0.6,
    })),
  ]
}
