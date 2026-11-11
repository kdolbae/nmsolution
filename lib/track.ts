'use client'

import { track as vercelTrack } from '@vercel/analytics'
import { conversion } from '@/lib/site-events'
import { isPreview } from '@/lib/preview'

/** Vercel Analytics 로 보내던 이벤트를 그대로 보내고, 전화·카톡·견적은 우리 원장(/api/track)에도 남긴다. */
export function track(name: string, props?: Record<string, string | number | boolean | null>) {
  if (isPreview()) return // SBworks 미리보기 화면은 집계하지 않는다
  vercelTrack(name, props)
  conversion(name, props ?? undefined)
}
