'use client'

import { track as vercelTrack } from '@vercel/analytics'
import { conversion } from '@/lib/site-events'

/** Vercel Analytics 로 보내던 이벤트를 그대로 보내고, 전화·카톡·견적은 우리 원장(/api/track)에도 남긴다. */
export function track(name: string, props?: Record<string, string | number | boolean | null>) {
  vercelTrack(name, props)
  conversion(name, props ?? undefined)
}
