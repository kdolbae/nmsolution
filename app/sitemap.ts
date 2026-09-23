import type { MetadataRoute } from 'next'
import { getContent } from '@/lib/content/get'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = siteUrl()
  const services = await getContent('services')
  const now = new Date()

  return [
    { url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${url}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...services.items.map((s) => ({
      url: `${url}/services/${s.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      // 공장 개보수(본업)와 누수 피해복구(광고 랜딩)를 우선한다
      priority: s.slug === 'factory' || s.slug === 'recovery' ? 0.9 : 0.7,
    })),
  ]
}
