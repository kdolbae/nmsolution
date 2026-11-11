'use client'

import { Analytics } from '@vercel/analytics/next'
import { isPreview } from '@/lib/preview'

/** Vercel Analytics. SBworks 미리보기(?sbpreview) 화면은 보내지 않는다. */
export function SiteAnalytics() {
  return <Analytics beforeSend={(e) => (isPreview() ? null : e)} />
}
