'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Building2, LayoutDashboard, Shield, X } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

/** 관리자 화면에 들어온 적이 있는 브라우저 표시. 일반 방문자는 세션 확인 요청도 보내지 않는다 */
export const ADMIN_MARK_COOKIE = 'nm_admin'

/**
 * 사이트 화면 왼쪽 아래 관리자 버튼. 로그인한 관리자에게만 보인다.
 * 누르면 업체 관리(제안서·견적서)와 관리자 홈으로 갈 수 있다.
 */
export function AdminFab() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!document.cookie.split('; ').some((c) => c === `${ADMIN_MARK_COOKIE}=1`)) return
    let alive = true
    authClient
      .getSession()
      .then((res) => {
        if (!alive) return
        if (res.data?.user) setIsAdmin(true)
        else document.cookie = `${ADMIN_MARK_COOKIE}=; Path=/; Max-Age=0`
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!isAdmin || pathname.startsWith('/admin')) return null

  return (
    <div className="fixed bottom-24 left-4 z-50 flex flex-col items-start gap-2 md:bottom-6 md:left-5 lg:bottom-8 lg:left-8">
      {open && (
        <nav aria-label="관리자" className="flex min-w-44 flex-col bg-background py-1 text-sm shadow-lg ring-1 ring-border">
          <Link href="/admin/clients" className="flex items-center gap-2.5 px-4 py-2.5 font-medium hover:bg-secondary">
            <Building2 className="size-4" strokeWidth={1.75} /> 업체 관리
          </Link>
          <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 font-medium hover:bg-secondary">
            <LayoutDashboard className="size-4" strokeWidth={1.75} /> 관리자 홈
          </Link>
        </nav>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg ring-1 ring-border hover:bg-secondary"
      >
        {open ? <X className="size-4" /> : <Shield className="size-4" strokeWidth={1.75} />}
        관리자
      </button>
    </div>
  )
}
