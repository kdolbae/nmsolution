'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { leave, markInternal, pageview } from '@/lib/site-events'

/** 페이지를 열 때 방문 한 줄, 떠날 때 머문 시간·스크롤 깊이 한 줄. app/layout.tsx 에 한 번만 둔다. */
export function SiteTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      // 관리자 화면을 여는 기기는 사장님·직원 기기다 — 이후 방문은 기록하지 않는다
      markInternal()
      return
    }
    pageview()
    const t0 = Date.now()
    let maxScroll = 0
    let sent = false
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (h > 0) maxScroll = Math.max(maxScroll, Math.min(100, Math.round((window.scrollY / h) * 100)))
    }
    const done = () => {
      if (sent) return
      sent = true
      leave(Math.min(1800, Math.round((Date.now() - t0) / 1000)), maxScroll)
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') done()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', done)
    return () => {
      done()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', done)
    }
  }, [pathname])
  return null
}
