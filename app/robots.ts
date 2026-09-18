import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

// 배포 환경(운영/프리뷰)에 따라 응답이 달라지므로 빌드 시점에 굳히지 않는다
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const url = siteUrl()

  // 프리뷰 배포가 색인되면 같은 내용이 두 주소로 잡힌다. 운영에서만 수집을 허용한다.
  const isPreview = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== 'production'
  if (isPreview) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: `${url}/sitemap.xml`,
    host: url,
  }
}
